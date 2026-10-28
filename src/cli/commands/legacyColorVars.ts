import fs from "node:fs";
import path from "node:path";

import type { ThemeConfig } from "../../core/themeSchema";
import { cssVarCategories } from "../../features/registry/builtInCategories";
import { toKebabCase } from "../../shared/helpers";

const SCANNED_EXTENSIONS: ReadonlySet<string> = new Set([
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".vue",
  ".svelte",
  ".astro",
  ".html",
]);

/** Directories never descended into: dependencies, VCS data and build output. */
const PRUNED_DIRECTORIES: ReadonlySet<string> = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  ".output",
  ".svelte-kit",
  ".turbo",
  ".vercel",
  "storybook-static",
]);

/** Files above this size are skipped: bundles/minified assets, not hand-written CSS. */
const MAX_FILE_BYTES = 1024 * 1024;

/**
 * Variable names (without `--sg-`) that 5.0 emits for `theme`, mapped to the
 * `<category>.<key>` that owns each. A legacy `--sg-<colorKey>` that is also
 * one of these now points at a different token instead of at nothing.
 * @param {ThemeConfig} theme - Validated theme
 * @returns {Map<string, string>} Emitted name → owning `<category>.<key>`
 */
const emittedVariables = (theme: ThemeConfig): Map<string, string> => {
  const emitted = new Map<string, string>();
  for (const category of cssVarCategories) {
    for (const key of Object.keys(theme[category.key] ?? {})) {
      emitted.set(
        `${category.cssVarPrefix.replace(/^sg-/, "")}-${toKebabCase(key)}`,
        `${category.key}.${key}`,
      );
    }
  }
  return emitted;
};

/** Matches both `var(--sg-<k>)` references and bare `--sg-<k>:` declarations. */
const SG_VAR_RE = /(?<![\w-])--sg-([a-z0-9-]+)/g;

export interface LegacyColorVarOptions {
  /** Generated CSS file (`options.output`), excluded from the scan. */
  output: string;
}

/**
 * Source files under `cwd`, depth-first, never entering pruned directories.
 * A manual walk instead of `readdirSync({ recursive: true })` so that
 * `node_modules` is skipped without being enumerated first. Appends to one
 * shared array: spreading each level's result into `push` would overflow
 * the call stack on very large trees.
 * @param {string} dir - Absolute directory to walk
 * @param {string[]} files - Collects the absolute paths of the files to scan
 */
const collectSourceFiles = (dir: string, files: string[]): void => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!PRUNED_DIRECTORIES.has(entry.name)) collectSourceFiles(abs, files);
    } else if (
      entry.isFile() &&
      SCANNED_EXTENSIONS.has(path.extname(entry.name))
    ) {
      files.push(abs);
    }
  }
};

/**
 * Text of a scannable file, or `undefined` when it is oversized/unreadable.
 * @param {string} file - Absolute file path
 * @returns {string | undefined} UTF-8 content
 */
const readSource = (file: string): string | undefined => {
  try {
    if (fs.statSync(file).size > MAX_FILE_BYTES) return undefined;
    return fs.readFileSync(file, "utf-8");
  } catch {
    return undefined;
  }
};

/**
 * Legacy color variable names on one line, de-duplicated.
 * @param {string} line - One source line
 * @param {ReadonlySet<string>} colorKeys - Kebab-cased `theme.colors` keys
 * @returns {Set<string>} Names (without the `--sg-` prefix) that are legacy
 */
const legacyNamesInLine = (
  line: string,
  colorKeys: ReadonlySet<string>,
): Set<string> => {
  const names = new Set<string>();
  for (const match of line.matchAll(SG_VAR_RE)) {
    const name = match[1];
    if (name !== undefined && colorKeys.has(name)) names.add(name);
  }
  return names;
};

/**
 * Find leftover pre-5.0 color variables. Before 5.0 a color key `primary`
 * produced `--sg-primary`; it is now `--sg-color-primary`, so a hand-written
 * `var(--sg-primary)` or `--sg-primary: ...` override (e.g. a `data-theme`
 * palette block) silently stops applying. Every variable whose name is a
 * kebab-cased key of `theme.colors` is reported, including names that start
 * with another category's prefix (`shadowPrimary` was `--sg-shadow-primary`
 * in 4.x): those are ambiguous with that category's 5.0 variable, so the
 * message says when the name now belongs to another token.
 * @param {string} cwd - Project root to scan
 * @param {ThemeConfig} theme - Validated theme; `theme.colors` defines the legacy names
 * @param {LegacyColorVarOptions} options - `output` is the generated file to skip
 * @returns {string[]} `file:line: message` warnings, `file` relative to `cwd`
 */
export const findLegacyColorVarRefs = (
  cwd: string,
  theme: ThemeConfig,
  options: LegacyColorVarOptions,
): string[] => {
  const colorKeys = new Set(Object.keys(theme.colors).map(toKebabCase));
  const emitted = emittedVariables(theme);
  const outputPath = path.resolve(cwd, options.output);
  const warnings: string[] = [];
  const files: string[] = [];
  collectSourceFiles(cwd, files);

  for (const file of files) {
    if (path.resolve(file) === outputPath) continue;
    const content = readSource(file);
    if (content === undefined) continue;

    const rel = path.relative(cwd, file).split(path.sep).join("/");
    for (const [index, line] of content.split(/\r?\n/).entries()) {
      for (const name of legacyNamesInLine(line, colorKeys)) {
        const owner = emitted.get(name);
        const note =
          owner === undefined
            ? ""
            : `; in 5.0 --sg-${name} is ${owner}, a different token`;
        warnings.push(
          `${rel}:${String(index + 1)}: --sg-${name} was renamed to --sg-color-${name} in 5.0${note}`,
        );
      }
    }
  }
  return warnings;
};
