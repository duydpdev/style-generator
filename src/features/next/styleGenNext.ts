import path from "node:path";

import { readConfigFile, resolveConfig } from "../../node/loadStyleGenConfig";
import {
  parsePluginRootOptions,
  resolvePluginTarget,
} from "../../node/resolvePluginTarget";
import { resolveEmitTarget } from "../../node/resolveEmitTarget";
import { emitTheme, type EmitTarget } from "../../node/themeEmitter";
import {
  watchThemeFile,
  type ConfigIssues,
  type ThemeWatchHandle,
} from "../../node/watchThemeFile";

/** Options of `styleGenNext()`, which wraps a Next.js config and emits `theme.css` and `theme.tokens.ts` for `next dev` and `next build`. */
export interface StyleGenNextOptions {
  /**
   * Directory holding `style-gen.config.json`, resolved against
   * `process.cwd()` (which is the default).
   */
  root?: string;
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
 * @param {string} configFile - Config file to watch; an edit reloads the target in place
 * @param {string} root - Directory the config is read from
 */
const startDevWatcher = (
  target: EmitTarget,
  configFile: string,
  root: string,
): void => {
  // Options take part in the key: a re-evaluated config with the same paths
  // but other generator options must not keep the watcher (and its options)
  // of the earlier evaluation.
  const key = JSON.stringify([
    target.themeFile,
    target.outFile,
    target.tokensFile,
    target.options,
    configFile,
  ]);
  if (devWatcher && devWatcherKey === key) return;
  if (devWatcher) closeQuietly(devWatcher);

  // Same reload `generate --watch` does: a bad config keeps the last valid
  // target instead of falling back to the defaults halfway through an edit.
  const reloadTarget = (): EmitTarget | ConfigIssues => {
    const reloaded = readConfigFile(root);
    const problem = reloaded.issues ?? reloaded.error;
    if (problem !== undefined) {
      return {
        issues: problem,
        ...(reloaded.source !== undefined && { source: reloaded.source }),
      };
    }
    return resolveEmitTarget(
      root,
      resolveConfig({}, reloaded),
      `[${PLUGIN_NAME}] `,
    );
  };

  devWatcher = watchThemeFile(
    target,
    (result) => {
      if (!result.ok) {
        console.error(`[${PLUGIN_NAME}] Re-emit failed:\n${result.message}`);
      }
    },
    { persistent: false, configFile, reloadTarget },
  );
  devWatcherKey = key;
};

/**
 * Next.js config wrapper that emits `theme.css` and `theme.tokens.ts` from a
 * theme JSON — equivalent to `styleGenVite` for consumers who don't use Vite.
 * Deliberately does not import `next`: it stays a plain function of the config
 * object and phase string, so it works under both webpack and Turbopack
 * without adding a peer dependency.
 *
 * Usage in `next.config.mjs`:
 * ```js
 * import { styleGenNext } from "@duydpdev/style-generator/next";
 * export default styleGenNext()(nextConfig);
 * ```
 *
 * Every option lives in `style-gen.config.json` (else
 * `package.json#style-gen`) in `process.cwd()` — the `theme`, `output`,
 * `tokensOutput` and every `generate()` option — exactly as
 * `style-gen generate` reads them. The only plugin option is `root`, the
 * directory holding that file (a relative one resolves against
 * `process.cwd()`): `styleGenNext({ root })(nextConfig)`.
 *
 * Path rules (`resolveProjectPath`, against the root): the theme may live
 * anywhere (absolute, or `..` out of the project: a monorepo shares one); the
 * generated files must stay inside it.
 *
 * Only `phase-development-server` and `phase-production-build` read the
 * theme and write the files; every other phase (`phase-production-server`,
 * `phase-export`, `phase-info`, `phase-test`) returns the config without
 * touching the disk, so a production container need not ship the theme JSON.
 * A function-form Next config is called with `(phase, ctx)` and its result
 * is returned.
 *
 * In `next dev` a change to the config file reloads it in place and
 * re-emits; an invalid edit is logged and the last valid config stays in
 * force.
 *
 * **Limitation:**
 * - **Symlinks are not `realpath`'d.** `resolveProjectPath` compares the
 *   logical (non-dereferenced) path against the root; it never calls
 *   `fs.realpathSync`. An `output` that is itself a symlink living inside
 *   the project is accepted even if its TARGET resolves outside it — the
 *   guard only rejects a literal `..`-escaping input path, not a symlink
 *   whose target escapes after the filesystem resolves it.
 * @param {StyleGenNextOptions} [opts] - `{ root }`; omit it to read the config from `process.cwd()`
 * @returns {(nextConfig: unknown) => (phase: string, ctx?: object) => unknown}
 *   A function that takes the consumer's Next config and returns the
 *   phase-aware config function Next.js expects from `next.config.*`.
 * @throws {Error} At call time for an unknown option key (a removed 7.x option)
 */
export const styleGenNext = (opts?: StyleGenNextOptions) => {
  const { root: rootOption } = parsePluginRootOptions(opts, PLUGIN_NAME);
  return <TConfig>(
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

      const root = path.resolve(process.cwd(), rootOption ?? ".");
      const { target, configFile } = resolvePluginTarget(root, PLUGIN_NAME);

      const result = emitTheme(target);
      if (!result.ok) {
        throw new Error(`[${PLUGIN_NAME}] ${result.message}`, {
          cause: result.cause,
        });
      }

      if (phase === "phase-development-server") {
        startDevWatcher(target, configFile, root);
      }

      return resolvedConfig;
    };
};

/** Test-only: reset module-level state. Not part of public API. */
export const __resetForTests = (): void => {
  if (devWatcher) closeQuietly(devWatcher);
  devWatcher = null;
  devWatcherKey = null;
};
