import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import { generateFromParsed } from "../core/generateFromParsed";
import type { StyleGeneratorOptions } from "../core/Options";
import { prepareGenerate } from "../core/prepareGenerate";
import type { PrepareStage } from "../core/prepareGenerate";
import type { ResolvedOptions } from "../core/resolveOptions";
import { formatZodError } from "../core/themeSchema";
import type { ThemeConfig } from "../core/themeSchema";
import { buildDesignTokens } from "../features/tokens/createDesignTokens";

import { errorMessage } from "./errorMessage";
import { renderTokensModule } from "./tokensModule";
import { writeFileAtomic } from "./writeFileAtomic";

/** Where an emit failed: {@link emitTheme}'s steps, `stale` (check), `config`/`watch` (watcher). */
export type EmitStage =
  | "read"
  | "parse"
  | "options"
  | "theme"
  | "cross"
  | "generate"
  | "write"
  | "stale"
  | "config"
  | "watch";

/** What {@link emitTheme} needs; every path is absolute. */
export interface EmitTarget {
  themeFile: string;
  outFile: string;
  tokensFile: string;
  /** `generate()` options, validated by the emitter. */
  options?: StyleGeneratorOptions;
}

/** One emit's outcome; on failure `message` is ready to print, `cause` the original error. */
export type EmitResult =
  | {
      ok: true;
      outFile: string;
      tokensFile: string;
      /** `false`: the file(s) already held exactly this content and were left alone. */
      changed: boolean;
      cssChanged: boolean;
      tokensChanged: boolean;
    }
  | { ok: false; stage: EmitStage; message: string; cause: unknown };

type EmitFailure = Extract<EmitResult, { ok: false }>;

const fail = (
  stage: EmitStage,
  message: string,
  cause: unknown,
): EmitFailure => ({ ok: false, stage, message, cause });

const readFailure = (themeFile: string, error: unknown): string => {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  if (code === "ENOENT") return `Theme file not found: ${themeFile}`;
  if (code === "EISDIR") return `Theme path is a directory: ${themeFile}`;
  return `Cannot read ${themeFile}: ${errorMessage(error)}`;
};

const validationHeader = (stage: PrepareStage, themeFile: string): string => {
  switch (stage) {
    case "options":
      return "Invalid options";
    case "theme":
      return `Invalid theme (${themeFile})`;
    case "cross":
      return "Invalid theme/options";
  }
};

/** What {@link readAndPrepareTheme} returns. */
export type PreparedTheme =
  | { ok: true; parsed: ThemeConfig; resolved: ResolvedOptions }
  | { ok: false; stage: EmitStage; message: string; cause: unknown };

/**
 * The read-and-validate half of {@link emitTheme}; writes nothing, never throws.
 * @param {string} themeFile - Absolute path of the theme JSON
 * @param {StyleGeneratorOptions} [options] - `generate()` options
 * @returns {PreparedTheme} The validated theme and resolved options, or the failing stage
 */
export function readAndPrepareTheme(
  themeFile: string,
  options?: StyleGeneratorOptions,
): PreparedTheme {
  let raw: string;
  try {
    raw = fs.readFileSync(themeFile, "utf8");
  } catch (error) {
    return fail("read", readFailure(themeFile, error), error);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    return fail(
      "parse",
      `Invalid JSON in ${themeFile}: ${errorMessage(error)}`,
      error,
    );
  }

  let stage: PrepareStage = "options";
  try {
    // `prepareGenerate` validates the cast value before anything reads it.
    const { parsed, resolved } = prepareGenerate(
      json as ThemeConfig,
      options,
      (next) => {
        stage = next;
      },
    );
    return { ok: true, parsed, resolved };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(
        stage,
        `${validationHeader(stage, themeFile)}:\n${formatZodError(error)}`,
        error,
      );
    }
    return fail(
      stage,
      `Cannot validate ${themeFile}: ${errorMessage(error)}`,
      error,
    );
  }
}

// Ignores CRLF (`core.autocrlf`); shared by emit and check, so a checkout
// that `generate --check` accepts is never rewritten.
const tokensModuleCurrent = (existing: string, expected: string): boolean =>
  existing.replace(/\r\n/g, "\n") === expected;

// A missing or unreadable file counts as changed; a real problem surfaces from the write.
const writeIfChanged = (
  file: string,
  content: string,
  isCurrent: (existing: string, expected: string) => boolean = (a, b) =>
    a === b,
): boolean => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let existing: string | undefined;
  try {
    existing = fs.readFileSync(file, "utf8");
  } catch {
    existing = undefined;
  }
  if (existing !== undefined && isCurrent(existing, content)) return false;
  writeFileAtomic(file, content);
  return true;
};

type ValidTheme = Extract<PreparedTheme, { ok: true }>;

const renderTokens = (prepared: ValidTheme): string =>
  renderTokensModule(
    buildDesignTokens(prepared.parsed, prepared.resolved).DesignTokens.Web,
    prepared.parsed.themeAxes,
  );

/**
 * Write a validated theme's `theme.tokens.ts` when it changes; throws on a write error.
 * @param {ValidTheme} prepared - What {@link readAndPrepareTheme} returned for the theme
 * @param {string} tokensFile - Absolute path of the module to write
 * @returns {{ changed: boolean }} `changed: false` when the file already held this module
 */
export function emitTokensModule(
  prepared: ValidTheme,
  tokensFile: string,
): { changed: boolean } {
  return {
    changed: writeIfChanged(
      tokensFile,
      renderTokens(prepared),
      tokensModuleCurrent,
    ),
  };
}

/**
 * Read and validate the theme, then generate and write the CSS and tokens module. Never throws.
 * @param {EmitTarget} target - Theme file, output files and generator options
 * @returns {EmitResult} `{ ok: true, outFile, tokensFile, changed, cssChanged, tokensChanged }` or the failing stage
 * Rationale: documents/architecture.md#emittheme-one-synchronous-pipeline-that-writes-only-on-change
 */
export function emitTheme(target: EmitTarget): EmitResult {
  const { themeFile, outFile, tokensFile, options } = target;

  const prepared = readAndPrepareTheme(themeFile, options);
  if (!prepared.ok) return prepared;

  let css: string;
  try {
    css = generateFromParsed(prepared.parsed, prepared.resolved);
  } catch (error) {
    return fail(
      "generate",
      `Failed to generate CSS: ${errorMessage(error)}`,
      error,
    );
  }

  let cssChanged: boolean;
  try {
    cssChanged = writeIfChanged(outFile, css);
  } catch (error) {
    return fail(
      "write",
      `Cannot write ${outFile}: ${errorMessage(error)}`,
      error,
    );
  }

  let tokensChanged: boolean;
  try {
    tokensChanged = emitTokensModule(prepared, tokensFile).changed;
  } catch (error) {
    return fail(
      "write",
      `Cannot write ${tokensFile}: ${errorMessage(error)}`,
      error,
    );
  }

  return {
    ok: true,
    outFile,
    tokensFile,
    changed: cssChanged || tokensChanged,
    cssChanged,
    tokensChanged,
  };
}

/**
 * Whether `tokensFile` is current (`generate --check`): missing or different is `stale`. Never throws.
 * @param {Pick<EmitTarget, "themeFile" | "tokensFile" | "options">} target - Theme file, tokens file and generator options
 * @returns {{ ok: true } | { ok: false; stage: EmitStage; message: string; cause: unknown }} `{ ok: true }` when the file is current
 */
export function checkTokensModule(
  target: Pick<EmitTarget, "themeFile" | "tokensFile" | "options">,
): { ok: true } | EmitFailure {
  const { themeFile, tokensFile, options } = target;

  const prepared = readAndPrepareTheme(themeFile, options);
  if (!prepared.ok) return prepared;

  let expected: string;
  try {
    expected = renderTokens(prepared);
  } catch (error) {
    return fail(
      "generate",
      `Failed to generate tokens: ${errorMessage(error)}`,
      error,
    );
  }

  let existing: string;
  try {
    existing = fs.readFileSync(tokensFile, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    return code === "ENOENT"
      ? fail("stale", `${tokensFile} does not exist.`, error)
      : fail(
          "read",
          `Cannot read ${tokensFile}: ${errorMessage(error)}`,
          error,
        );
  }

  if (!tokensModuleCurrent(existing, expected)) {
    return fail("stale", `${tokensFile} is out of date.`, undefined);
  }
  return { ok: true };
}
