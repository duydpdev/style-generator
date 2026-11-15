import path from "node:path";

import type { Logger, Plugin } from "vite";

import { errorMessage } from "../../node/errorMessage";
import {
  parsePluginRootOptions,
  resolvePluginTarget,
  type PluginTarget,
} from "../../node/resolvePluginTarget";
import { emitTheme, type EmitTarget } from "../../node/themeEmitter";

/** Options of the `styleGenVite()` Vite plugin. */
export interface StyleGenViteOptions {
  /**
   * Directory holding `style-gen.config.json`; default: Vite's root. A
   * relative path resolves against Vite's root.
   */
  root?: string;
}

const PLUGIN_NAME = "style-gen-vite";

/**
 * Module-scoped registry: detects configs writing to the same file. `owner` is
 * the config file (else the root) that created the entry, `instance` the
 * plugin that holds it, so a dev-server restart (new instance registered
 * BEFORE the old server closes) and per-environment builder instances of ONE
 * config are not mistaken for duplicates.
 */
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
 * Vite plugin that emits `theme.css` and `theme.tokens.ts` from a theme JSON.
 * The files are written in `buildStart` (before any module is transformed, so
 * `@tailwindcss/vite` finds the CSS when it scans for `@source`), the theme is
 * registered with `addWatchFile`, and the dev server re-emits and sends a
 * full-reload when it changes. A failure in `buildStart` fails the build
 * through `this.error`.
 *
 * Every option lives in `style-gen.config.json` (else
 * `package.json#style-gen`) in the plugin's `root` (default: Vite's root): the
 * `theme`, `output`, `tokensOutput` and every `generate()` option, exactly as
 * `style-gen generate` reads them. The only plugin option is `root`; a
 * relative one resolves against Vite's root (Nuxt sets Vite's root to `app/`,
 * so it passes the project folder).
 *
 * A change to the config file in the dev server reloads it in place: the
 * target is resolved again, the files are re-emitted and the page reloads. An
 * invalid edit is logged and the last valid config stays in force. The server
 * is never restarted, so this works inside hosts that own it (Nuxt, Storybook).
 *
 * Emitting is write-if-changed, so the second `buildStart` of a `vite build`
 * (one per environment) is a no-op.
 *
 * Path rules (`resolveProjectPath`): the theme may live anywhere (absolute, or
 * `..` out of the root); the generated files must stay inside `root`.
 *
 * Monorepo: warns once if a plugin instance from a DIFFERENT Vite config (or
 * root, when there is no config file) targets the same `theme.css`. Two
 * `styleGenVite()` calls inside ONE config file are not warned about: that
 * is indistinguishable from the per-environment instances Vite creates in
 * builder mode and from a dev-server restart.
 *
 * `theme.css` is written atomically (`writeFileAtomic`: sibling temp file +
 * `renameSync`), so `@tailwindcss/vite` never reads a half-written file.
 *
 * **Limitations:**
 * - **Symlinks are not `realpath`'d.** `resolveProjectPath` compares the
 *   logical (non-dereferenced) path against the project root; it never calls
 *   `fs.realpathSync`. An `output` that is itself a symlink living inside the
 *   root is accepted even if its TARGET resolves outside it — the guard only
 *   rejects a literal `..`-escaping input path, not a symlink whose target
 *   escapes after the filesystem resolves it.
 * @param {StyleGenViteOptions} [opts] - `{ root }`; omit it to read the config from Vite's root
 * @returns {Plugin} A Vite plugin instance
 * @throws {Error} At call time for an unknown option key (a removed 7.x option)
 */
export const styleGenVite = (opts?: StyleGenViteOptions): Plugin => {
  const { root: rootOption } = parsePluginRootOptions(opts, PLUGIN_NAME);
  let logger: Pick<Logger, "info" | "error" | "warn"> | undefined;
  let target: EmitTarget | null = null;
  let root = "";
  let configFile = "";
  let owner = "";
  let registeredOutFile: string | null = null;
  const self = {};

  /** Free this instance's slot in `activeOutFiles` (dev-server shutdown). */
  const release = (): void => {
    if (
      registeredOutFile !== null &&
      activeOutFiles.get(registeredOutFile)?.instance === self
    ) {
      activeOutFiles.delete(registeredOutFile);
    }
    registeredOutFile = null;
  };

  /**
   * The resolved target; only valid after `configResolved`.
   * @returns {EmitTarget} The emit target
   */
  const requireTarget = (): EmitTarget => {
    if (!target) throw new Error(`[${PLUGIN_NAME}] used before configResolved`);
    return target;
  };

  /**
   * Claim the current `theme.css` in `activeOutFiles`, warning when a plugin of
   * another config already targets it.
   * @param {Pick<Logger, "warn">} log - Where the duplicate warning goes
   */
  const register = (log: Pick<Logger, "warn">): void => {
    const { outFile } = requireTarget();
    // A plugin instance runs `configResolved` again per environment; it
    // must not collide with itself.
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

  // `perEnvironmentStartEndDuringDev` exists on Vite >= 6 typings only; the
  // widened local type keeps the literal valid against the Vite 5 typings.
  const plugin: Plugin & { perEnvironmentStartEndDuringDev?: boolean } = {
    name: PLUGIN_NAME,
    enforce: "pre",
    // Vite >= 6 starts a non-client environment's plugin container lazily and
    // skips its `buildStart` in dev unless this is set; without it
    // `createServer()` + `ssrLoadModule()` (no `listen()`) never writes
    // `theme.css`. Emitting is write-if-changed, so the repeat is a no-op.
    perEnvironmentStartEndDuringDev: true,

    configResolved(config) {
      logger = config.logger;
      root = path.resolve(config.root, rootOption ?? ".");
      owner = config.configFile ?? config.root;
      // Vite 5/6 call `configResolved` unbound (`this.error` is unavailable),
      // so a bad config or path is a plain throw.
      const resolved = resolvePluginTarget(root, PLUGIN_NAME);
      target = resolved.target;
      configFile = resolved.configFile;
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
      // A theme outside the project root is not watched by Vite otherwise,
      // and the config file may be git-ignored or outside Vite's module graph.
      server.watcher.add(requireTarget().themeFile);
      server.watcher.add(configFile);

      const reemit = debounce(() => {
        const result = emitTheme(requireTarget());
        if (!result.ok) {
          server.config.logger.error(
            `[${PLUGIN_NAME}] Re-emit failed:\n${result.message}`,
          );
        } else if (result.changed) {
          // Kept even though Tailwind's own HMR would pick the CSS up: a
          // gitignored `theme.css` is outside Vite's module graph watch.
          server.ws.send({ type: "full-reload", path: "*" });
        }
      }, 200);

      // Reload the config in place (never `server.restart()`: hosts such as
      // Nuxt and Storybook own the server). An invalid edit keeps the last
      // valid target, like `style-gen generate --watch`.
      const reloadConfig = debounce(() => {
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
        target = resolved.target;
        if (resolved.target.themeFile !== previous.themeFile) {
          server.watcher.add(resolved.target.themeFile);
        }
        if (resolved.configFile !== configFile) {
          configFile = resolved.configFile;
          server.watcher.add(configFile);
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

      server.watcher.on("change", (file) => {
        if (file === requireTarget().themeFile) reemit();
        else if (path.resolve(file) === configFile) reloadConfig();
      });
      // `add`/`unlink` cover editors that save by replacing the file, and a
      // config created or removed while the server runs.
      const onConfigFile = (file: string): void => {
        if (path.resolve(file) === configFile) reloadConfig();
      };
      server.watcher.on("add", onConfigFile);
      server.watcher.on("unlink", onConfigFile);
      // Free this instance's `activeOutFiles` slot when the dev server
      // closes. Vite's `restartServer` resolves the NEW config (new
      // instance) before closing the old server, so `release()` deletes the
      // slot only if this instance still owns it. `closeBundle` / `buildEnd`
      // are no use: they also run after every rebuild of a
      // `vite build --watch`, and the registration must outlive those.
      // `httpServer` is null in middleware mode, so wrap `close()` instead.
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
