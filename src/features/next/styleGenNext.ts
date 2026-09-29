import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { watch, type FSWatcher } from "chokidar";
import { z } from "zod";

import { generate } from "../../core/generate";
import type { StyleGeneratorOptions } from "../../core/Options";
import { ThemeSchema, formatZodError } from "../../core/themeSchema";
import { resolveSafePath } from "../../shared/resolveSafePath";

export interface StyleGenNextOptions {
  /** Path to theme JSON, resolved relative to `process.cwd()`. */
  themePath: string;
  /**
   * Directory to write `theme.css`. Defaults to `dirname(themePath)`.
   * MUST match the path that consumer CSS `@import`s from.
   */
  outDir?: string;
  /** Forwarded to `generate()` internals (theme CSS). */
  options?: StyleGeneratorOptions;
}

const PLUGIN_NAME = "style-gen-next";

/**
 * Module-scoped dev watcher. `next.config.*` can be evaluated more than
 * once per process (Next re-reads it for phase detection, then again for
 * the actual dev server, and again per worker in some setups) — a second
 * `styleGenNext(...)(...)(...)` call in the same process must reuse the
 * existing watcher instead of spawning another one on the same file.
 */
let devWatcher: FSWatcher | null = null;
let devWatcherThemePath: string | null = null;

const debounce = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): ((...args: Args) => void) => {
  let timer: NodeJS.Timeout | undefined;
  return (...args: Args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, ms);
  };
};

/**
 * Parse+generate `theme.css` and write it atomically: render to a sibling
 * temp file, then `renameSync` over the real target. `rename(2)` is atomic
 * on POSIX/NTFS as long as source and destination share a filesystem (the
 * temp file lives in `outDirAbs`, same as the target) — readers (webpack's
 * `@tailwindcss/postcss`, Turbopack's CSS loader) never observe a
 * partially-written file.
 * @param {string} themePathAbs - Absolute path to the theme JSON.
 * @param {string} outDirAbs - Absolute directory to write `theme.css` into.
 * @param {StyleGeneratorOptions} options - Forwarded to `generate()`.
 */
const emit = (
  themePathAbs: string,
  outDirAbs: string,
  options: StyleGeneratorOptions,
): void => {
  const raw = readFileSync(themePathAbs, "utf8");
  const theme = ThemeSchema.parse(JSON.parse(raw));

  const themeCss = generate(theme, options).css;

  mkdirSync(outDirAbs, { recursive: true });
  const outFile = resolve(outDirAbs, "theme.css");
  const tmpFile = resolve(
    outDirAbs,
    `.theme.css.${String(process.pid)}.${randomUUID()}.tmp`,
  );
  writeFileSync(tmpFile, themeCss, "utf8");
  renameSync(tmpFile, outFile);
};

/**
 * Start (or reuse) the singleton dev watcher for `themePathAbs`. `next dev`
 * re-emits `theme.css` on save, debounced the same 200ms as the Vite plugin.
 *
 * `persistent: false`: this watcher must never be what keeps a Node
 * process alive. The real long-running process during `next dev` is
 * Next's own HTTP dev server — that's what keeps the event loop open.
 * If `next.config.*` is ever evaluated in a short-lived process (e.g. a
 * config-validation pass before the dev server actually starts), a
 * `persistent: true` watcher would hang that process forever since
 * nothing else keeps its event loop busy. `persistent: false` lets Node
 * exit on its own schedule regardless of who's holding this reference.
 * @param {string} themePathAbs - Absolute path to the theme JSON to watch.
 * @param {string} outDirAbs - Absolute directory to re-emit `theme.css` into.
 * @param {StyleGeneratorOptions} options - Forwarded to `generate()`.
 */
const startDevWatcher = (
  themePathAbs: string,
  outDirAbs: string,
  options: StyleGeneratorOptions,
): void => {
  if (devWatcher && devWatcherThemePath === themePathAbs) return;

  const reemit = debounce(() => {
    try {
      emit(themePathAbs, outDirAbs, options);
    } catch (err) {
      console.error(
        `[${PLUGIN_NAME}] Re-emit failed for ${themePathAbs}:\n${err instanceof z.ZodError ? formatZodError(err) : (err as Error).message}`,
      );
    }
  }, 200);

  devWatcher = watch(themePathAbs, {
    persistent: false,
    ignoreInitial: true,
  });
  devWatcher.on("change", reemit);
  devWatcherThemePath = themePathAbs;
};

/**
 * Next.js config wrapper that emits `theme.css` from a theme JSON —
 * equivalent to `styleGenVite` for consumers who don't use Vite. Deliberately
 * does not import `next`: it stays a plain function of the config object and
 * phase string, so it works under both webpack and Turbopack without adding
 * a peer dependency.
 *
 * Usage in `next.config.mjs`:
 * ```js
 * import { styleGenNext } from "@duydpdev/style-generator/next";
 * export default styleGenNext({ themePath: "./theme.json" })(nextConfig);
 * ```
 *
 * Path traversal guard: `themePath`/`outDir` resolved against
 * `process.cwd()` and rejected if either escapes it (`..`, or an absolute
 * path outside the project).
 *
 * **Limitations:**
 * - **Function-form Next config is unsupported.** `nextConfig` MUST be a
 *   plain config object, not Next's alternate `(phase, { defaultConfig })
 *   => config` function form. The wrapper returned by `styleGenNext(opts)`
 *   already IS that phase function — it just `return`s `nextConfig`
 *   verbatim as the final config once emission is done, so if `nextConfig`
 *   is itself a function, Next receives that function as the resolved
 *   config object instead of calling it a second time with
 *   `(phase, { defaultConfig })`. Pass a plain object (call your own
 *   function-form config yourself first, if you have one) instead.
 * - **Symlinks are not `realpath`'d.** `resolveSafePath` compares the
 *   logical (non-dereferenced) path against `root`; it never calls
 *   `fs.realpathSync`. A `themePath`/`outDir` that is itself a symlink
 *   living inside `root` is accepted even if its TARGET resolves outside
 *   `root` — the traversal guard only rejects a literal `..`-escaping
 *   input path, not a symlink whose target escapes after the filesystem
 *   resolves it.
 * @param {StyleGenNextOptions} opts - Plugin configuration
 * @returns {(nextConfig: unknown) => (phase: string) => unknown} A function
 *   that takes the consumer's Next config and returns the phase-aware
 *   config function Next.js expects from `next.config.*`.
 */
export const styleGenNext =
  (opts: StyleGenNextOptions) =>
  <TConfig>(nextConfig: TConfig): ((phase: string) => TConfig) =>
  (phase: string): TConfig => {
    const root = process.cwd();
    const generatorOptions: StyleGeneratorOptions = opts.options ?? {};

    const themePathAbs = resolveSafePath(
      root,
      opts.themePath,
      `[${PLUGIN_NAME}] themePath`,
    );
    const outDirOption = opts.outDir ?? dirname(opts.themePath);
    const outDirAbs = resolveSafePath(
      root,
      outDirOption,
      `[${PLUGIN_NAME}] outDir`,
    );

    try {
      emit(themePathAbs, outDirAbs, generatorOptions);
    } catch (err) {
      throw new Error(
        `[${PLUGIN_NAME}] invalid theme in ${themePathAbs}:\n${err instanceof z.ZodError ? formatZodError(err) : (err as Error).message}`,
        { cause: err },
      );
    }

    if (phase === "phase-development-server") {
      startDevWatcher(themePathAbs, outDirAbs, generatorOptions);
    }

    return nextConfig;
  };

/** Test-only: reset module-level state. Not part of public API. */
export const __resetForTests = (): void => {
  devWatcher?.close().catch(() => {
    // Best-effort close during test teardown — nothing to react to.
  });
  devWatcher = null;
  devWatcherThemePath = null;
};
