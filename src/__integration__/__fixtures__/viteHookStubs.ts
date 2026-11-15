import { join } from "node:path";

import { vi } from "vitest";
import type { Plugin } from "vite";

import { writeTmpFile } from "./tmpProject";

export interface StubLogger {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
}

export interface StubConfig {
  root: string;
  command: "serve" | "build";
  logger: StubLogger;
  configFile?: string;
}

export interface StubServer {
  watcher: {
    on: (event: string, cb: (path: string) => void) => void;
    add: ReturnType<typeof vi.fn>;
    handlers: Map<string, (path: string) => void>;
  };
  ws: { send: ReturnType<typeof vi.fn> };
  close: () => Promise<void>;
  config: { logger: StubLogger };
}

// Hooks on Vite Plugin are typed as `T | ObjectHook<T>`. The plugin we build
// uses function form for every hook — extract them as callables here.
type HookFn<P, K extends keyof P> = P[K] extends
  | ((...args: never[]) => unknown)
  | undefined
  ? Extract<P[K], (...args: never[]) => unknown>
  : never;

export interface StubPluginContext {
  error: (msg: string) => never;
  addWatchFile: ReturnType<typeof vi.fn>;
}

/**
 * Rollup binds `this` inside `buildStart` to a `PluginContext` whose
 * `.error()` always throws. Mirror that here so the plugin's `this.error(...)`
 * call behaves the same way under test.
 * @returns {StubPluginContext} A minimal plugin context stub
 */
export const makePluginContext = (): StubPluginContext => ({
  error: (msg: string): never => {
    throw new Error(msg);
  },
  addWatchFile: vi.fn(),
});

/**
 * Vite 5/6 call `configResolved` unbound (`this` is `undefined`); call it the
 * same way so a `this.error(...)` in that hook fails under test.
 * @param {Plugin} plugin - Plugin under test
 * @param {StubConfig} cfg - Resolved config stub
 */
export const callConfigResolved = (plugin: Plugin, cfg: StubConfig): void => {
  const fn = plugin.configResolved as HookFn<Plugin, "configResolved">;
  // Cast cfg through unknown — stub omits fields styleGenVite does not touch.
  (fn as (cfg: unknown) => void).call(undefined, cfg);
};

export const callBuildStart = (
  plugin: Plugin,
  ctx: StubPluginContext = makePluginContext(),
): StubPluginContext => {
  const fn = plugin.buildStart as HookFn<Plugin, "buildStart">;
  (fn as () => void).call(ctx);
  return ctx;
};

export const callConfigureServer = (
  plugin: Plugin,
  server: StubServer,
): void => {
  const fn = plugin.configureServer as HookFn<Plugin, "configureServer">;
  (fn as (s: unknown) => void).call(plugin, server);
};

export const makeLogger = (): StubLogger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

export const makeServer = (logger: StubLogger): StubServer => {
  const handlers = new Map<string, (path: string) => void>();
  return {
    watcher: {
      handlers,
      add: vi.fn(),
      on: (event, cb) => {
        handlers.set(event, cb);
      },
    },
    ws: { send: vi.fn() },
    close: () => Promise.resolve(),
    config: { logger },
  };
};

export const minimalTheme = {
  colors: { primary: "#3B82F6", background: "#FFFFFF", foreground: "#111827" },
  typography: {
    body: {
      fontSize: "16px",
      lineHeight: "1.5",
      fontWeight: 400,
      letterSpacing: "0px",
    },
  },
};

/**
 * The closures every `styleGenVite` suite shares, bound to the suite's
 * temp folder.
 * @param {() => string} tmp - Reads the suite's current temp folder (set in `beforeEach`)
 * @returns {object} `writeTheme` (a theme file below the folder), `writeConfig` (the folder's `style-gen.config.json`), `serveConfig` (a `serve` config stub) and `start` (`configResolved` then `buildStart`)
 */
export const viteHarness = (tmp: () => string) => {
  const writeTheme = (
    relPath = "src/theme/theme.json",
    theme: object = minimalTheme,
  ): string => writeTmpFile(tmp(), relPath, theme);

  const serveConfig = (
    logger = makeLogger(),
    configFile: string | null = join(tmp(), "vite.config.ts"),
  ): StubConfig => ({
    root: tmp(),
    command: "serve",
    ...(configFile !== null && { configFile }),
    logger,
  });

  /**
   * Run the hooks Vite runs before the first transform.
   * @param {Plugin} plugin - Plugin under test
   * @param {StubConfig} cfg - Resolved config stub
   * @returns {StubPluginContext} The `buildStart` context
   */
  const start = (plugin: Plugin, cfg: StubConfig): StubPluginContext => {
    callConfigResolved(plugin, cfg);
    return callBuildStart(plugin);
  };

  /**
   * Write the folder's `style-gen.config.json`: the `writeTheme()` default
   * theme and its `theme.css` next to it, plus `extra`.
   * @param {object} extra - Config keys that override or add to that default
   * @returns {string} Absolute path of the config file
   */
  const writeConfig = (extra: object = {}): string =>
    writeTmpFile(tmp(), "style-gen.config.json", {
      theme: "src/theme/theme.json",
      output: "src/theme/theme.css",
      ...extra,
    });

  return { writeTheme, writeConfig, serveConfig, start };
};
