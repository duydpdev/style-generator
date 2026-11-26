import path from "node:path";

import { configCandidates } from "./configSource";
import { toGeneratorOptions, type StyleGenConfig } from "./loadStyleGenConfig";
import { resolveProjectPath } from "./resolveProjectPath";
import { sameFile } from "./sameFile";
import type { EmitTarget } from "./themeEmitter";

/** File the tokens module lands in when `tokensOutput` is not set: beside `output`. */
export const TOKENS_FILE_NAME = "theme.tokens.ts";

/**
 * Throw unless `file` is a `.ts`/`.mts`/`.cts` file that is not a declaration file.
 * @param {string} file - The tokens file path
 * @param {string} label - The option the path came from (`tokensOutput`, `--out`)
 * @param {string} [shown] - What the message prints for the path; defaults to `file`
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
 * Both config candidates, existing or not, as `assertDistinctFiles` entries.
 * @param {string} root - Directory the config is read from
 * @returns {Array<[string, string]>} `[label, absolute file]` pairs
 */
export function configGuardEntries(root: string): [string, string][] {
  return configCandidates(root).map((file): [string, string] => [
    path.basename(file),
    file,
  ]);
}

/**
 * Reject two roles naming the same file (by `sameFile`): one would overwrite the other.
 * @param {ReadonlyArray<readonly [string, string]>} entries - `[label, absolute file]` pairs, in the order they are reported
 * @param {string} [prefix] - Put once before the message (`"[style-gen-vite] "`)
 * @throws {Error} Naming the first two labels whose files are the same
 */
export function assertDistinctFiles(
  entries: readonly (readonly [label: string, file: string])[],
  prefix = "",
): void {
  for (let index = 1; index < entries.length; index += 1) {
    const [label, file] = entries[index] as readonly [string, string];
    for (const [first, other] of entries.slice(0, index)) {
      if (sameFile(file, other)) {
        throw new Error(
          `${prefix}${first} and ${label} must be different files, both resolve to ${file}`,
        );
      }
    }
  }
}

/**
 * The emit target of a resolved config: the one place its paths are derived.
 * @param {string} root - Project root
 * @param {StyleGenConfig} config - Resolved configuration
 * @param {string} [labelPrefix] - Put before `theme`/`output`/`tokensOutput` in error messages (`"[style-gen-vite] "`)
 * @returns {EmitTarget} Absolute theme, CSS and tokens paths plus the generator options
 * @throws {Error} When `output` or `tokensOutput` escapes the project root, `tokensOutput` is not a TypeScript file, or `theme`, `output` and the tokens file are not three different files
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
  assertDistinctFiles(
    [
      ["theme", themeFile],
      ["output", outFile],
      [
        config.tokensOutput === undefined
          ? `tokens file (${TOKENS_FILE_NAME} beside output)`
          : "tokensOutput",
        tokensFile,
      ],
      ...configGuardEntries(root),
    ],
    labelPrefix,
  );
  return {
    themeFile,
    outFile,
    tokensFile,
    options: toGeneratorOptions(config),
  };
}
