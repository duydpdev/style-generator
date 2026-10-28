import type { StyleGeneratorOptions } from "../../core/Options";
import { resolvePluginTarget } from "../../node/resolvePluginTarget";
import { emitThemeCss, type EmitTarget } from "../../node/themeEmitter";
import {
  watchThemeFile,
  type ThemeWatchHandle,
} from "../../node/watchThemeFile";

export interface StyleGenNextOptions {
  /**
   * Path to theme JSON, resolved relative to `process.cwd()`. An absolute
   * path, or one that leaves the project (`../shared/theme.json`), is allowed.
   */
  themePath: string;
  /**
   * Directory to write `theme.css`, inside the project. Defaults to
   * `dirname(themePath)`. MUST match the path that consumer CSS `@import`s from.
   */
  outDir?: string;
  /** Forwarded to `generate()` internals (theme CSS). */
  options?: StyleGeneratorOptions;
}

const PLUGIN_NAME = "style-gen-next";

/** Next phases that need `theme.css` on disk: dev server and production build. */
const EMIT_PHASES = new Set([
  "phase-development-server",
  "phase-production-build",
]);

/** Second argument Next passes to a function-form config. */
interface NextConfigContext {
  defaultConfig: Record<string, unknown>;
}

/**
 * The config Next ends up with: a function-form config's return value, else
 * the object itself. `never[]` parameters match a function whatever it
 * annotates `ctx` as.
 */
type ResolvedNextConfig<T> = T extends (...args: never[]) => infer R ? R : T;

/**
 * Module-scoped dev watcher. `next.config.*` can be evaluated more than
 * once per process (Next re-reads it for phase detection, then again for
 * the actual dev server, and again per worker in some setups) — a second
 * `styleGenNext(...)(...)(...)` call in the same process must reuse the
 * existing watcher instead of spawning another one on the same file. A call
 * for another theme or output file replaces it.
 */
let devWatcher: ThemeWatchHandle | null = null;
let devWatcherKey: string | null = null;

/**
 * Close a watcher without letting its rejection escape: nothing can react to
 * a failed close during a swap or teardown.
 * @param {ThemeWatchHandle} watcher - The watcher to close
 */
const closeQuietly = (watcher: ThemeWatchHandle): void => {
  watcher.close().catch(() => undefined);
};

/**
 * Start (or reuse) the singleton dev watcher for `target`. `next dev`
 * re-emits `theme.css` on save, debounced by `watchThemeFile` (200ms, like
 * the Vite plugin). A failed re-emit or a watcher error is logged and the
 * watcher keeps running, so the next good save recovers.
 *
 * `persistent: false`: this watcher must never be what keeps a Node
 * process alive. The real long-running process during `next dev` is
 * Next's own HTTP dev server — that's what keeps the event loop open.
 * If `next.config.*` is ever evaluated in a short-lived process (e.g. a
 * config-validation pass before the dev server actually starts), a
 * `persistent: true` watcher would hang that process forever since
 * nothing else keeps its event loop busy. `persistent: false` lets Node
 * exit on its own schedule regardless of who's holding this reference.
 * @param {EmitTarget} target - Theme file, output file and options to re-emit with
 */
const startDevWatcher = (target: EmitTarget): void => {
  // Options take part in the key: a re-evaluated config with the same paths
  // but other generator options must not keep the watcher (and its options)
  // of the earlier evaluation.
  const key = JSON.stringify([
    target.themeFile,
    target.outFile,
    target.options,
  ]);
  if (devWatcher && devWatcherKey === key) return;
  if (devWatcher) closeQuietly(devWatcher);

  devWatcher = watchThemeFile(
    target,
    (result) => {
      if (!result.ok) {
        console.error(`[${PLUGIN_NAME}] Re-emit failed:\n${result.message}`);
      }
    },
    { persistent: false },
  );
  devWatcherKey = key;
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
 * Called with no argument it reads `style-gen.config.json` (else
 * `package.json#style-gen`) from `process.cwd()` — the `theme`, `output` and
 * every `generate()` option — exactly as `style-gen generate` does:
 * `styleGenNext()(nextConfig)`.
 *
 * Path rules (`resolveProjectPath`, against `process.cwd()`): the theme may
 * live anywhere (absolute, or `..` out of the project: a monorepo shares one);
 * `outDir` must stay inside the project.
 *
 * Only `phase-development-server` and `phase-production-build` read the
 * theme and write `theme.css`; every other phase (`phase-production-server`,
 * `phase-export`, `phase-info`, `phase-test`) returns the config without
 * touching the disk, so a production container need not ship the theme JSON.
 * A function-form Next config is called with `(phase, ctx)` and its result
 * is returned.
 *
 * **Limitation:**
 * - **Symlinks are not `realpath`'d.** `resolveProjectPath` compares the
 *   logical (non-dereferenced) path against `process.cwd()`; it never calls
 *   `fs.realpathSync`. An `outDir` that is itself a symlink living inside
 *   the project is accepted even if its TARGET resolves outside it — the
 *   guard only rejects a literal `..`-escaping input path, not a symlink
 *   whose target escapes after the filesystem resolves it.
 * @param {StyleGenNextOptions} [opts] - Plugin configuration; omit it to read `style-gen.config.json`
 * @returns {(nextConfig: unknown) => (phase: string, ctx?: object) => unknown}
 *   A function that takes the consumer's Next config and returns the
 *   phase-aware config function Next.js expects from `next.config.*`.
 */
export const styleGenNext =
  (opts?: StyleGenNextOptions) =>
  <TConfig>(
    nextConfig: TConfig,
  ): ((
    phase: string,
    ctx?: NextConfigContext,
  ) => ResolvedNextConfig<TConfig>) =>
  (
    phase: string,
    ctx: NextConfigContext = { defaultConfig: {} },
  ): ResolvedNextConfig<TConfig> => {
    const resolvedConfig = (
      typeof nextConfig === "function"
        ? (
            nextConfig as (
              phase: string,
              ctx: NextConfigContext,
            ) => ResolvedNextConfig<TConfig>
          )(phase, ctx)
        : nextConfig
    ) as ResolvedNextConfig<TConfig>;
    if (!EMIT_PHASES.has(phase)) return resolvedConfig;

    const target = resolvePluginTarget(process.cwd(), opts, PLUGIN_NAME);

    const result = emitThemeCss(target);
    if (!result.ok) {
      throw new Error(`[${PLUGIN_NAME}] ${result.message}`, {
        cause: result.cause,
      });
    }

    if (phase === "phase-development-server") startDevWatcher(target);

    return resolvedConfig;
  };

/** Test-only: reset module-level state. Not part of public API. */
export const __resetForTests = (): void => {
  if (devWatcher) closeQuietly(devWatcher);
  devWatcher = null;
  devWatcherKey = null;
};
