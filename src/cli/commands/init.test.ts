import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import * as p from "@clack/prompts";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";

import { ThemeSchema } from "../../core/themeSchema";
import { logger } from "../logger";

import { initCommand } from "./init";

const prompts = vi.hoisted(() => ({ cancelled: Symbol("cancelled") }));

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  text: vi.fn(),
  confirm: vi.fn(),
  isCancel: (value: unknown) => value === prompts.cancelled,
}));

/**
 * Pretend stdin is (not) a terminal; `init` prompts only on a TTY.
 * @param {boolean} value - The `process.stdin.isTTY` value
 */
function setTty(value: boolean): void {
  Object.defineProperty(process.stdin, "isTTY", { value, configurable: true });
}

describe("initCommand", () => {
  let tmp: string;
  let origTty: boolean | undefined;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-init-"));
    origTty = process.stdin.isTTY;
    // Non-interactive unless a test opts in.
    setTty(false);
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: origTty,
      configurable: true,
    });
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe("non-interactive", () => {
    it("scaffolds theme.json, its schema and style-gen.config.json, and no generator script", async () => {
      const code = await initCommand(
        {
          theme: "styles/theme.json",
          dark: false,
        },
        tmp,
      );

      expect(code).toBe(0);
      const theme = path.join(tmp, "styles/theme.json");
      const config = path.join(tmp, "style-gen.config.json");

      expect(fs.existsSync(theme)).toBe(true);
      expect(fs.existsSync(path.join(tmp, "plugins"))).toBe(false);
      expect(fs.existsSync(config)).toBe(true);

      // Theme must be valid JSON with colors + typography
      const parsed = JSON.parse(fs.readFileSync(theme, "utf8")) as Record<
        string,
        unknown
      >;
      expect(parsed).toHaveProperty("colors");
      expect(parsed).toHaveProperty("typography");

      // The theme's "$schema" reference resolves to the written JSON Schema
      const schemaPath = path.resolve(
        path.dirname(theme),
        parsed.$schema as string,
      );
      expect(JSON.parse(fs.readFileSync(schemaPath, "utf8"))).toEqual(
        z.toJSONSchema(ThemeSchema),
      );

      // One output location: the theme's directory, shared by script and CLI
      const cfg = JSON.parse(fs.readFileSync(config, "utf8")) as {
        theme: string;
        output: string;
      };
      expect(cfg).toEqual({
        theme: "styles/theme.json",
        output: "styles/theme.css",
      });
    });

    it("includes dark mode variant when dark=true", async () => {
      await initCommand(
        {
          theme: "styles/theme.json",
          dark: true,
        },
        tmp,
      );

      const theme = JSON.parse(
        fs.readFileSync(path.join(tmp, "styles/theme.json"), "utf8"),
      ) as { themeAxes?: { theme?: Record<string, unknown> } };
      expect(theme).toHaveProperty("themeAxes");
      expect(theme.themeAxes?.theme).toHaveProperty("dark");
    });

    it("uses src/ prefix when src directory exists", async () => {
      fs.mkdirSync(path.join(tmp, "src"), { recursive: true });

      expect(await initCommand({}, tmp)).toBe(0);

      expect(fs.existsSync(path.join(tmp, "src/styles/theme.json"))).toBe(true);
      expect(fs.existsSync(path.join(tmp, "src/plugins"))).toBe(false);
    });

    it("returns 1 when files exist (non-interactive safety)", async () => {
      // Pre-create theme
      fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
      fs.writeFileSync(path.join(tmp, "styles/theme.json"), "{}");
      const errorSpy = vi
        .spyOn(logger, "error")
        .mockImplementation(() => undefined);

      const code = await initCommand(
        {
          theme: "styles/theme.json",
          dark: false,
        },
        tmp,
      );

      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(
        "Files already exist. Run interactively to confirm overwrite.",
      );
      expect(fs.readFileSync(path.join(tmp, "styles/theme.json"), "utf8")).toBe(
        "{}",
      );
    });

    it("drops a `plugin` key while keeping the other keys of an existing style-gen.config.json", async () => {
      const infoSpy = vi
        .spyOn(logger, "info")
        .mockImplementation(() => undefined);
      fs.writeFileSync(
        path.join(tmp, "style-gen.config.json"),
        JSON.stringify({
          breakpoints: ["xl"],
          extraSources: ["bg-x"],
          plugin: "old/theme-plugin.ts",
        }),
      );

      await initCommand({ theme: "a/theme.json", dark: false }, tmp);

      const cfg: unknown = JSON.parse(
        fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
      );
      expect(cfg).toEqual({
        theme: "a/theme.json",
        output: "a/theme.css",
        breakpoints: ["xl"],
        extraSources: ["bg-x"],
      });
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining("Removed the `plugin` key"),
      );
    });

    it("merges theme/output into an existing style-gen.config.json without a removal line when it has no `plugin`", async () => {
      const infoSpy = vi
        .spyOn(logger, "info")
        .mockImplementation(() => undefined);
      fs.writeFileSync(
        path.join(tmp, "style-gen.config.json"),
        JSON.stringify({ breakpoints: ["xl"] }),
      );

      await initCommand({ theme: "a/theme.json", dark: false }, tmp);

      const cfg: unknown = JSON.parse(
        fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
      );
      expect(cfg).toEqual({
        theme: "a/theme.json",
        output: "a/theme.css",
        breakpoints: ["xl"],
      });
      expect(infoSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("`plugin` key"),
      );
    });

    it("returns 1 and leaves the file untouched if theme.schema.json already exists", async () => {
      fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
      fs.writeFileSync(path.join(tmp, "styles/theme.schema.json"), '{"x":1}');
      vi.spyOn(logger, "error").mockImplementation(() => undefined);

      expect(await initCommand({ theme: "styles/theme.json" }, tmp)).toBe(1);

      expect(
        fs.readFileSync(path.join(tmp, "styles/theme.schema.json"), "utf8"),
      ).toBe('{"x":1}');
    });

    it("starts from package.json's style-gen section when there is no style-gen.config.json", async () => {
      const infoSpy = vi
        .spyOn(logger, "info")
        .mockImplementation(() => undefined);
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify({
          name: "app",
          "style-gen": { breakpoints: ["xl"], output: "old/theme.css" },
        }),
      );

      await initCommand({ theme: "a/theme.json", dark: false }, tmp);

      const cfg: unknown = JSON.parse(
        fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
      );
      expect(cfg).toEqual({
        theme: "a/theme.json",
        output: "a/theme.css",
        breakpoints: ["xl"],
      });
      expect(infoSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("`plugin` key"),
      );
    });

    it('drops a `plugin` key from package.json["style-gen"] while keeping its other keys', async () => {
      const infoSpy = vi
        .spyOn(logger, "info")
        .mockImplementation(() => undefined);
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify({
          name: "app",
          "style-gen": {
            extraSources: ["bg-x"],
            plugin: "old/theme-plugin.ts",
          },
        }),
      );

      await initCommand({ theme: "a/theme.json", dark: false }, tmp);

      const cfg: unknown = JSON.parse(
        fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
      );
      expect(cfg).toEqual({
        theme: "a/theme.json",
        output: "a/theme.css",
        extraSources: ["bg-x"],
      });
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining("Removed the `plugin` key"),
      );
    });

    it.each([
      ["invalid JSON", "{ nope"],
      ["a JSON array", "[1]"],
    ])(
      "returns 1 before writing anything when style-gen.config.json is %s",
      async (_label, content) => {
        fs.writeFileSync(path.join(tmp, "style-gen.config.json"), content);
        const errorSpy = vi
          .spyOn(logger, "error")
          .mockImplementation(() => undefined);

        const code = await initCommand(
          { theme: "a/theme.json", dark: false },
          tmp,
        );

        expect(code).toBe(1);
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringMatching(/^style-gen\.config\.json .*Cannot merge/),
        );
        expect(fs.existsSync(path.join(tmp, "a"))).toBe(false);
        expect(
          fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
        ).toBe(content);
      },
    );

    it("returns 1 and writes nothing when the theme path escapes the project root", async () => {
      const errorSpy = vi
        .spyOn(logger, "error")
        .mockImplementation(() => undefined);

      expect(await initCommand({ theme: "../outside/theme.json" }, tmp)).toBe(
        1,
      );

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("theme escapes project root: "),
      );
      expect(fs.readdirSync(tmp)).toEqual([]);
    });

    describe("stack detection", () => {
      let out: () => string;

      beforeEach(() => {
        const info = vi
          .spyOn(logger, "info")
          .mockImplementation(() => undefined);
        const log = vi.spyOn(logger, "log").mockImplementation(() => undefined);
        vi.spyOn(logger, "success").mockImplementation(() => undefined);
        out = () =>
          [...info.mock.calls, ...log.mock.calls].map((c) => c[0]).join("\n");
      });

      const setup = (files: string[], dirs: string[] = []): void => {
        for (const dir of dirs) {
          fs.mkdirSync(path.join(tmp, dir), { recursive: true });
        }
        for (const file of files) fs.writeFileSync(path.join(tmp, file), "");
      };
      const config = (): unknown =>
        JSON.parse(
          fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
        );

      it("vite: prints the no-argument styleGenVite() snippet and the import for src/index.css", async () => {
        setup(["vite.config.ts"], ["src"]);
        expect(await initCommand({}, tmp)).toBe(0);
        expect(out()).toContain(
          '// vite.config.ts\nimport { defineConfig } from "vite";',
        );
        expect(out()).toContain("  plugins: [styleGenVite(), tailwindcss()],");
        expect(out()).toContain(
          '@import "tailwindcss";\n@import "./styles/theme.css";',
        );
        expect(config()).toEqual({
          theme: "src/styles/theme.json",
          output: "src/styles/theme.css",
        });
        expect(fs.existsSync(path.join(tmp, "src/plugins"))).toBe(false);
        expect(fs.readFileSync(path.join(tmp, "vite.config.ts"), "utf8")).toBe(
          "",
        );
      });

      it("next: wraps the config with styleGenNext() and imports from app/globals.css", async () => {
        setup(["next.config.ts"], ["app"]);
        expect(await initCommand({}, tmp)).toBe(0);
        expect(out()).toContain('import type { NextConfig } from "next";');
        expect(out()).toContain("export default styleGenNext()(nextConfig);");
        expect(out()).toContain(
          '@import "tailwindcss";\n@import "../styles/theme.css";',
        );
        expect(config()).toEqual({
          theme: "styles/theme.json",
          output: "styles/theme.css",
        });
        expect(fs.readFileSync(path.join(tmp, "next.config.ts"), "utf8")).toBe(
          "",
        );
      });

      it("next: a JavaScript config gets the JSDoc-typed snippet", async () => {
        setup(["next.config.mjs"], ["app"]);
        expect(await initCommand({}, tmp)).toBe(0);
        expect(out()).toContain("// next.config.mjs");
        expect(out()).toContain('/** @type {import("next").NextConfig} */');
        expect(out()).not.toContain("import type");
      });

      it("nuxt 4: scaffolds under app/assets/css and passes absolute paths", async () => {
        setup(["nuxt.config.ts"], ["app"]);
        expect(await initCommand({}, tmp)).toBe(0);
        expect(config()).toEqual({
          theme: "app/assets/css/theme.json",
          output: "app/assets/css/theme.css",
        });
        expect(out()).toContain(
          'new URL("./app/assets/css/theme.json", import.meta.url)',
        );
        expect(out()).toContain(
          'outDir: fileURLToPath(new URL("./app/assets/css", import.meta.url)),',
        );
        expect(out()).toContain(
          "options: {}, // style-gen.config.json is NOT read when paths are passed; put generate() options here",
        );
        expect(out()).toContain(
          "that file then serves only the CLI (generate, doctor, tokens)",
        );
        expect(out()).toContain('css: ["~/assets/css/main.css"],');
        expect(out()).toContain(
          '@import "tailwindcss";\n@import "./theme.css";',
        );
      });

      it("nuxt without app/: scaffolds under assets/css", async () => {
        setup(["nuxt.config.ts"]);
        expect(await initCommand({}, tmp)).toBe(0);
        expect(config()).toEqual({
          theme: "assets/css/theme.json",
          output: "assets/css/theme.css",
        });
      });

      it("nuxt: --theme moves both snippet paths", async () => {
        setup(["nuxt.config.ts"], ["app"]);
        expect(await initCommand({ theme: "app/tokens/theme.json" }, tmp)).toBe(
          0,
        );
        expect(out()).toContain(
          'new URL("./app/tokens/theme.json", import.meta.url)',
        );
        expect(out()).toContain('new URL("./app/tokens", import.meta.url)');
      });

      it("nuxt: warns and still exits 0 when the theme is outside app/", async () => {
        setup(["nuxt.config.ts"], ["app"]);
        const warn = vi
          .spyOn(logger, "warn")
          .mockImplementation(() => undefined);
        expect(await initCommand({ theme: "styles/theme.json" }, tmp)).toBe(0);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]?.[0]).toContain(
          "styles/theme.css is outside app/",
        );
      });

      it("nuxt: no warning for the default location under app/", async () => {
        setup(["nuxt.config.ts"], ["app"]);
        const warn = vi
          .spyOn(logger, "warn")
          .mockImplementation(() => undefined);
        expect(await initCommand({}, tmp)).toBe(0);
        expect(warn).not.toHaveBeenCalled();
      });

      it("stores and prints an absolute --theme inside the root as a relative POSIX path", async () => {
        setup(["vite.config.ts"], ["src"]);
        const abs = path.join(tmp, "src", "styles", "theme.json");
        expect(await initCommand({ theme: abs }, tmp)).toBe(0);
        expect(config()).toEqual({
          theme: "src/styles/theme.json",
          output: "src/styles/theme.css",
        });
        expect(out()).not.toContain(tmp);
      });

      it("escapes a quote and keeps a space in every printed string literal", async () => {
        setup(["nuxt.config.ts"], ["app"]);
        expect(
          await initCommand({ theme: 'app/my "x" dir/theme.json' }, tmp),
        ).toBe(0);
        expect(out()).toContain(
          'new URL("./app/my \\"x\\" dir/theme.json", import.meta.url)',
        );
        expect(out()).toContain(
          'new URL("./app/my \\"x\\" dir", import.meta.url)',
        );
        expect(out()).toContain('@import "../../my \\"x\\" dir/theme.css";');
      });

      it("prefers next.config.* over a vite.config.* kept for tests", async () => {
        setup(["vite.config.ts", "next.config.ts"], ["app"]);
        expect(await initCommand({}, tmp)).toBe(0);
        expect(out()).toContain("styleGenNext()");
        expect(out()).not.toContain("styleGenVite");
      });

      it("none: prints the style-gen generate fallback and no bundler snippet", async () => {
        expect(await initCommand({}, tmp)).toBe(0);
        expect(out()).toContain("yarn style-gen generate");
        expect(out()).not.toContain("styleGen");
        expect(out()).toContain(
          '@import "tailwindcss";\n@import "./theme.css";',
        );
        expect(fs.existsSync(path.join(tmp, "plugins"))).toBe(false);
      });
    });
  });

  describe("interactive", () => {
    beforeEach(() => {
      setTty(true);
    });

    it("returns 0 and writes nothing when a prompt is cancelled", async () => {
      vi.mocked(p.text).mockResolvedValueOnce(prompts.cancelled);

      expect(await initCommand({}, tmp)).toBe(0);

      expect(p.cancel).toHaveBeenCalledWith("Operation cancelled.");
      expect(fs.readdirSync(tmp)).toEqual([]);
    });

    it("returns 0 and keeps existing files when the overwrite is declined", async () => {
      fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
      fs.writeFileSync(path.join(tmp, "styles/theme.json"), "{}");
      vi.mocked(p.text).mockResolvedValueOnce("styles/theme.json");
      vi.mocked(p.confirm)
        .mockResolvedValueOnce(false) // dark mode
        .mockResolvedValueOnce(false); // overwrite
      const infoSpy = vi
        .spyOn(logger, "info")
        .mockImplementation(() => undefined);

      expect(await initCommand({}, tmp)).toBe(0);

      expect(infoSpy).toHaveBeenCalledWith(
        "Operation cancelled. Existing files kept.",
      );
      expect(fs.readFileSync(path.join(tmp, "styles/theme.json"), "utf8")).toBe(
        "{}",
      );
      expect(fs.existsSync(path.join(tmp, "plugins"))).toBe(false);
    });

    it("returns 0 when the overwrite prompt itself is cancelled", async () => {
      fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
      fs.writeFileSync(path.join(tmp, "styles/theme.json"), "{}");
      vi.mocked(p.text).mockResolvedValueOnce("styles/theme.json");
      vi.mocked(p.confirm)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(prompts.cancelled);

      expect(await initCommand({}, tmp)).toBe(0);

      expect(p.cancel).toHaveBeenCalledWith("Operation cancelled.");
      expect(fs.readFileSync(path.join(tmp, "styles/theme.json"), "utf8")).toBe(
        "{}",
      );
    });

    it("defaults the theme prompt to the stack's location and asks nothing about a script", async () => {
      setTty(true);
      fs.mkdirSync(path.join(tmp, "app"));
      fs.writeFileSync(path.join(tmp, "nuxt.config.ts"), "");
      vi.mocked(p.text).mockResolvedValueOnce("app/assets/css/theme.json");
      vi.mocked(p.confirm).mockResolvedValueOnce(false); // dark mode
      vi.spyOn(logger, "info").mockImplementation(() => undefined);
      vi.spyOn(logger, "log").mockImplementation(() => undefined);
      vi.spyOn(logger, "success").mockImplementation(() => undefined);

      expect(await initCommand({}, tmp)).toBe(0);

      expect(p.text).toHaveBeenCalledTimes(1);
      expect(p.text).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Theme file location?",
          initialValue: "app/assets/css/theme.json",
        }),
      );
    });
  });
});
