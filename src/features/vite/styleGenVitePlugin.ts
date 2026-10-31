import type { Logger, Plugin } from "vite";

import type { StyleGeneratorOptions } from "../../core/Options";
import { resolvePluginTarget } from "../../node/resolvePluginTarget";
import { emitThemeCss, type EmitTarget } from "../../node/themeEmitter";

/** Options of the `styleGenVite()` Vite plugin. */
export interface StyleGenViteOptions {
  /**
   * Path to theme JSON, resolved relative to Vite project root. An absolute
   * path, or one that leaves the root (`../shared/theme.json`), is allowed:
   * a theme shared by a monorepo lives outside any one package.
   */
  themePath: string;
  /**
   * Directory to write `theme.css`, inside the project root. Defaults to
   * `dir(themePath)`. MUST match the path that consumer CSS `@import`s from.
   */
  outDir?: string;
  /** Forwarded to `generate()` internals (theme CSS). */
  options?: StyleGeneratorOptions;
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
 * Vite plugin that emits `theme.css` from a theme JSON. Replaces the
 * manual `generate-theme.mjs` script step in Tailwind v4 setups. The file is
 * written in `buildStart` (before any module is transformed, so
 * `@tailwindcss/vite` finds it when it scans for `@source`), the theme is
 * registered with `addWatchFile`, and the dev server re-emits and sends a
 * full-reload when it changes. A failure in `buildStart` fails the build
 * through `this.error`.
 *
 * Called with no argument it reads `style-gen.config.json` (else
 * `package.json#style-gen`) from the Vite root — the `theme`, `output` and
 * every `generate()` option — exactly as `style-gen generate` does.
 *
 * Emitting is write-if-changed, so the second `buildStart` of a `vite build`
 * (one per environment) is a no-op.
 *
 * Path rules (`resolveProjectPath`): `themePath` may be anywhere (absolute, or
 * `..` out of the root); `outDir` must stay inside the project root.
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
 *   `fs.realpathSync`. An `outDir` that is itself a symlink living inside the
 *   root is accepted even if its TARGET resolves outside it — the guard only
 *   rejects a literal `..`-escaping input path, not a symlink whose target
 *   escapes after the filesystem resolves it.
 * @param {StyleGenViteOptions} [opts] - Plugin configuration; omit it to read `style-gen.config.json`
 * @returns {Plugin} A Vite plugin instance
 */
export const styleGenVite = (opts?: StyleGenViteOptions): Plugin => {
  let logger: Pick<Logger, "info"> | undefined;
  let target: EmitTarget | null = null;
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
      // Vite 5/6 call `configResolved` unbound (`this.error` is unavailable),
      // so a bad config or path is a plain throw.
      target = resolvePluginTarget(config.root, opts, PLUGIN_NAME);

      // A plugin instance runs `configResolved` again per environment; it
      // must not collide with itself.
      if (registeredOutFile === target.outFile) return;
      if (registeredOutFile !== null) release();
      const owner = config.configFile ?? config.root;
      const existing = activeOutFiles.get(target.outFile);
      if (existing && existing.owner !== owner) {
        config.logger.warn(
          `[${PLUGIN_NAME}] Multiple plugin instances target ${target.outFile}. Last write wins.`,
        );
      }
      activeOutFiles.set(target.outFile, { owner, instance: self });
      registeredOutFile = target.outFile;
    },

    buildStart() {
      const emitTarget = requireTarget();
      this.addWatchFile(emitTarget.themeFile);

      const result = emitThemeCss(emitTarget);
      if (!result.ok) this.error(`[${PLUGIN_NAME}] ${result.message}`);
      if (result.changed) {
        logger?.info(
          `[${PLUGIN_NAME}] Wrote ${emitTarget.outFile}\n` +
            `  Tip: add this to .gitignore if theme.json is your source of truth.`,
        );
      }
    },

    configureServer(server) {
      const emitTarget = requireTarget();
      // A theme outside the project root is not watched by Vite otherwise.
      server.watcher.add(emitTarget.themeFile);

      const reemit = debounce(() => {
        const result = emitThemeCss(emitTarget);
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

      server.watcher.on("change", (path) => {
        if (path === emitTarget.themeFile) reemit();
      });
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
