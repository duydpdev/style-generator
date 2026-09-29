import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { Plugin, ResolvedConfig } from "vite";
import { z } from "zod";

import { generate } from "../../core/generate";
import type { StyleGeneratorOptions } from "../../core/Options";
import { ThemeSchema, formatZodError } from "../../core/themeSchema";
import { resolveSafePath } from "../../shared/resolveSafePath";
import { writeFileAtomic } from "../../shared/writeFileAtomic";

export interface StyleGenViteOptions {
  /** Path to theme JSON, resolved relative to Vite project root. */
  themePath: string;
  /**
   * Directory to write `theme.css`. Defaults to `dir(themePath)`.
   * MUST match the path that consumer CSS `@import`s from.
   */
  outDir?: string;
  /** Forwarded to `generate()` internals (theme CSS). */
  options?: StyleGeneratorOptions;
}

const PLUGIN_NAME = "style-gen-vite";

/** Module-scoped registry: detects monorepo configs writing to the same outDir. */
const activeOutDirs = new Set<string>();

interface Emitted {
  themeCss: string;
}

const emit = (
  themePathAbs: string,
  outDirAbs: string,
  options: StyleGeneratorOptions,
): Emitted => {
  const raw = readFileSync(themePathAbs, "utf8");
  const theme = ThemeSchema.parse(JSON.parse(raw));

  const themeCss = generate(theme, options).css;

  mkdirSync(outDirAbs, { recursive: true });
  writeFileAtomic(resolve(outDirAbs, "theme.css"), themeCss);

  return { themeCss };
};

const debounce = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): ((...args: Args) => void) => {
  let timer: NodeJS.Timeout | null = null;
  return (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
};

/**
 * Render a caught `emit()` error for display: `ZodError`s get one
 * `path → message` line per issue (unknown keys, injection-unsafe values);
 * anything else (JSON syntax, fs errors) falls back to `.message`. Shared by
 * `configResolved`, `configureServer`'s re-emit, and `closeBundle` so all
 * three surfaces report the same detail for the same failure.
 * @param {unknown} err - The error caught from `emit()`
 * @returns {string} A human-readable detail string
 */
const formatEmitError = (err: unknown): string =>
  err instanceof z.ZodError ? formatZodError(err) : (err as Error).message;

/**
 * Vite plugin that emits `theme.css` from a theme JSON. Replaces the
 * manual `generate-theme.mjs` script step in Tailwind v4 setups. Emit
 * happens in `configResolved` (sync) so the file exists before
 * `@tailwindcss/vite`'s `@source` scanner runs. Re-emits on `theme.json`
 * change.
 *
 * Path traversal guard: `themePath` resolved against project root and rejected
 * if it escapes (`..`).
 *
 * Monorepo: warns once if two plugin instances target the same `outDir`.
 *
 * `theme.css` is written atomically (`writeFileAtomic`: sibling temp file +
 * `renameSync`), so `@tailwindcss/vite` never reads a half-written file.
 *
 * **Limitations:**
 * - **Symlinks are not `realpath`'d.** `resolveSafePath` compares the
 *   logical (non-dereferenced) path against the project root; it never calls
 *   `fs.realpathSync`. A `themePath`/`outDir` that is itself a symlink
 *   living inside the root is accepted even if its TARGET resolves outside
 *   it — the traversal guard only rejects a literal `..`-escaping input
 *   path, not a symlink whose target escapes after the filesystem resolves
 *   it.
 * @param {StyleGenViteOptions} opts - Plugin configuration
 * @returns {Plugin} A Vite plugin instance
 */
export const styleGenVite = (opts: StyleGenViteOptions): Plugin => {
  let resolvedConfig: ResolvedConfig | null = null;
  let themePathAbs = "";
  let outDirAbs = "";
  let hasEmitted = false;

  const generatorOptions: StyleGeneratorOptions = opts.options ?? {};

  return {
    name: PLUGIN_NAME,
    enforce: "pre",

    configResolved(config) {
      resolvedConfig = config;
      const root = config.root;

      themePathAbs = resolveSafePath(
        root,
        opts.themePath,
        `[${PLUGIN_NAME}] themePath`,
      );

      const outDirOption = opts.outDir ?? dirname(opts.themePath);
      outDirAbs = resolveSafePath(
        root,
        outDirOption,
        `[${PLUGIN_NAME}] outDir`,
      );

      // Skip duplicate emit when same plugin instance runs twice (SSR build
      // runs configResolved per environment; module-level guard dedupes).
      if (hasEmitted) return;
      if (activeOutDirs.has(outDirAbs)) {
        config.logger.warn(
          `[${PLUGIN_NAME}] Multiple plugin instances target ${outDirAbs}. Last write wins.`,
        );
      } else {
        activeOutDirs.add(outDirAbs);
      }

      try {
        emit(themePathAbs, outDirAbs, generatorOptions);
      } catch (err) {
        this.error(
          `[${PLUGIN_NAME}] invalid theme in ${themePathAbs}:\n${formatEmitError(err)}`,
        );
      }
      hasEmitted = true;

      config.logger.info(
        `[${PLUGIN_NAME}] Wrote theme.css to ${outDirAbs}\n` +
          `  Tip: add this to .gitignore if theme.json is your source of truth.`,
      );
    },

    configureServer(server) {
      const reemit = debounce(() => {
        try {
          emit(themePathAbs, outDirAbs, generatorOptions);
          server.ws.send({ type: "full-reload", path: "*" });
        } catch (err) {
          server.config.logger.error(
            `[${PLUGIN_NAME}] Re-emit failed for ${themePathAbs}:\n${formatEmitError(err)}`,
          );
        }
      }, 200);

      server.watcher.on("change", (path) => {
        if (path === themePathAbs) reemit();
      });
    },

    closeBundle() {
      // Final write for prod build — captures last-second theme.json edits.
      if (resolvedConfig?.command === "build") {
        try {
          emit(themePathAbs, outDirAbs, generatorOptions);
        } catch (err) {
          this.error(
            `[${PLUGIN_NAME}] invalid theme in ${themePathAbs}:\n${formatEmitError(err)}`,
          );
        }
      }
    },
  };
};

/** Test-only: reset module-level state. Not part of public API. */
export const __resetForTests = (): void => {
  activeOutDirs.clear();
};
