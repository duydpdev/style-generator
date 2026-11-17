import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  callConfigResolved,
  callConfigureServer,
  makeLogger,
  makeServer,
  minimalTheme,
  viteHarness,
  type StubServer,
} from "../../__integration__/__fixtures__/viteHookStubs";
import type * as ResolvePluginTargetModule from "../../node/resolvePluginTarget";
import { resolvePluginTarget } from "../../node/resolvePluginTarget";
import type * as ThemeEmitterModule from "../../node/themeEmitter";
import { emitTheme } from "../../node/themeEmitter";

// Passthrough spies: the config-candidate tests assert how often the plugin
// resolves the target and emits, the only observable difference between
// "skipped" and "reloaded to the same result" (the emit writes only on change).
vi.mock("../../node/resolvePluginTarget", async (importOriginal) => {
  const actual = await importOriginal<typeof ResolvePluginTargetModule>();
  return {
    ...actual,
    resolvePluginTarget: vi.fn(actual.resolvePluginTarget),
  };
});
vi.mock("../../node/themeEmitter", async (importOriginal) => {
  const actual = await importOriginal<typeof ThemeEmitterModule>();
  return { ...actual, emitTheme: vi.fn(actual.emitTheme) };
});

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

  describe("the config file is the only source of options", () => {
    const writeRawConfig = (
      config: unknown,
      file = "style-gen.config.json",
    ) => {
      writeFileSync(join(tmp, file), JSON.stringify(config), "utf8");
    };

    it("takes theme and output from style-gen.config.json", () => {
      const themeAbs = writeTheme("design/tokens.json");
      writeRawConfig({ theme: "design/tokens.json", output: "gen/out.css" });
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

    it("logs the no-config line once per plugin instance, not once per environment", () => {
      writeTheme("styles/theme.json");
      const logger = makeLogger();
      const plugin = styleGenVite();

      // Vite runs `configResolved` once per environment (client, ssr, …).
      callConfigResolved(plugin, serveConfig(logger));
      callConfigResolved(plugin, serveConfig(logger));

      expect(logger.info).toHaveBeenCalledTimes(1);
    });

    it("reads package.json#style-gen when there is no config file", () => {
      writeTheme("t.json");
      writeRawConfig(
        { "style-gen": { theme: "t.json", output: "o.css" } },
        "package.json",
      );
      const plugin = styleGenVite();

      start(plugin, serveConfig());

      expect(existsSync(join(tmp, "o.css"))).toBe(true);
    });

    it("passes options from the config file to generate()", () => {
      writeTheme("styles/theme.json", minimalTheme);
      writeRawConfig({ resetTailwindDefaults: ["colors"] });
      const plugin = styleGenVite();

      start(plugin, serveConfig());

      const css = readFileSync(join(tmp, "styles/theme.css"), "utf8");
      expect(css).toContain("--color-*: initial;");
    });

    it("throws a labelled error for a config that violates the schema (no silent defaults)", () => {
      writeTheme("styles/theme.json");
      writeRawConfig({ breakpoint: ["xl"] });
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
      writeRawConfig({ output: "../elsewhere/theme.css" });
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
      const configAbs = writeConfig();
      const plugin = styleGenVite();
      const logger = makeLogger();
      start(plugin, serveConfig(logger));
      const server = makeServer(logger);
      callConfigureServer(plugin, server);
      return { themeAbs, configAbs, logger, server };
    };

    it("adds the theme and every config candidate to the dev watcher (a theme outside root is not watched otherwise)", () => {
      const { themeAbs, configAbs, server } = setup();
      expect(server.watcher.add.mock.calls).toEqual([
        [themeAbs],
        [[configAbs, join(tmp, "package.json")]],
      ]);
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

    describe("config edits reload in place", () => {
      it("re-emits to the new output and tokensOutput and sends full-reload (debounced)", () => {
        const { configAbs, server } = setup();

        writeConfig({
          output: "gen/theme.css",
          tokensOutput: "gen/theme.tokens.ts",
          resetTailwindDefaults: ["colors"],
        });
        server.watcher.handlers.get("change")?.(configAbs);
        server.watcher.handlers.get("change")?.(configAbs);

        vi.advanceTimersByTime(199);
        expect(server.ws.send).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);

        expect(readFileSync(join(tmp, "gen/theme.css"), "utf8")).toContain(
          "--color-*: initial;",
        );
        expect(existsSync(join(tmp, "gen/theme.tokens.ts"))).toBe(true);
        expect(server.ws.send).toHaveBeenCalledExactlyOnceWith({
          type: "full-reload",
          path: "*",
        });
      });

      it("keeps the new options for later theme edits", () => {
        const { themeAbs, configAbs, server } = setup();
        writeConfig({
          output: "gen/theme.css",
          resetTailwindDefaults: ["colors"],
        });
        server.watcher.handlers.get("change")?.(configAbs);
        vi.advanceTimersByTime(200);

        writeFileSync(
          themeAbs,
          JSON.stringify({
            ...minimalTheme,
            colors: { ...minimalTheme.colors, primary: "#00FF00" },
          }),
          "utf8",
        );
        server.watcher.handlers.get("change")?.(themeAbs);
        vi.advanceTimersByTime(200);

        const css = readFileSync(join(tmp, "gen/theme.css"), "utf8");
        expect(css).toContain("#00FF00");
        expect(css).toContain("--color-*: initial;");
      });

      it("watches a theme the edited config moved to, and re-emits its edits", () => {
        const { server } = setup();
        const moved = writeTheme("other/theme.json");
        const configAbs = writeConfig({ theme: "other/theme.json" });
        server.watcher.handlers.get("change")?.(configAbs);
        vi.advanceTimersByTime(200);
        expect(server.watcher.add).toHaveBeenLastCalledWith(moved);

        writeFileSync(
          moved,
          JSON.stringify({
            ...minimalTheme,
            colors: { ...minimalTheme.colors, primary: "#0000FF" },
          }),
          "utf8",
        );
        server.watcher.handlers.get("change")?.(moved);
        vi.advanceTimersByTime(200);

        expect(readFileSync(join(tmp, "src/theme/theme.css"), "utf8")).toMatch(
          /#0000FF/,
        );
      });

      it("keeps the previous target, writes nothing and logs when the edited config is invalid", () => {
        const { themeAbs, configAbs, logger, server } = setup();
        const cssPath = join(tmp, "src/theme/theme.css");
        const before = readFileSync(cssPath, "utf8");

        writeFileSync(configAbs, JSON.stringify({ breakpoint: ["xl"] }));
        server.watcher.handlers.get("change")?.(configAbs);
        vi.advanceTimersByTime(200);

        expect(logger.error).toHaveBeenCalledWith(
          expect.stringMatching(
            /Cannot reload config, keeping the previous one:\n\[style-gen-vite\] Invalid config \(style-gen\.config\.json\):\n[^]*breakpoint/,
          ),
        );
        expect(server.ws.send).not.toHaveBeenCalled();
        expect(existsSync(join(tmp, "styles"))).toBe(false);
        expect(readFileSync(cssPath, "utf8")).toBe(before);

        // The last valid target still serves theme edits.
        writeFileSync(
          themeAbs,
          JSON.stringify({
            ...minimalTheme,
            colors: { ...minimalTheme.colors, primary: "#FF00FF" },
          }),
          "utf8",
        );
        server.watcher.handlers.get("change")?.(themeAbs);
        vi.advanceTimersByTime(200);
        expect(readFileSync(cssPath, "utf8")).toMatch(/#FF00FF/);
      });

      it("reloads when the config file is replaced (add) or removed (unlink)", () => {
        const { configAbs, logger, server } = setup();

        writeConfig({ output: "gen/theme.css" });
        server.watcher.handlers.get("add")?.(configAbs);
        vi.advanceTimersByTime(200);
        expect(existsSync(join(tmp, "gen/theme.css"))).toBe(true);

        // Without the file the defaults apply: `styles/theme.json` is absent.
        unlinkSync(configAbs);
        server.watcher.handlers.get("unlink")?.(configAbs);
        vi.advanceTimersByTime(200);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringMatching(/Re-emit failed:/),
        );
      });

      it("ignores add and unlink events of other files", () => {
        const { server } = setup();
        server.watcher.handlers.get("add")?.(join(tmp, "src/random.tsx"));
        server.watcher.handlers.get("unlink")?.(join(tmp, "src/random.tsx"));
        vi.advanceTimersByTime(200);

        expect(server.ws.send).not.toHaveBeenCalled();
      });

      it("never restarts the server", () => {
        const { configAbs, server } = setup();
        const restart = vi.fn();
        Object.assign(server, { restart });

        writeConfig({ output: "gen/theme.css" });
        server.watcher.handlers.get("change")?.(configAbs);
        vi.advanceTimersByTime(200);

        expect(restart).not.toHaveBeenCalled();
      });
    });

    // Phase 03c: chokidar 3 (bundled by every Vite) closes the watch of a file
    // on `unlink`, so without a re-arm a removed theme or config is never seen
    // again; on Linux a theme re-created right away yields only a bare
    // `unlink` (no `add`, no `change`).
    describe("re-arming a removed theme or config (03c)", () => {
      const recolor = (themeAbs: string, color: string): void => {
        writeFileSync(
          themeAbs,
          JSON.stringify({
            ...minimalTheme,
            colors: { ...minimalTheme.colors, primary: color },
          }),
          "utf8",
        );
      };
      const expectRearmed = (server: StubServer, file: string): void => {
        expect(server.watcher.unwatch.mock.calls).toEqual([[file]]);
        expect(server.watcher.add.mock.calls).toEqual([[file]]);
        expect(server.watcher.unwatch.mock.invocationCallOrder[0]).toBeLessThan(
          server.watcher.add.mock.invocationCallOrder[0] ?? 0,
        );
      };

      it("re-arms the theme on unlink with unwatch then add", () => {
        const { themeAbs, server } = setup();
        server.watcher.add.mockClear();
        unlinkSync(themeAbs);

        server.watcher.handlers.get("unlink")?.(themeAbs);

        expectRearmed(server, themeAbs);
      });

      it("re-arms the theme a reloaded config moved to, not the old one", () => {
        const { server } = setup();
        const moved = writeTheme("other/theme.json");
        const configAbs = writeConfig({ theme: "other/theme.json" });
        server.watcher.handlers.get("change")?.(configAbs);
        vi.advanceTimersByTime(200);
        server.watcher.add.mockClear();

        server.watcher.handlers.get("unlink")?.(moved);

        expectRearmed(server, moved);
      });

      it.each([["style-gen.config.json"], ["package.json"]])(
        "re-arms the config candidate %s on unlink with unwatch then add",
        (name) => {
          const { server } = setup();
          server.watcher.add.mockClear();
          const file = join(tmp, name);

          server.watcher.handlers.get("unlink")?.(file);

          expectRearmed(server, file);
        },
      );

      it("does not re-arm a file it does not watch", () => {
        const { server } = setup();
        server.watcher.add.mockClear();

        server.watcher.handlers.get("unlink")?.(join(tmp, "src/random.tsx"));

        expect(server.watcher.unwatch).not.toHaveBeenCalled();
        expect(server.watcher.add).not.toHaveBeenCalled();
      });

      it("re-emits and reloads on a theme `add`", () => {
        const { themeAbs, server } = setup();
        recolor(themeAbs, "#ABCDEF");

        server.watcher.handlers.get("add")?.(themeAbs);
        vi.advanceTimersByTime(200);

        expect(readFileSync(join(tmp, "src/theme/theme.css"), "utf8")).toMatch(
          /#ABCDEF/,
        );
        expect(server.ws.send).toHaveBeenCalledExactlyOnceWith({
          type: "full-reload",
          path: "*",
        });
      });

      it("re-emits after an `unlink` of a theme that exists again (a bare `unlink`, no `add`)", () => {
        const { themeAbs, server } = setup();
        recolor(themeAbs, "#123456");

        server.watcher.handlers.get("unlink")?.(themeAbs);
        vi.advanceTimersByTime(199);
        expect(server.ws.send).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);

        expect(readFileSync(join(tmp, "src/theme/theme.css"), "utf8")).toMatch(
          /#123456/,
        );
        expect(server.ws.send).toHaveBeenCalledExactlyOnceWith({
          type: "full-reload",
          path: "*",
        });
      });

      it("emits once for an `unlink` followed by an `add`", () => {
        const { themeAbs, server } = setup();
        recolor(themeAbs, "#654321");

        server.watcher.handlers.get("unlink")?.(themeAbs);
        server.watcher.handlers.get("add")?.(themeAbs);
        vi.advanceTimersByTime(200);

        expect(server.ws.send).toHaveBeenCalledOnce();
      });

      it("neither emits nor logs when the theme stays removed", () => {
        const { themeAbs, logger, server } = setup();
        const cssPath = join(tmp, "src/theme/theme.css");
        const before = readFileSync(cssPath, "utf8");
        vi.mocked(emitTheme).mockClear();
        unlinkSync(themeAbs);

        server.watcher.handlers.get("unlink")?.(themeAbs);
        vi.advanceTimersByTime(200);

        expect(emitTheme).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
        expect(server.ws.send).not.toHaveBeenCalled();
        expect(readFileSync(cssPath, "utf8")).toBe(before);
      });

      it("neither emits nor logs when the theme is removed again before the debounce fires", () => {
        const { themeAbs, logger, server } = setup();
        vi.mocked(emitTheme).mockClear();

        // Back at the `unlink`, gone again when the schedule fires.
        server.watcher.handlers.get("unlink")?.(themeAbs);
        unlinkSync(themeAbs);
        vi.advanceTimersByTime(200);

        expect(emitTheme).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
      });
    });

    // N-L1: the config moves between `style-gen.config.json` and
    // `package.json#style-gen` while the server runs.
    describe("config candidates", () => {
      const writePackage = (pkg: unknown): string => {
        const file = join(tmp, "package.json");
        writeFileSync(file, JSON.stringify(pkg), "utf8");
        return file;
      };
      const setupWithoutConfig = (pkg?: unknown) => {
        vi.useFakeTimers();
        writeTheme("styles/theme.json");
        if (pkg !== undefined) writePackage(pkg);
        const plugin = styleGenVite();
        const logger = makeLogger();
        start(plugin, serveConfig(logger));
        const server = makeServer(logger);
        callConfigureServer(plugin, server);
        logger.info.mockClear();
        return { logger, server };
      };

      it("picks up a style-gen section added to package.json when no config exists", () => {
        const { server } = setupWithoutConfig();

        const pkgAbs = writePackage({
          "style-gen": { resetTailwindDefaults: ["colors"] },
        });
        server.watcher.handlers.get("change")?.(pkgAbs);
        vi.advanceTimersByTime(200);

        expect(readFileSync(join(tmp, "styles/theme.css"), "utf8")).toContain(
          "--color-*: initial;",
        );
        expect(server.ws.send).toHaveBeenCalledExactlyOnceWith({
          type: "full-reload",
          path: "*",
        });
      });

      it("lets a style-gen.config.json created later take precedence over package.json#style-gen", () => {
        const { server } = setupWithoutConfig({
          "style-gen": { output: "a.css" },
        });
        expect(existsSync(join(tmp, "a.css"))).toBe(true);

        const configAbs = join(tmp, "style-gen.config.json");
        writeFileSync(configAbs, JSON.stringify({ output: "gen/b.css" }));
        server.watcher.handlers.get("add")?.(configAbs);
        vi.advanceTimersByTime(200);

        expect(existsSync(join(tmp, "gen/b.css"))).toBe(true);
        expect(server.ws.send).toHaveBeenCalledOnce();
      });

      it("ignores package.json events while style-gen.config.json exists (M5: no target resolve)", () => {
        const { logger, server } = setup();
        const pkgAbs = join(tmp, "package.json");
        // Not even valid JSON: a reload would log it.
        writeFileSync(pkgAbs, "{ not json", "utf8");
        vi.mocked(resolvePluginTarget).mockClear();
        vi.mocked(emitTheme).mockClear();
        server.watcher.handlers.get("change")?.(pkgAbs);
        server.watcher.handlers.get("add")?.(pkgAbs);
        vi.advanceTimersByTime(200);

        // `readConfigFile` never reads `package.json` while the config file
        // exists, so a reload would be silent: only the call count shows it.
        expect(resolvePluginTarget).not.toHaveBeenCalled();
        expect(emitTheme).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
        expect(server.ws.send).not.toHaveBeenCalled();
      });

      it("neither reloads nor logs for a package.json change without a style-gen section (M5: no re-emit)", () => {
        const { logger, server } = setupWithoutConfig();

        const pkgAbs = writePackage({ name: "app", dependencies: { a: "1" } });
        vi.mocked(resolvePluginTarget).mockClear();
        vi.mocked(emitTheme).mockClear();
        server.watcher.handlers.get("change")?.(pkgAbs);
        vi.advanceTimersByTime(200);

        // The event is a live candidate, so the target is resolved once; the
        // unchanged target must then skip the emit (which writes only on
        // change, so the files alone cannot tell).
        expect(resolvePluginTarget).toHaveBeenCalledOnce();
        expect(emitTheme).not.toHaveBeenCalled();
        expect(logger.info).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
        expect(server.ws.send).not.toHaveBeenCalled();
      });
    });
  });
});
