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

    it("adds the theme and the config file to the dev watcher (a theme outside root is not watched otherwise)", () => {
      const { themeAbs, configAbs, server } = setup();
      expect(server.watcher.add.mock.calls).toEqual([[themeAbs], [configAbs]]);
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
  });
});
