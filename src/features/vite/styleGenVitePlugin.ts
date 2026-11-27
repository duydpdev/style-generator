import { existsSync } from "node:fs";
import path from "node:path";

import type { Logger, Plugin } from "vite";

import { liveConfigIndex, sameEmitTarget } from "../../node/configSource";
import { errorMessage } from "../../node/errorMessage";
import { noConfigMessage } from "../../node/loadStyleGenConfig";
import {
  parsePluginRootOptions,
  resolvePluginTarget,
  type PluginTarget,
} from "../../node/resolvePluginTarget";
import { emitTheme, type EmitTarget } from "../../node/themeEmitter";

/** Options of the `styleGenVite()` Vite plugin. */
export interface StyleGenViteOptions {
  /** Directory holding `style-gen.config.json`; default and base of a relative path: Vite's root. */
  root?: string;
}

const PLUGIN_NAME = "style-gen-vite";

// Detects configs writing the same file: `owner` is the config file (else root), `instance` the plugin.
// Rationale: documents/architecture.md#stylegenvite-dev-server-lifecycle-and-the-duplicate-output-registry
const activeOutFiles = new Map<string, { owner: string; instance: object }>();

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
 * Vite plugin that emits `theme.css` and `theme.tokens.ts` in `buildStart`, reading `style-gen.config.json` in `root`.
 * The dev server re-emits on a theme or config edit and sends a full reload; a `buildStart` failure fails the build.
 * @param {StyleGenViteOptions} [opts] - `{ root }`; omit it to read the config from Vite's root
 * @returns {Plugin} A Vite plugin instance
 * @throws {Error} For an unknown option key such as `themePath`: those settings belong in `style-gen.config.json`
 */
export const styleGenVite = (opts?: StyleGenViteOptions): Plugin => {
  const { root: rootOption } = parsePluginRootOptions(opts, PLUGIN_NAME);
  let logger: Pick<Logger, "info" | "error" | "warn"> | undefined;
  let target: EmitTarget | null = null;
  let root = "";
  let configFiles: readonly string[] = [];
  // `configResolved` runs once per environment: log the no-config line once.
  let noConfigLogged = false;
  let owner = "";
  let registeredOutFile: string | null = null;
  const self = {};

  // Free this instance's slot in `activeOutFiles` (dev-server shutdown).
  const release = (): void => {
    if (
      registeredOutFile !== null &&
      activeOutFiles.get(registeredOutFile)?.instance === self
    ) {
      activeOutFiles.delete(registeredOutFile);
    }
    registeredOutFile = null;
  };

  // The resolved target; only valid after `configResolved`.
  const requireTarget = (): EmitTarget => {
    if (!target) throw new Error(`[${PLUGIN_NAME}] used before configResolved`);
    return target;
  };

  // Claim `theme.css` in `activeOutFiles`, warning when another config's plugin targets it.
  const register = (log: Pick<Logger, "warn">): void => {
    const { outFile } = requireTarget();
    // `configResolved` runs again per environment; an instance must not collide with itself.
    if (registeredOutFile === outFile) return;
    if (registeredOutFile !== null) release();
    const existing = activeOutFiles.get(outFile);
    if (existing && existing.owner !== owner) {
      log.warn(
        `[${PLUGIN_NAME}] Multiple plugin instances target ${outFile}. Last write wins.`,
      );
    }
    activeOutFiles.set(outFile, { owner, instance: self });
    registeredOutFile = outFile;
  };

  const wrote = (emitTarget: EmitTarget): string =>
    `[${PLUGIN_NAME}] Wrote ${emitTarget.outFile} and ${emitTarget.tokensFile}\n` +
    `  Tip: add theme.css to .gitignore; commit theme.tokens.ts.`;

  // `perEnvironmentStartEndDuringDev` is in Vite >= 6 typings only; widened for Vite 5.
  const plugin: Plugin & { perEnvironmentStartEndDuringDev?: boolean } = {
    name: PLUGIN_NAME,
    enforce: "pre",
    // Without it Vite >= 6 skips `buildStart` for `createServer()` + `ssrLoadModule()` (no `listen()`).
    perEnvironmentStartEndDuringDev: true,

    configResolved(config) {
      logger = config.logger;
      root = path.resolve(config.root, rootOption ?? ".");
      owner = config.configFile ?? config.root;
      // Vite 5/6 call `configResolved` unbound (no `this.error`), so errors are plain throws.
      const resolved = resolvePluginTarget(root, PLUGIN_NAME);
      target = resolved.target;
      configFiles = resolved.configFiles;
      if (!resolved.configFound && !noConfigLogged) {
        noConfigLogged = true;
        config.logger.info(`[${PLUGIN_NAME}] ${noConfigMessage(root)}`);
      }
      register(config.logger);
    },

    buildStart() {
      const emitTarget = requireTarget();
      this.addWatchFile(emitTarget.themeFile);

      const result = emitTheme(emitTarget);
      if (!result.ok) this.error(`[${PLUGIN_NAME}] ${result.message}`);
      if (result.changed) logger?.info(wrote(emitTarget));
    },

    configureServer(server) {
      // Vite may not watch an outside theme or an ignored config; both config candidates are
      // watched, existing or not, since the config can move between them.
      server.watcher.add(requireTarget().themeFile);
      server.watcher.add([...configFiles]);

      const reemit = debounce(() => {
        // A removed theme has nothing to emit; on Linux a re-created one may report only `unlink`.
        if (!existsSync(requireTarget().themeFile)) return;
        const result = emitTheme(requireTarget());
        if (!result.ok) {
          server.config.logger.error(
            `[${PLUGIN_NAME}] Re-emit failed:\n${result.message}`,
          );
        } else if (result.changed) {
          // A gitignored `theme.css` is outside Vite's module graph, so Tailwind's HMR misses it.
          server.ws.send({ type: "full-reload", path: "*" });
        }
      }, 200);

      // Reload the config in place (hosts such as Nuxt own the server); an invalid edit keeps the last target.
      let primaryPending = false;
      const reloadConfig = debounce(() => {
        // A `package.json` event alone that leaves the target unchanged needs no emit.
        const conditionalOnly = !primaryPending;
        primaryPending = false;
        let resolved: PluginTarget;
        try {
          resolved = resolvePluginTarget(root, PLUGIN_NAME);
        } catch (error) {
          server.config.logger.error(
            `[${PLUGIN_NAME}] Cannot reload config, keeping the previous one:\n${errorMessage(error)}`,
          );
          return;
        }
        const previous = requireTarget();
        if (conditionalOnly && sameEmitTarget(resolved.target, previous)) {
          return;
        }
        target = resolved.target;
        if (resolved.target.themeFile !== previous.themeFile) {
          server.watcher.add(resolved.target.themeFile);
        }
        register(server.config.logger);

        const result = emitTheme(resolved.target);
        if (!result.ok) {
          server.config.logger.error(
            `[${PLUGIN_NAME}] Re-emit failed:\n${result.message}`,
          );
        } else if (result.changed) {
          server.config.logger.info(wrote(resolved.target));
          server.ws.send({ type: "full-reload", path: "*" });
        }
      }, 200);

      // An event of a candidate shadowed by an existing earlier one is not the config.
      const onConfigFile = (file: string): void => {
        const index = liveConfigIndex(configFiles, file);
        if (index === undefined) return;
        if (index === 0) primaryPending = true;
        reloadConfig();
      };
      const onWatched = (file: string): void => {
        if (file === requireTarget().themeFile) reemit();
        else onConfigFile(file);
      };
      server.watcher.on("change", onWatched);
      // `add`/`unlink`: editors that save by replacing, and configs created or removed live.
      server.watcher.on("add", onWatched);
      server.watcher.on("unlink", (file) => {
        // Re-arm: chokidar 3 drops a file's watch on `unlink`. Never `add()` a directory (recursive).
        // Rationale: documents/architecture.md#watchthemefile-re-arming-the-watch-after-unlink
        if (file === requireTarget().themeFile || configFiles.includes(file)) {
          server.watcher.unwatch(file);
          server.watcher.add(file);
        }
        onWatched(file);
      });
      // Release the `activeOutFiles` slot when the dev server closes.
      // Rationale: documents/architecture.md#stylegenvite-dev-server-lifecycle-and-the-duplicate-output-registry
      const close = server.close.bind(server);
      server.close = async () => {
        release();
        await close();
      };
    },
  };
  return plugin;
};

/** Test-only: reset module-level state. Not part of public API. */
export const __resetForTests = (): void => {
  activeOutFiles.clear();
};
