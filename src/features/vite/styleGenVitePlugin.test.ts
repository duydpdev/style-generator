import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
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

interface StubPluginContext {
  error: (msg: string) => never;
  addWatchFile: ReturnType<typeof vi.fn>;
}

/**
 * Rollup binds `this` inside `buildStart` to a `PluginContext` whose
 * `.error()` always throws. Mirror that here so the plugin's `this.error(...)`
 * call behaves the same way under test.
 * @returns {StubPluginContext} A minimal plugin context stub
 */
const makePluginContext = (): StubPluginContext => ({
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
const callConfigResolved = (plugin: Plugin, cfg: StubConfig): void => {
  const fn = plugin.configResolved as HookFn<Plugin, "configResolved">;
  // Cast cfg through unknown — stub omits fields styleGenVite does not touch.
  (fn as (cfg: unknown) => void).call(undefined, cfg);
};

const callBuildStart = (
  plugin: Plugin,
  ctx: StubPluginContext = makePluginContext(),
): StubPluginContext => {
  const fn = plugin.buildStart as HookFn<Plugin, "buildStart">;
  (fn as () => void).call(ctx);
  return ctx;
};

const callConfigureServer = (plugin: Plugin, server: StubServer): void => {
  const fn = plugin.configureServer as HookFn<Plugin, "configureServer">;
  (fn as (s: unknown) => void).call(plugin, server);
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

  const writeTheme = (
    relPath = "src/theme/theme.json",
    theme: unknown = minimalTheme,
  ): string => {
    const abs = join(tmp, relPath);
    mkdirSync(resolve(abs, ".."), { recursive: true });
    writeFileSync(abs, JSON.stringify(theme), "utf8");
    return abs;
  };

  const serveConfig = (logger = makeLogger()): StubConfig => ({
    root: tmp,
    command: "serve",
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

  it("exposes plugin shape with name and enforce='pre'", () => {
    writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    expect(plugin.name).toBe("style-gen-vite");
    expect(plugin.enforce).toBe("pre");
  });

  it("has no closeBundle: the emit happens in buildStart", () => {
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    expect(plugin.closeBundle).toBeUndefined();
    expect(plugin.buildStart).toBeTypeOf("function");
  });

  it("runs buildStart in every Vite >= 6 dev environment (perEnvironmentStartEndDuringDev)", () => {
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    expect(plugin.perEnvironmentStartEndDuringDev).toBe(true);
  });

  it("configResolved resolves paths but writes nothing; buildStart emits theme.css to dir(themePath)", () => {
    writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    const logger = makeLogger();
    const cssPath = join(tmp, "src/theme/theme.css");

    callConfigResolved(plugin, serveConfig(logger));
    expect(existsSync(cssPath)).toBe(false);

    callBuildStart(plugin);
    expect(readFileSync(cssPath, "utf8")).toMatch(/--sg-color-primary/);
    expect(readFileSync(cssPath, "utf8")).toMatch(/@utility body \{/);
    expect(logger.info).toHaveBeenCalledOnce();
  });

  it("registers the theme with addWatchFile so a build re-runs when it changes", () => {
    const themeAbs = writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });

    const ctx = start(plugin, serveConfig());

    expect(ctx.addWatchFile).toHaveBeenCalledExactlyOnceWith(themeAbs);
  });

  it("respects explicit outDir", () => {
    writeTheme();
    const plugin = styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "generated",
    });
    start(plugin, serveConfig());

    expect(existsSync(join(tmp, "generated/theme.css"))).toBe(true);
  });

  it("accepts a themePath outside the project root (monorepo-shared theme)", () => {
    const project = join(tmp, "packages/app");
    mkdirSync(project, { recursive: true });
    const sharedTheme = writeTheme("shared/theme.json");
    const plugin = styleGenVite({
      themePath: "../../shared/theme.json",
      outDir: "src",
    });

    const ctx = start(plugin, { ...serveConfig(), root: project });

    expect(ctx.addWatchFile).toHaveBeenCalledWith(sharedTheme);
    expect(existsSync(join(project, "src/theme.css"))).toBe(true);
  });

  it("rejects outDir that escapes project root", () => {
    writeTheme();
    const plugin = styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "../../tmp/elsewhere",
    });
    expect(() => {
      callConfigResolved(plugin, serveConfig());
    }).toThrow(/outDir escapes project root/);
  });

  it("warns when two plugin instances target the same theme.css", () => {
    writeTheme();
    const opts: StyleGenViteOptions = { themePath: "src/theme/theme.json" };
    const p1 = styleGenVite(opts);
    const p2 = styleGenVite(opts);

    const log1 = makeLogger();
    const log2 = makeLogger();

    callConfigResolved(p1, serveConfig(log1));
    callConfigResolved(p2, serveConfig(log2));

    expect(log1.warn).not.toHaveBeenCalled();
    expect(log2.warn).toHaveBeenCalledWith(
      expect.stringMatching(/Multiple plugin instances target/),
    );
  });

  it("does not warn when one instance resolves its config twice (one run per environment)", () => {
    writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    const logger = makeLogger();

    callConfigResolved(plugin, serveConfig(logger));
    callConfigResolved(plugin, serveConfig(logger));

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("frees the output file when the dev server closes, so a restart does not warn", async () => {
    writeTheme();
    const opts: StyleGenViteOptions = { themePath: "src/theme/theme.json" };
    const first = styleGenVite(opts);
    const server = makeServer(makeLogger());
    callConfigResolved(first, serveConfig());
    callConfigureServer(first, server);

    await server.close();

    const restarted = styleGenVite(opts);
    const logger = makeLogger();
    callConfigResolved(restarted, serveConfig(logger));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("still warns for a second live instance when the first server has not closed", () => {
    writeTheme();
    const opts: StyleGenViteOptions = { themePath: "src/theme/theme.json" };
    const first = styleGenVite(opts);
    callConfigResolved(first, serveConfig());
    callConfigureServer(first, makeServer(makeLogger()));

    const logger = makeLogger();
    callConfigResolved(styleGenVite(opts), serveConfig(logger));

    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("a second buildStart with an unchanged theme writes nothing (changed: false)", () => {
    writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    const logger = makeLogger();
    const cssPath = join(tmp, "src/theme/theme.css");

    callConfigResolved(plugin, { ...serveConfig(logger), command: "build" });
    callBuildStart(plugin);
    // writeFileAtomic renames a fresh file into place: an unchanged emit keeps the inode.
    const first = statSync(cssPath).ino;
    callBuildStart(plugin);

    expect(statSync(cssPath).ino).toBe(first);
    expect(logger.info).toHaveBeenCalledOnce();
  });

  it("buildStart re-emits the latest theme on a later build", () => {
    const themeAbs = writeTheme();
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    start(plugin, { ...serveConfig(), command: "build" });

    writeFileSync(
      themeAbs,
      JSON.stringify({
        ...minimalTheme,
        colors: { ...minimalTheme.colors, primary: "#FF0000" },
      }),
      "utf8",
    );
    callBuildStart(plugin);

    expect(readFileSync(join(tmp, "src/theme/theme.css"), "utf8")).toMatch(
      /#FF0000/,
    );
  });

  describe("buildStart failures go through this.error", () => {
    const failWith = (theme: string | object, opts?: StyleGenViteOptions) => {
      const themeAbs = writeTheme();
      writeFileSync(
        themeAbs,
        typeof theme === "string" ? theme : JSON.stringify(theme),
        "utf8",
      );
      const plugin = styleGenVite(
        opts ?? { themePath: "src/theme/theme.json" },
      );
      callConfigResolved(plugin, serveConfig());
      return { themeAbs, run: () => callBuildStart(plugin) };
    };

    it("names the theme file for invalid JSON", () => {
      const { themeAbs, run } = failWith("{ not valid json");
      expect(run).toThrow(`[style-gen-vite] Invalid JSON in ${themeAbs}`);
    });

    it("prints the formatted Zod issue naming the offending key for an invalid theme", () => {
      const { themeAbs, run } = failWith({ ...minimalTheme, colours: {} });
      expect(run).toThrow(
        new RegExp(
          `Invalid theme \\(${themeAbs.replaceAll(".", "\\.")}\\):\\n[^]*colours`,
        ),
      );
    });

    it("labels an options error as 'Invalid options', not as an invalid theme", () => {
      const { run } = failWith(minimalTheme, {
        themePath: "src/theme/theme.json",
        options: { breakpoints: ["nope"] },
      });
      expect(run).toThrow(/Invalid options:/);
      expect(run).not.toThrow(/Invalid theme/);
    });

    it("leaves the previous theme.css untouched when the theme turned invalid", () => {
      const themeAbs = writeTheme();
      const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
      start(plugin, serveConfig());
      const cssPath = join(tmp, "src/theme/theme.css");
      const before = readFileSync(cssPath, "utf8");

      writeFileSync(
        themeAbs,
        JSON.stringify({ colors: { primary: "red;}" } }),
        "utf8",
      );

      expect(() => callBuildStart(plugin)).toThrow(
        /Invalid theme \(.*theme\.json\):\ncolors\.primary → /,
      );
      expect(readFileSync(cssPath, "utf8")).toBe(before);
    });
  });

  describe("no-argument form reads the config file", () => {
    const writeConfig = (config: unknown, file = "style-gen.config.json") => {
      writeFileSync(join(tmp, file), JSON.stringify(config), "utf8");
    };

    it("takes theme and output from style-gen.config.json", () => {
      const themeAbs = writeTheme("design/tokens.json");
      writeConfig({ theme: "design/tokens.json", output: "gen/out.css" });
      const plugin = styleGenVite();

      const ctx = start(plugin, serveConfig());

      expect(ctx.addWatchFile).toHaveBeenCalledWith(themeAbs);
      expect(existsSync(join(tmp, "gen/out.css"))).toBe(true);
    });

    it("falls back to the default paths when no config file exists", () => {
      writeTheme("styles/theme.json");
      const plugin = styleGenVite();

      start(plugin, serveConfig());

      expect(existsSync(join(tmp, "styles/theme.css"))).toBe(true);
    });

    it("reads package.json#style-gen when there is no config file", () => {
      writeTheme("t.json");
      writeConfig(
        { "style-gen": { theme: "t.json", output: "o.css" } },
        "package.json",
      );
      const plugin = styleGenVite();

      start(plugin, serveConfig());

      expect(existsSync(join(tmp, "o.css"))).toBe(true);
    });

    it("passes axes from the config file to generate() (V5 go/no-go)", () => {
      writeTheme("styles/theme.json", {
        ...minimalTheme,
        themeAxes: { theme: { dark: { colors: { primary: "#000000" } } } },
      });
      writeConfig({ axes: { attribute: { theme: "data-mode" } } });
      const plugin = styleGenVite();

      start(plugin, serveConfig());

      const css = readFileSync(join(tmp, "styles/theme.css"), "utf8");
      expect(css).toContain('html[data-mode="dark"]');
      expect(css).not.toContain('html[data-theme="dark"]');
    });

    it("throws a labelled error for a config that violates the schema (no silent defaults)", () => {
      writeTheme("styles/theme.json");
      writeConfig({ breakpoint: ["xl"] });
      const plugin = styleGenVite();

      expect(() => {
        callConfigResolved(plugin, serveConfig());
      }).toThrow(
        /\[style-gen-vite\] Invalid config \(style-gen\.config\.json\):\n[^]*breakpoint/,
      );
      expect(existsSync(join(tmp, "styles/theme.css"))).toBe(false);
    });

    it("throws a labelled error for a config file that is not valid JSON", () => {
      writeFileSync(join(tmp, "style-gen.config.json"), "{", "utf8");
      const plugin = styleGenVite();

      expect(() => {
        callConfigResolved(plugin, serveConfig());
      }).toThrow(
        /Invalid config \(style-gen\.config\.json\):\n.*not valid JSON/,
      );
    });

    it("rejects a configured output that escapes the project root", () => {
      writeConfig({ output: "../elsewhere/theme.css" });
      const plugin = styleGenVite();

      expect(() => {
        callConfigResolved(plugin, serveConfig());
      }).toThrow(/output escapes project root/);
    });
  });

  describe("dev server (configureServer)", () => {
    const setup = () => {
      vi.useFakeTimers();
      const themeAbs = writeTheme();
      const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
      const logger = makeLogger();
      start(plugin, serveConfig(logger));
      const server = makeServer(logger);
      callConfigureServer(plugin, server);
      return { themeAbs, logger, server };
    };

    it("adds the theme to the dev watcher (a theme outside root is not watched otherwise)", () => {
      const { themeAbs, server } = setup();
      expect(server.watcher.add).toHaveBeenCalledExactlyOnceWith(themeAbs);
    });

    it("re-emits + sends full-reload on theme.json change (debounced)", () => {
      const { themeAbs, server } = setup();
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

      expect(server.ws.send).toHaveBeenCalledExactlyOnceWith({
        type: "full-reload",
        path: "*",
      });
      expect(readFileSync(join(tmp, "src/theme/theme.css"), "utf8")).toMatch(
        /#FF0000/,
      );
    });

    it("sends no full-reload when the save leaves the generated CSS unchanged", () => {
      const { themeAbs, server } = setup();
      // Same colours, different JSON formatting: the CSS is byte-identical.
      writeFileSync(themeAbs, JSON.stringify(minimalTheme, null, 4), "utf8");
      server.watcher.handlers.get("change")?.(themeAbs);
      vi.advanceTimersByTime(200);

      expect(server.ws.send).not.toHaveBeenCalled();
    });

    it("ignores changes to unrelated files", () => {
      const { server } = setup();
      server.watcher.handlers.get("change")?.(join(tmp, "src/random.tsx"));
      vi.advanceTimersByTime(200);

      expect(server.ws.send).not.toHaveBeenCalled();
    });

    it("logs the staged error if re-emit fails (invalid JSON) and keeps the old CSS", () => {
      const { themeAbs, logger, server } = setup();
      const cssPath = join(tmp, "src/theme/theme.css");
      const before = readFileSync(cssPath, "utf8");

      writeFileSync(themeAbs, "{ not valid json", "utf8");
      server.watcher.handlers.get("change")?.(themeAbs);
      vi.advanceTimersByTime(200);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringMatching(/Re-emit failed:\nInvalid JSON in /),
      );
      expect(server.ws.send).not.toHaveBeenCalled();
      expect(readFileSync(cssPath, "utf8")).toBe(before);
    });
  });

  it("accepts absolute themePath when inside root", () => {
    const abs = writeTheme();
    const plugin = styleGenVite({ themePath: abs });
    start(plugin, serveConfig());
    expect(existsSync(join(tmp, "src/theme/theme.css"))).toBe(true);
  });
});
