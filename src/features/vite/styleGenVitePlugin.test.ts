import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  mkdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  callBuildStart,
  callConfigResolved,
  callConfigureServer,
  makeLogger,
  makeServer,
  minimalTheme,
  viteHarness,
} from "../../__integration__/__fixtures__/viteHookStubs";

import { styleGenVite, __resetForTests } from "./styleGenVitePlugin";

describe("styleGenVite plugin", () => {
  let tmp: string;
  const { writeTheme, writeConfig, serveConfig, start } = viteHarness(
    () => tmp,
  );

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "style-gen-vite-"));
    __resetForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    rmSync(tmp, { recursive: true, force: true });
  });

  it("exposes plugin shape with name and enforce='pre'", () => {
    const plugin = styleGenVite();
    expect(plugin.name).toBe("style-gen-vite");
    expect(plugin.enforce).toBe("pre");
  });

  it("has no closeBundle: the emit happens in buildStart", () => {
    const plugin = styleGenVite();
    expect(plugin.closeBundle).toBeUndefined();
    expect(plugin.buildStart).toBeTypeOf("function");
  });

  it("runs buildStart in every Vite >= 6 dev environment (perEnvironmentStartEndDuringDev)", () => {
    const plugin = styleGenVite();
    expect(plugin.perEnvironmentStartEndDuringDev).toBe(true);
  });

  it("configResolved resolves paths but writes nothing; buildStart emits theme.css and theme.tokens.ts next to output", () => {
    writeTheme();
    writeConfig();
    const plugin = styleGenVite();
    const logger = makeLogger();
    const cssPath = join(tmp, "src/theme/theme.css");

    callConfigResolved(plugin, serveConfig(logger));
    expect(existsSync(cssPath)).toBe(false);

    callBuildStart(plugin);
    expect(readFileSync(cssPath, "utf8")).toMatch(/--sg-color-primary/);
    expect(readFileSync(cssPath, "utf8")).toMatch(/@utility body \{/);
    expect(existsSync(join(tmp, "src/theme/theme.tokens.ts"))).toBe(true);
    expect(logger.info).toHaveBeenCalledOnce();
  });

  it("registers the theme with addWatchFile so a build re-runs when it changes", () => {
    const themeAbs = writeTheme();
    writeConfig();
    const plugin = styleGenVite();

    const ctx = start(plugin, serveConfig());

    expect(ctx.addWatchFile).toHaveBeenCalledExactlyOnceWith(themeAbs);
  });

  it("writes to the configured output and tokensOutput", () => {
    writeTheme();
    writeConfig({
      output: "generated/theme.css",
      tokensOutput: "src/tokens.gen.ts",
    });
    start(styleGenVite(), serveConfig());

    expect(existsSync(join(tmp, "generated/theme.css"))).toBe(true);
    expect(existsSync(join(tmp, "src/tokens.gen.ts"))).toBe(true);
  });

  it("accepts a theme outside the project root (monorepo-shared theme)", () => {
    const project = join(tmp, "packages/app");
    mkdirSync(project, { recursive: true });
    const sharedTheme = writeTheme("shared/theme.json");
    writeFileSync(
      join(project, "style-gen.config.json"),
      JSON.stringify({
        theme: "../../shared/theme.json",
        output: "src/theme.css",
      }),
    );

    const ctx = start(styleGenVite(), { ...serveConfig(), root: project });

    expect(ctx.addWatchFile).toHaveBeenCalledWith(sharedTheme);
    expect(existsSync(join(project, "src/theme.css"))).toBe(true);
  });

  it("rejects an output that escapes project root", () => {
    writeTheme();
    writeConfig({ output: "../../tmp/elsewhere/theme.css" });
    expect(() => {
      callConfigResolved(styleGenVite(), serveConfig());
    }).toThrow(/output escapes project root/);
  });

  describe("root option", () => {
    const writeAppConfig = (): void => {
      writeFileSync(
        join(tmp, "app/style-gen.config.json"),
        JSON.stringify({ theme: "t.json", output: "o.css" }),
      );
    };

    beforeEach(() => {
      mkdirSync(join(tmp, "app"), { recursive: true });
      writeTheme("app/t.json");
    });

    it("resolves a relative root against Vite's root", () => {
      writeAppConfig();
      start(styleGenVite({ root: "app" }), serveConfig());
      expect(existsSync(join(tmp, "app/o.css"))).toBe(true);
    });

    it("accepts an absolute root (Nuxt: Vite's root is app/, the config lives one level up)", () => {
      writeAppConfig();
      const viteRoot = join(tmp, "app/inner");
      mkdirSync(viteRoot, { recursive: true });
      start(styleGenVite({ root: join(tmp, "app") }), {
        ...serveConfig(),
        root: viteRoot,
      });
      expect(existsSync(join(tmp, "app/o.css"))).toBe(true);
    });

    it("reads no config from Vite's root when root points elsewhere", () => {
      writeAppConfig();
      writeConfig({ output: "wrong.css" });
      start(styleGenVite({ root: "app" }), serveConfig());
      expect(existsSync(join(tmp, "wrong.css"))).toBe(false);
    });
  });

  it("rejects the removed 7.x options when the plugin is created, naming the key and the migration guide", () => {
    for (const removed of ["themePath", "outDir", "options"]) {
      expect(() => styleGenVite({ [removed]: "x" } as never)).toThrow(
        new RegExp(
          `^\\[style-gen-vite\\] Invalid options:\\n[^]*${removed}[^]*7\\.x-to-8\\.0`,
        ),
      );
    }
    expect(() => styleGenVite({ root: "" })).toThrow(
      /^\[style-gen-vite\] Invalid options:\n[^]*root/,
    );
  });

  it("warns when two plugin instances from different configs target the same theme.css", () => {
    writeTheme();
    writeConfig();
    const p1 = styleGenVite();
    const p2 = styleGenVite();

    const log1 = makeLogger();
    const log2 = makeLogger();

    callConfigResolved(p1, serveConfig(log1, join(tmp, "a.vite.config.ts")));
    callConfigResolved(p2, serveConfig(log2, join(tmp, "b.vite.config.ts")));

    expect(log1.warn).not.toHaveBeenCalled();
    expect(log2.warn).toHaveBeenCalledWith(
      expect.stringMatching(/Multiple plugin instances target/),
    );
  });

  it("does not warn when one instance resolves its config twice (one run per environment)", () => {
    writeTheme();
    writeConfig();
    const plugin = styleGenVite();
    const logger = makeLogger();

    callConfigResolved(plugin, serveConfig(logger));
    callConfigResolved(plugin, serveConfig(logger));

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("builder mode: one instance per environment of the same config does not warn; another config does", () => {
    writeTheme();
    writeConfig();
    const logger = makeLogger();
    callConfigResolved(styleGenVite(), serveConfig(logger));
    callConfigResolved(styleGenVite(), serveConfig(logger));
    expect(logger.warn).not.toHaveBeenCalled();

    callConfigResolved(
      styleGenVite(),
      serveConfig(logger, join(tmp, "other.vite.config.ts")),
    );
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("falls back to the root as owner when there is no config file", () => {
    writeTheme();
    writeConfig();
    const logger = makeLogger();
    callConfigResolved(styleGenVite(), serveConfig(logger, null));
    callConfigResolved(styleGenVite(), serveConfig(logger, null));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("a restart (new instance resolved BEFORE the old server closes) does not warn, and the old close does not free the new slot", async () => {
    writeTheme();
    writeConfig();
    const first = styleGenVite();
    const oldServer = makeServer(makeLogger());
    callConfigResolved(first, serveConfig());
    callConfigureServer(first, oldServer);

    // Vite's restartServer: the new server's plugins resolve first.
    const restarted = styleGenVite();
    const restartLogger = makeLogger();
    callConfigResolved(restarted, serveConfig(restartLogger));
    expect(restartLogger.warn).not.toHaveBeenCalled();

    await oldServer.close();

    const stranger = makeLogger();
    callConfigResolved(
      styleGenVite(),
      serveConfig(stranger, join(tmp, "other.vite.config.ts")),
    );
    expect(stranger.warn).toHaveBeenCalledOnce();
  });

  it("frees the output file when its own server closes", async () => {
    writeTheme();
    writeConfig();
    const first = styleGenVite();
    const server = makeServer(makeLogger());
    callConfigResolved(first, serveConfig());
    callConfigureServer(first, server);

    await server.close();

    const logger = makeLogger();
    callConfigResolved(
      styleGenVite(),
      serveConfig(logger, join(tmp, "other.vite.config.ts")),
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("still warns for a second live instance from another config when the first server has not closed", () => {
    writeTheme();
    writeConfig();
    const first = styleGenVite();
    callConfigResolved(first, serveConfig());
    callConfigureServer(first, makeServer(makeLogger()));

    const logger = makeLogger();
    callConfigResolved(
      styleGenVite(),
      serveConfig(logger, join(tmp, "other.vite.config.ts")),
    );

    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("a second buildStart with an unchanged theme writes nothing (changed: false)", () => {
    writeTheme();
    writeConfig();
    const plugin = styleGenVite();
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
    writeConfig();
    const plugin = styleGenVite();
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
    const failWith = (theme: string | object, config: object = {}) => {
      const themeAbs = writeTheme();
      writeFileSync(
        themeAbs,
        typeof theme === "string" ? theme : JSON.stringify(theme),
        "utf8",
      );
      writeConfig(config);
      const plugin = styleGenVite();
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

    it("labels a bad option as an invalid config, not as an invalid theme", () => {
      expect(() => failWith(minimalTheme, { breakpoints: ["nope"] })).toThrow(
        /^\[style-gen-vite\] Invalid config \(style-gen\.config\.json\):\n[^]*breakpoints\.0/,
      );
    });

    it("leaves the previous theme.css untouched when the theme turned invalid", () => {
      const themeAbs = writeTheme();
      writeConfig();
      const plugin = styleGenVite();
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
});
