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

/**
 * Where an emit failed. `read` → `parse` → `options` → `theme` → `cross`
 * (theme × options) → `write` are the steps of {@link emitTheme};
 * `stale` is reported by {@link checkTokensModule} only (the tokens file is
 * missing or differs); `config` (an invalid `style-gen.config.json` on reload)
 * and `watch` (a watcher error) are reported by `watchThemeFile` only.
 */
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

/**
 * What {@link emitTheme} needs: the theme, where the CSS and the tokens module
 * go, the options.
 */
export interface EmitTarget {
  /** Absolute path of the theme JSON. */
  themeFile: string;
  /** Absolute path of the CSS file to write. */
  outFile: string;
  /** Absolute path of the generated `theme.tokens.ts` to write. */
  tokensFile: string;
  /** `generate()` options, validated by the emitter. */
  options?: StyleGeneratorOptions;
}

/**
 * The outcome of one emit. A failure never throws: `message` is ready to
 * print (the same wording the CLI uses) and `cause` is the original error.
 */
export type EmitResult =
  | {
      ok: true;
      outFile: string;
      tokensFile: string;
      /** `false`: both files already held exactly this content and were left alone. */
      changed: boolean;
      /** `false`: the CSS file already held exactly this CSS. */
      cssChanged: boolean;
      /** `false`: the tokens file already held exactly this module. */
      tokensChanged: boolean;
    }
  | { ok: false; stage: EmitStage; message: string; cause: unknown };

/** The failure branch of {@link EmitResult}. */
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

// The header line of a validation failure at `stage` (`themeFile` names the
// theme in the `theme` header).
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
 * The front half of {@link emitTheme}, for callers with another back half
 * (`style-gen tokens`): read the theme file, parse the JSON and run
 * `prepareGenerate` — the same validation `generate()` does, with the
 * stage labels and messages of {@link emitTheme}. Writes nothing and
 * never throws.
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
    // `JSON.parse` output is unknown: `prepareGenerate` validates it before
    // anything reads it as a theme.
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

// `content` was written (atomically, creating the directory) unless the file
// already held exactly it. A missing or unreadable file counts as changed; a
// real problem surfaces from the write.
const writeIfChanged = (file: string, content: string): boolean => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let existing: string | undefined;
  try {
    existing = fs.readFileSync(file, "utf8");
  } catch {
    existing = undefined;
  }
  if (existing === content) return false;
  writeFileAtomic(file, content);
  return true;
};

/** A theme that passed {@link readAndPrepareTheme}. */
type ValidTheme = Extract<PreparedTheme, { ok: true }>;

const renderTokens = (prepared: ValidTheme): string =>
  renderTokensModule(
    buildDesignTokens(prepared.parsed, prepared.resolved).DesignTokens.Web,
    prepared.parsed.themeAxes,
  );

/**
 * Write the generated `theme.tokens.ts` of a validated theme to `tokensFile`
 * (see {@link renderTokensModule}), only when its content changes. Throws on a
 * write error: callers wrap it into their own failure.
 * @param {ValidTheme} prepared - What {@link readAndPrepareTheme} returned for the theme
 * @param {string} tokensFile - Absolute path of the module to write
 * @returns {{ changed: boolean }} `changed: false` when the file already held this module
 */
export function emitTokensModule(
  prepared: ValidTheme,
  tokensFile: string,
): { changed: boolean } {
  return { changed: writeIfChanged(tokensFile, renderTokens(prepared)) };
}

/**
 * Read the theme, validate it with the options, generate the CSS and the
 * tokens module and write both — the one pipeline behind the Vite plugin, the
 * Next.js integration, `style-gen generate` and `style-gen tokens`. Validation
 * is the same `prepareGenerate` that `generate()` runs, so the verdicts cannot
 * drift.
 *
 * A file is written only when its content changes (and atomically, so
 * Tailwind never reads a half-written file); the output directories are
 * created when missing. Never throws: every failure comes back as
 * `{ ok: false, stage, message, cause }`. Synchronous, so a bundler hook
 * can finish before the CSS is `@import`ed.
 * @param {EmitTarget} target - Theme file, output files and generator options
 * @returns {EmitResult} `{ ok: true, outFile, tokensFile, changed, cssChanged, tokensChanged }` or the failing stage
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
 * Report whether `tokensFile` is the module the theme and options generate,
 * without writing anything (`style-gen generate --check`). A missing file and
 * a different one are both `stage: "stale"`; line endings are ignored on the
 * disk side, so a checkout with `core.autocrlf` is not stale. Validation
 * failures carry the stage and message {@link emitTheme} would report. Never
 * throws.
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
    return fail(
      "stale",
      code === "ENOENT"
        ? `${tokensFile} does not exist. Run: style-gen generate`
        : `Cannot read ${tokensFile}: ${errorMessage(error)}`,
      error,
    );
  }

  if (existing.replace(/\r\n/g, "\n") !== expected) {
    return fail(
      "stale",
      `${tokensFile} is out of date. Run: style-gen generate`,
      undefined,
    );
  }
  return { ok: true };
}
