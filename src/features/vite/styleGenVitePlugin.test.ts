import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Plugin } from "vite";

import {
  styleGenVite,
  __resetForTests,
  type StyleGenViteOptions,
} from "./styleGenVitePlugin";

interface StubLogger {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
}

interface StubConfig {
  root: string;
  command: "serve" | "build";
  logger: StubLogger;
}

interface StubServer {
  watcher: {
    on: (event: string, cb: (path: string) => void) => void;
    handlers: Map<string, (path: string) => void>;
  };
  ws: { send: ReturnType<typeof vi.fn> };
  config: { logger: StubLogger };
}

// Hooks on Vite Plugin are typed as `T | ObjectHook<T>`. The plugin we build
// uses function form for every hook — extract them as callables here.
type HookFn<P, K extends keyof P> = P[K] extends
  | ((...args: never[]) => unknown)
  | undefined
  ? Extract<P[K], (...args: never[]) => unknown>
  : never;

interface StubPluginContext {
  error: (msg: string) => never;
}

/**
 * Rollup binds `this` inside `closeBundle` to a `PluginContext` whose
 * `.error()` always throws. Mirror that here so the plugin's `this.error(...)`
 * call behaves the same way under test.
 * @returns {StubPluginContext} A minimal plugin context stub
 */
const makePluginContext = (): StubPluginContext => ({
  error: (msg: string): never => {
    throw new Error(msg);
  },
});

/**
 * Vite 5/6 call `configResolved` unbound (`this` is `undefined`); call it the
 * same way so a `this.error(...)` in that hook fails under test.
 * @param {Plugin} plugin - Plugin under test
 * @param {StubConfig} cfg - Resolved config stub
 */
const callConfigResolved = (plugin: Plugin, cfg: StubConfig): void => {
  const fn = plugin.configResolved as HookFn<Plugin, "configResolved">;
  // Cast cfg through unknown — stub omits fields styleGenVite does not touch.
  (fn as (cfg: unknown) => void).call(undefined, cfg);
};

const callConfigureServer = (plugin: Plugin, server: StubServer): void => {
  const fn = plugin.configureServer as HookFn<Plugin, "configureServer">;
  (fn as (s: unknown) => void).call(plugin, server);
};

const callCloseBundle = (
  plugin: Plugin,
  ctx: StubPluginContext = makePluginContext(),
): void => {
  const fn = plugin.closeBundle as HookFn<Plugin, "closeBundle">;
  (fn as () => void).call(ctx);
};

const makeLogger = (): StubLogger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const makeServer = (logger: StubLogger): StubServer => {
  const handlers = new Map<string, (path: string) => void>();
  return {
    watcher: {
      handlers,
      on: (event, cb) => {
        handlers.set(event, cb);
      },
    },
    ws: { send: vi.fn() },
    config: { logger },
  };
};

const minimalTheme = {
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

describe("styleGenVite plugin", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "style-gen-vite-"));
    __resetForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    rmSync(tmp, { recursive: true, force: true });
  });

  const writeTheme = (relPath = "src/theme/theme.json"): string => {
    const abs = join(tmp, relPath);
    mkdirSync(resolve(abs, ".."), { recursive: true });
    writeFileSync(abs, JSON.stringify(minimalTheme), "utf8");
    return abs;
  };

  it("exposes plugin shape with name and enforce='pre'", () => {
    writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    expect(plugin.name).toBe("style-gen-vite");
    expect(plugin.enforce).toBe("pre");
  });

  it("emits theme.css to dir(themePath) by default", () => {
    writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    const logger = makeLogger();

    const cfg: StubConfig = { root: tmp, command: "serve", logger };
    callConfigResolved(plugin, cfg);

    const cssPath = join(tmp, "src/theme/theme.css");
    expect(existsSync(cssPath)).toBe(true);
    expect(readFileSync(cssPath, "utf8")).toMatch(/--sg-primary/);
    expect(readFileSync(cssPath, "utf8")).toMatch(/@utility body \{/);
    expect(logger.info).toHaveBeenCalledOnce();
  });

  it("respects explicit outDir", () => {
    writeTheme();
    const plugin = styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "generated",
    });
    const logger = makeLogger();
    callConfigResolved(plugin, {
      root: tmp,
      command: "serve",
      logger,
    } as StubConfig);

    expect(existsSync(join(tmp, "generated/theme.css"))).toBe(true);
  });

  it("rejects themePath that escapes project root", () => {
    const plugin = styleGenVite({ themePath: "../../etc/passwd" });
    expect(() => {
      callConfigResolved(plugin, {
        root: tmp,
        command: "serve",
        logger: makeLogger(),
      } as StubConfig);
    }).toThrow(/escapes project root/);
  });

  it("rejects outDir that escapes project root", () => {
    writeTheme();
    const plugin = styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "../../tmp/elsewhere",
    });
    expect(() => {
      callConfigResolved(plugin, {
        root: tmp,
        command: "serve",
        logger: makeLogger(),
      } as StubConfig);
    }).toThrow(/escapes project root/);
  });

  it("warns when two plugin instances target the same outDir", () => {
    writeTheme();
    const opts: StyleGenViteOptions = { themePath: "src/theme/theme.json" };
    const p1 = styleGenVite(opts);
    const p2 = styleGenVite(opts);

    const log1 = makeLogger();
    const log2 = makeLogger();

    callConfigResolved(p1, {
      root: tmp,
      command: "serve",
      logger: log1,
    } as StubConfig);
    callConfigResolved(p2, {
      root: tmp,
      command: "serve",
      logger: log2,
    } as StubConfig);

    expect(log1.warn).not.toHaveBeenCalled();
    expect(log2.warn).toHaveBeenCalledWith(
      expect.stringMatching(/Multiple plugin instances target/),
    );
  });

  it("skips duplicate emit on second configResolved (SSR build)", () => {
    writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    const log1 = makeLogger();
    const log2 = makeLogger();
    callConfigResolved(plugin, {
      root: tmp,
      command: "build",
      logger: log1,
    } as StubConfig);
    callConfigResolved(plugin, {
      root: tmp,
      command: "build",
      logger: log2,
    } as StubConfig);

    expect(log1.info).toHaveBeenCalledOnce();
    expect(log2.info).not.toHaveBeenCalled();
  });

  it("re-emits + sends full-reload on theme.json change (debounced)", () => {
    vi.useFakeTimers();
    const themeAbs = writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    const logger = makeLogger();
    callConfigResolved(plugin, {
      root: tmp,
      command: "serve",
      logger,
    } as StubConfig);
    const server = makeServer(logger);
    callConfigureServer(plugin, server);

    const handler = server.watcher.handlers.get("change");
    expect(handler).toBeDefined();

    writeFileSync(
      themeAbs,
      JSON.stringify({
        ...minimalTheme,
        colors: { ...minimalTheme.colors, primary: "#FF0000" },
      }),
      "utf8",
    );
    handler?.(themeAbs);
    handler?.(themeAbs);

    vi.advanceTimersByTime(199);
    expect(server.ws.send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(server.ws.send).toHaveBeenCalledTimes(1);

    expect(server.ws.send).toHaveBeenCalledWith({
      type: "full-reload",
      path: "*",
    });
    expect(readFileSync(join(tmp, "src/theme/theme.css"), "utf8")).toMatch(
      /#FF0000/,
    );
  });

  it("ignores changes to unrelated files", () => {
    vi.useFakeTimers();
    writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    const logger = makeLogger();
    callConfigResolved(plugin, {
      root: tmp,
      command: "serve",
      logger,
    } as StubConfig);
    const server = makeServer(logger);
    callConfigureServer(plugin, server);

    const handler = server.watcher.handlers.get("change");
    handler?.(join(tmp, "src/random.tsx"));
    vi.advanceTimersByTime(200);

    expect(server.ws.send).not.toHaveBeenCalled();
  });

  it("logs error if re-emit fails (invalid JSON)", () => {
    vi.useFakeTimers();
    const themeAbs = writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    const logger = makeLogger();
    callConfigResolved(plugin, {
      root: tmp,
      command: "serve",
      logger,
    } as StubConfig);
    const server = makeServer(logger);
    callConfigureServer(plugin, server);

    writeFileSync(themeAbs, "{ not valid json", "utf8");
    const handler = server.watcher.handlers.get("change");
    handler?.(themeAbs);
    vi.advanceTimersByTime(200);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/Re-emit failed/),
    );
  });

  it("configResolved throws a plain Error naming the theme file path on invalid JSON (unbound this, Vite 5/6)", () => {
    const themeAbs = writeTheme();
    writeFileSync(themeAbs, "{ not valid json", "utf8");
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });

    expect(() => {
      callConfigResolved(plugin, {
        root: tmp,
        command: "serve",
        logger: makeLogger(),
      } as StubConfig);
    }).toThrow(`[style-gen-vite] invalid theme in ${themeAbs}`);
  });

  it("configResolved throws a plain Error with formatted Zod issues naming the offending key (unbound this, Vite 5/6)", () => {
    const themeAbs = writeTheme();
    writeFileSync(
      themeAbs,
      JSON.stringify({ ...minimalTheme, colours: {} }),
      "utf8",
    );
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });

    expect(() => {
      callConfigResolved(plugin, {
        root: tmp,
        command: "serve",
        logger: makeLogger(),
      } as StubConfig);
    }).toThrow(/colours/);
  });

  it("configResolved error keeps the original error as cause", () => {
    const themeAbs = writeTheme();
    writeFileSync(themeAbs, "{", "utf8");
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    let thrown: unknown;
    try {
      callConfigResolved(plugin, {
        root: tmp,
        command: "serve",
        logger: makeLogger(),
      } as StubConfig);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).cause).toBeInstanceOf(SyntaxError);
  });

  it("closeBundle re-emits the latest theme in build command", () => {
    const themeAbs = writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    const logger = makeLogger();
    callConfigResolved(plugin, {
      root: tmp,
      command: "build",
      logger,
    } as StubConfig);
    writeFileSync(
      themeAbs,
      JSON.stringify({
        ...minimalTheme,
        colors: { ...minimalTheme.colors, primary: "#FF0000" },
      }),
      "utf8",
    );
    callCloseBundle(plugin);

    expect(readFileSync(join(tmp, "src/theme/theme.css"), "utf8")).toMatch(
      /#FF0000/,
    );
  });

  it("closeBundle fails the build with the formatted issue when the theme turned invalid", () => {
    const themeAbs = writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    callConfigResolved(plugin, {
      root: tmp,
      command: "build",
      logger: makeLogger(),
    } as StubConfig);
    const before = readFileSync(join(tmp, "src/theme/theme.css"), "utf8");
    writeFileSync(
      themeAbs,
      JSON.stringify({ colors: { primary: "red;}" } }),
      "utf8",
    );

    expect(() => {
      callCloseBundle(plugin);
    }).toThrow(/invalid theme in .*theme\.json:\ncolors\.primary → /);
    expect(readFileSync(join(tmp, "src/theme/theme.css"), "utf8")).toBe(before);
  });

  it("closeBundle is no-op in serve command", () => {
    writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    const logger = makeLogger();
    callConfigResolved(plugin, {
      root: tmp,
      command: "serve",
      logger,
    } as StubConfig);
    // Initial configResolved already wrote files; delete to detect any re-write.
    rmSync(join(tmp, "src/theme/theme.css"));
    callCloseBundle(plugin);

    expect(existsSync(join(tmp, "src/theme/theme.css"))).toBe(false);
  });

  it("accepts absolute themePath when inside root", () => {
    const abs = writeTheme();
    const plugin = styleGenVite({ themePath: abs });
    const logger = makeLogger();
    callConfigResolved(plugin, {
      root: tmp,
      command: "serve",
      logger,
    } as StubConfig);
    expect(existsSync(join(tmp, "src/theme/theme.css"))).toBe(true);
  });
});
