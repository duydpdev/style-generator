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
import { writeFileAtomic } from "../shared/writeFileAtomic";

/**
 * Where an emit failed. `read` → `parse` → `options` → `theme` → `cross`
 * (theme × options) → `write` are the steps of {@link emitThemeCss};
 * `config` (an invalid `style-gen.config.json` on reload) and `watch` (a
 * watcher error) are reported by `watchThemeFile` only.
 */
export type EmitStage =
  | "read"
  | "parse"
  | "options"
  | "theme"
  | "cross"
  | "generate"
  | "write"
  | "config"
  | "watch";

/** What {@link emitThemeCss} needs: the theme, where the CSS goes, the options. */
export interface EmitTarget {
  /** Absolute path of the theme JSON. */
  themeFile: string;
  /** Absolute path of the CSS file to write. */
  outFile: string;
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
      /** `false`: the file already held exactly this CSS and was left alone. */
      changed: boolean;
    }
  | { ok: false; stage: EmitStage; message: string; cause: unknown };

/** The failure branch of {@link EmitResult}. */
type EmitFailure = Extract<EmitResult, { ok: false }>;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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
 * The front half of {@link emitThemeCss}, for callers with another back half
 * (`style-gen tokens`): read the theme file, parse the JSON and run
 * `prepareGenerate` — the same validation `generate()` does, with the
 * stage labels and messages of {@link emitThemeCss}. Writes nothing and
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

/**
 * Read the theme, validate it with the options, generate the CSS and write it
 * to `outFile` — the one pipeline behind the Vite plugin, the Next.js
 * integration and `style-gen generate`. Validation is the same
 * `prepareGenerate` that `generate()` runs, so the verdicts cannot drift.
 *
 * The file is written only when its content changes (and atomically, so
 * Tailwind never reads a half-written file); the output directory is created
 * when missing. Never throws: every failure comes back as
 * `{ ok: false, stage, message, cause }`. Synchronous, so a bundler hook
 * can finish before the CSS is `@import`ed.
 * @param {EmitTarget} target - Theme file, output file and generator options
 * @returns {EmitResult} `{ ok: true, outFile, changed }` or the failing stage
 */
export function emitThemeCss(target: EmitTarget): EmitResult {
  const { themeFile, outFile, options } = target;

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

  try {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    let existing: string | undefined;
    try {
      existing = fs.readFileSync(outFile, "utf8");
    } catch {
      // Missing (or unreadable): treat as changed; a real problem surfaces
      // from the write below.
      existing = undefined;
    }
    if (existing === css) return { ok: true, outFile, changed: false };
    writeFileAtomic(outFile, css);
    return { ok: true, outFile, changed: true };
  } catch (error) {
    return fail(
      "write",
      `Cannot write ${outFile}: ${errorMessage(error)}`,
      error,
    );
  }
}
