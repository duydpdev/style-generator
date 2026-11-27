import path from "node:path";

import { errorMessage } from "../../node/errorMessage";
import {
  noConfigMessage,
  readConfigFile,
  resolveConfig,
} from "../../node/loadStyleGenConfig";
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
  /** Directory holding `style-gen.config.json`, resolved against `process.cwd()` (the default). */
  root?: string;
}

const PLUGIN_NAME = "style-gen-next";

// Next phases that need `theme.css` on disk: dev server and production build.
const EMIT_PHASES = new Set([
  "phase-development-server",
  "phase-production-build",
]);

// Second argument Next passes to a function-form config.
interface NextConfigContext {
  defaultConfig: Record<string, unknown>;
}

// A function-form config's return value, else the object; `never[]` matches any `ctx` annotation.
type ResolvedNextConfig<T> = T extends (...args: never[]) => infer R ? R : T;

// Rationale: documents/architecture.md#stylegennext-why-the-dev-watcher-is-a-non-persistent-singleton
let devWatcher: ThemeWatchHandle | null = null;
let devWatcherKey: string | null = null;

// Roots whose "no config found" line was printed: once per root and process.
const noConfigReported = new Set<string>();

// Nothing can react to a failed close during a swap or teardown.
const closeQuietly = (watcher: ThemeWatchHandle): void => {
  watcher.close().catch(() => undefined);
};

// Starts (or reuses) the dev watcher; a failed re-emit is logged and the next good save recovers.
const startDevWatcher = (
  target: EmitTarget,
  configFiles: readonly string[],
  root: string,
): void => {
  // Options are in the key: other options with the same paths must not keep the old watcher.
  const key = JSON.stringify([
    target.themeFile,
    target.outFile,
    target.tokensFile,
    target.options,
    configFiles,
  ]);
  if (devWatcher && devWatcherKey === key) return;
  if (devWatcher) closeQuietly(devWatcher);

  // Like `generate --watch`: a bad config keeps the last valid target, not the defaults.
  const reloadTarget = (): EmitTarget | ConfigIssues => {
    const reloaded = readConfigFile(root);
    const toIssues = (problem: string): ConfigIssues => ({
      issues: problem,
      ...(reloaded.source !== undefined && { source: reloaded.source }),
    });
    const problem = reloaded.issues ?? reloaded.error;
    if (problem !== undefined) return toIssues(problem);
    // No label prefix: the handler below names the plugin once.
    try {
      return resolveEmitTarget(root, resolveConfig({}, reloaded));
    } catch (error) {
      return toIssues(errorMessage(error));
    }
  };

  devWatcher = watchThemeFile(
    target,
    (result) => {
      if (!result.ok) {
        console.error(
          result.stage === "config"
            ? `[${PLUGIN_NAME}] Cannot reload config, keeping the previous one:\n${result.message}`
            : `[${PLUGIN_NAME}] Re-emit failed:\n${result.message}`,
        );
      }
    },
    { persistent: false, configFiles, reloadTarget },
  );
  devWatcherKey = key;
};

/**
 * Next.js config wrapper that emits `theme.css` and `theme.tokens.ts`, read from `style-gen.config.json` in `root`.
 * Only the dev-server and production-build phases touch the disk; `next dev` also watches and re-emits.
 * @param {StyleGenNextOptions} [opts] - `{ root }`; omit it to read the config from `process.cwd()`
 * @returns {(nextConfig: unknown) => (phase: string, ctx?: object) => unknown} Wraps the Next config into the phase-aware config function
 * @throws {Error} For an unknown option key such as `themePath`: those settings belong in `style-gen.config.json`
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
      const { target, configFiles, configFound } = resolvePluginTarget(
        root,
        PLUGIN_NAME,
      );
      if (!configFound && !noConfigReported.has(root)) {
        noConfigReported.add(root);
        console.info(`[${PLUGIN_NAME}] ${noConfigMessage(root)}`);
      }

      const result = emitTheme(target);
      if (!result.ok) {
        throw new Error(`[${PLUGIN_NAME}] ${result.message}`, {
          cause: result.cause,
        });
      }

      if (phase === "phase-development-server") {
        startDevWatcher(target, configFiles, root);
      }

      return resolvedConfig;
    };
};

/** Test-only: reset module-level state. Not part of public API. */
export const __resetForTests = (): void => {
  if (devWatcher) closeQuietly(devWatcher);
  noConfigReported.clear();
  devWatcher = null;
  devWatcherKey = null;
};
