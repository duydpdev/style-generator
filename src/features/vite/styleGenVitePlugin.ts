import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

import type { Plugin, ResolvedConfig } from "vite";

import type { StyleGeneratorOptions } from "../../core/Options";
import type { ThemeConfig } from "../../core/ThemeConfig";
import { generateSafelist } from "../safelist/generateSafelist";
import { generateThemeCss } from "../theme-css/generateThemeCss";

export interface StyleGenViteOptions {
  /** Path to theme JSON, resolved relative to Vite project root. */
  themePath: string;
  /**
   * Directory to write `theme.css` + `safelist.txt`. Defaults to `dir(themePath)`.
   * MUST match the path that consumer CSS `@import`s from.
   */
  outDir?: string;
  /** Forwarded to `createStyleSystem` internals (safelist + themeCss). */
  options?: StyleGeneratorOptions;
}

const PLUGIN_NAME = "style-gen-vite";

/** Module-scoped registry: detects monorepo configs writing to the same outDir. */
const activeOutDirs = new Set<string>();

interface Emitted {
  themeCss: string;
  safelist: string;
}

const emit = (
  themePathAbs: string,
  outDirAbs: string,
  options: StyleGeneratorOptions,
): Emitted => {
  const raw = readFileSync(themePathAbs, "utf8");
  const theme = JSON.parse(raw) as ThemeConfig;

  const themeCss = generateThemeCss(theme);
  const safelist = generateSafelist(theme, options).join("\n");

  mkdirSync(outDirAbs, { recursive: true });
  writeFileSync(resolve(outDirAbs, "theme.css"), themeCss, "utf8");
  writeFileSync(resolve(outDirAbs, "safelist.txt"), safelist, "utf8");

  return { themeCss, safelist };
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
 * Vite plugin that emits `theme.css` + `safelist.txt` from a theme JSON.
 * Replaces the manual `generate-theme.mjs` script step in Tailwind v4 setups.
 * Emit happens in `configResolved` (sync) so files exist before
 * `@tailwindcss/vite`'s `@source` scanner runs. Re-emits on `theme.json` change.
 *
 * Path traversal guard: `themePath` resolved against project root and rejected
 * if it escapes (`..`).
 *
 * Monorepo: warns once if two plugin instances target the same `outDir`.
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

      themePathAbs = isAbsolute(opts.themePath)
        ? opts.themePath
        : resolve(root, opts.themePath);
      const themeRel = relative(root, themePathAbs);
      if (themeRel.startsWith("..") || isAbsolute(themeRel)) {
        throw new Error(
          `[${PLUGIN_NAME}] themePath escapes project root: ${opts.themePath}`,
        );
      }

      const outDirOption = opts.outDir ?? dirname(opts.themePath);
      outDirAbs = isAbsolute(outDirOption)
        ? outDirOption
        : resolve(root, outDirOption);
      const outRel = relative(root, outDirAbs);
      if (outRel.startsWith("..") || isAbsolute(outRel)) {
        throw new Error(
          `[${PLUGIN_NAME}] outDir escapes project root: ${outDirOption}`,
        );
      }

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
        throw new Error(
          `[${PLUGIN_NAME}] failed to read or parse theme.json: ${(err as Error).message}`,
          { cause: err },
        );
      }
      hasEmitted = true;

      config.logger.info(
        `[${PLUGIN_NAME}] Wrote theme.css + safelist.txt to ${outDirAbs}\n` +
          `  Tip: add these to .gitignore if theme.json is your source of truth.`,
      );
    },

    configureServer(server) {
      const reemit = debounce(() => {
        try {
          emit(themePathAbs, outDirAbs, generatorOptions);
          server.ws.send({ type: "full-reload", path: "*" });
        } catch (err) {
          server.config.logger.error(
            `[${PLUGIN_NAME}] Re-emit failed: ${(err as Error).message}`,
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
        emit(themePathAbs, outDirAbs, generatorOptions);
      }
    },
  };
};

/** Test-only: reset module-level state. Not part of public API. */
export const __resetForTests = (): void => {
  activeOutDirs.clear();
};
