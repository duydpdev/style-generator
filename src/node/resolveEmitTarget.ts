import path from "node:path";

import { toGeneratorOptions, type StyleGenConfig } from "./loadStyleGenConfig";
import { resolveProjectPath } from "./resolveProjectPath";
import type { EmitTarget } from "./themeEmitter";

/** File the tokens module lands in when `tokensOutput` is not set: beside `output`. */
export const TOKENS_FILE_NAME = "theme.tokens.ts";

/**
 * The tokens module is TypeScript (`as const`, `export type`), so only a TS
 * file name fits; a declaration file cannot hold a runtime `export const`.
 * @param {string} file - The tokens file path
 * @param {string} label - The option the path came from (`tokensOutput`, `--out`)
 * @param {string} [shown] - What the message prints for the path; defaults to `file`
 * @throws {Error} When `file` is not a `.ts`, `.mts` or `.cts` file or is a declaration file
 */
export function assertTokensFile(
  file: string,
  label: string,
  shown: string = file,
): void {
  if (!/\.[mc]?ts$/.test(file) || /\.d\.[mc]?ts$/.test(file)) {
    throw new Error(
      `${label} must be a .ts, .mts or .cts file (not a .d.ts declaration): the output is TypeScript, got ${shown}`,
    );
  }
}

/**
 * The emit target a resolved configuration points at: the one place the
 * theme, CSS and tokens paths are derived, for the CLI and the bundler
 * integrations alike. The theme may live outside the project root (a theme
 * shared by a monorepo); the CSS and the tokens module may not. The tokens
 * module defaults to `theme.tokens.ts` beside the CSS.
 * @param {string} root - Project root
 * @param {StyleGenConfig} config - Resolved configuration
 * @param {string} [labelPrefix] - Put before `theme`/`output`/`tokensOutput` in error messages (`"[style-gen-vite] "`)
 * @returns {EmitTarget} Absolute theme, CSS and tokens paths plus the generator options
 * @throws {Error} When `output` or `tokensOutput` escapes the project root or `tokensOutput` is not a TypeScript file
 */
export function resolveEmitTarget(
  root: string,
  config: StyleGenConfig,
  labelPrefix = "",
): EmitTarget {
  const themeFile = resolveProjectPath(
    root,
    config.theme,
    `${labelPrefix}theme`,
    { allowOutsideRoot: true },
  );
  const outFile = resolveProjectPath(
    root,
    config.output,
    `${labelPrefix}output`,
  );
  const tokensFile =
    config.tokensOutput === undefined
      ? path.join(path.dirname(outFile), TOKENS_FILE_NAME)
      : resolveProjectPath(
          root,
          config.tokensOutput,
          `${labelPrefix}tokensOutput`,
        );
  assertTokensFile(tokensFile, `${labelPrefix}tokensOutput`);
  return {
    themeFile,
    outFile,
    tokensFile,
    options: toGeneratorOptions(config),
  };
}
