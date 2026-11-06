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

import {
  styleGenVite,
  __resetForTests,
  type StyleGenViteOptions,
} from "./styleGenVitePlugin";

describe("styleGenVite plugin", () => {
  let tmp: string;
  const { writeTheme, serveConfig, start } = viteHarness(() => tmp);

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "style-gen-vite-"));
    __resetForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    rmSync(tmp, { recursive: true, force: true });
  });

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

  it("rejects an unknown option key and a missing themePath with a labelled message", () => {
    expect(() => {
      callConfigResolved(
        styleGenVite({
          themePath: "src/theme/theme.json",
          outdir: "x",
        } as never),
        serveConfig(),
      );
    }).toThrow(/^\[style-gen-vite\] Invalid options:\n.*outdir/);
    expect(() => {
      callConfigResolved(
        styleGenVite({ themepath: "src/theme/theme.json" } as never),
        serveConfig(),
      );
    }).toThrow(/^\[style-gen-vite\] Invalid options:\n[^]*themePath/);
  });

  it("warns when two plugin instances from different configs target the same theme.css", () => {
    writeTheme();
    const opts: StyleGenViteOptions = { themePath: "src/theme/theme.json" };
    const p1 = styleGenVite(opts);
    const p2 = styleGenVite(opts);

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
    const plugin = styleGenVite({ themePath: "src/theme/theme.json" });
    const logger = makeLogger();

    callConfigResolved(plugin, serveConfig(logger));
    callConfigResolved(plugin, serveConfig(logger));

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("builder mode: one instance per environment of the same config does not warn; another config does", () => {
    writeTheme();
    const opts: StyleGenViteOptions = { themePath: "src/theme/theme.json" };
    const logger = makeLogger();
    callConfigResolved(styleGenVite(opts), serveConfig(logger));
    callConfigResolved(styleGenVite(opts), serveConfig(logger));
    expect(logger.warn).not.toHaveBeenCalled();

    callConfigResolved(
      styleGenVite(opts),
      serveConfig(logger, join(tmp, "other.vite.config.ts")),
    );
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("falls back to the root as owner when there is no config file", () => {
    writeTheme();
    const opts: StyleGenViteOptions = { themePath: "src/theme/theme.json" };
    const logger = makeLogger();
    callConfigResolved(styleGenVite(opts), serveConfig(logger, null));
    callConfigResolved(styleGenVite(opts), serveConfig(logger, null));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("a restart (new instance resolved BEFORE the old server closes) does not warn, and the old close does not free the new slot", async () => {
    writeTheme();
    const opts: StyleGenViteOptions = { themePath: "src/theme/theme.json" };
    const first = styleGenVite(opts);
    const oldServer = makeServer(makeLogger());
    callConfigResolved(first, serveConfig());
    callConfigureServer(first, oldServer);

    // Vite's restartServer: the new server's plugins resolve first.
    const restarted = styleGenVite(opts);
    const restartLogger = makeLogger();
    callConfigResolved(restarted, serveConfig(restartLogger));
    expect(restartLogger.warn).not.toHaveBeenCalled();

    await oldServer.close();

    const stranger = makeLogger();
    callConfigResolved(
      styleGenVite(opts),
      serveConfig(stranger, join(tmp, "other.vite.config.ts")),
    );
    expect(stranger.warn).toHaveBeenCalledOnce();
  });

  it("frees the output file when its own server closes", async () => {
    writeTheme();
    const opts: StyleGenViteOptions = { themePath: "src/theme/theme.json" };
    const first = styleGenVite(opts);
    const server = makeServer(makeLogger());
    callConfigResolved(first, serveConfig());
    callConfigureServer(first, server);

    await server.close();

    const logger = makeLogger();
    callConfigResolved(
      styleGenVite(opts),
      serveConfig(logger, join(tmp, "other.vite.config.ts")),
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("still warns for a second live instance from another config when the first server has not closed", () => {
    writeTheme();
    const opts: StyleGenViteOptions = { themePath: "src/theme/theme.json" };
    const first = styleGenVite(opts);
    callConfigResolved(first, serveConfig());
    callConfigureServer(first, makeServer(makeLogger()));

    const logger = makeLogger();
    callConfigResolved(
      styleGenVite(opts),
      serveConfig(logger, join(tmp, "other.vite.config.ts")),
    );

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
});
