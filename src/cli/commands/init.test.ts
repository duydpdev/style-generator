import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import * as p from "@clack/prompts";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";

import { ThemeSchema } from "../../core/themeSchema";
import { StyleGenConfigSchema } from "../../node/loadStyleGenConfig";
import { logger } from "../logger";

import { initCommand, type InitArgs } from "./init";

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

/** The rules file a test build ships (kept outside `tmp`: tests list it). */
const RULES =
  "<!-- @duydpdev/style-generator 0.0.0-test -->\n\n# Agent contract\n";
const RULES_FILE = ".claude/rules/style-generator.md";

describe("initCommand", () => {
  let tmp: string;
  let rulesDir: string;
  let rulesSrc: string;
  let origTty: boolean | undefined;

  /**
   * `initCommand` with the test build's rules: from `src/` the default
   * source (the build output's agent folder) does not exist.
   * @param {InitArgs} args - CLI arguments
   * @param {string} cwd - The project root
   * @returns {Promise<number>} The exit code
   */
  const run = (args: InitArgs, cwd: string): Promise<number> =>
    initCommand(args, cwd, rulesSrc);

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-init-"));
    rulesDir = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-rules-"));
    rulesSrc = path.join(rulesDir, "style-generator.md");
    fs.writeFileSync(rulesSrc, RULES);
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
    fs.rmSync(rulesDir, { recursive: true, force: true });
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe("non-interactive", () => {
    it("scaffolds theme.json, its schema and style-gen.config.json, and no generator script", async () => {
      const code = await run(
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
      await run(
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

      expect(await run({}, tmp)).toBe(0);

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

      const code = await run(
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
          typography: { cssVarDriven: true },
          plugin: "old/theme-plugin.ts",
        }),
      );

      await run({ theme: "a/theme.json", dark: false }, tmp);

      const cfg: unknown = JSON.parse(
        fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
      );
      expect(cfg).toEqual({
        theme: "a/theme.json",
        output: "a/theme.css",
        breakpoints: ["xl"],
        typography: { cssVarDriven: true },
      });
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining("Removed the `plugin` key"),
      );
    });

    it("drops the keys removed in 7.0 so the merged config loads, and prints extraSources as @source inline lines", async () => {
      const infoSpy = vi
        .spyOn(logger, "info")
        .mockImplementation(() => undefined);
      const logSpy = vi
        .spyOn(logger, "log")
        .mockImplementation(() => undefined);
      fs.writeFileSync(
        path.join(tmp, "style-gen.config.json"),
        JSON.stringify({
          breakpoints: ["xl"],
          extraSources: ["hover:bg-{primary,secondary}", "md:flex"],
          axes: { scope: "element" },
        }),
      );

      await run({ theme: "a/theme.json", dark: false }, tmp);

      const cfg: unknown = JSON.parse(
        fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
      );
      expect(cfg).toEqual({
        theme: "a/theme.json",
        output: "a/theme.css",
        breakpoints: ["xl"],
      });
      expect(StyleGenConfigSchema.safeParse(cfg).success).toBe(true);
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining("Removed the `extraSources` key"),
      );
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining("Removed the `axes` key"),
      );
      expect(logSpy).toHaveBeenCalledWith(
        '   @source inline("hover:bg-{primary,secondary}");',
      );
      expect(logSpy).toHaveBeenCalledWith('   @source inline("md:flex");');
    });

    it("merges theme/output into an existing style-gen.config.json without a removal line when it has no `plugin`", async () => {
      const infoSpy = vi
        .spyOn(logger, "info")
        .mockImplementation(() => undefined);
      fs.writeFileSync(
        path.join(tmp, "style-gen.config.json"),
        JSON.stringify({ breakpoints: ["xl"] }),
      );

      await run({ theme: "a/theme.json", dark: false }, tmp);

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

      expect(await run({ theme: "styles/theme.json" }, tmp)).toBe(1);

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

      await run({ theme: "a/theme.json", dark: false }, tmp);

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
            typography: { cssVarDriven: true },
            plugin: "old/theme-plugin.ts",
          },
        }),
      );

      await run({ theme: "a/theme.json", dark: false }, tmp);

      const cfg: unknown = JSON.parse(
        fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
      );
      expect(cfg).toEqual({
        theme: "a/theme.json",
        output: "a/theme.css",
        typography: { cssVarDriven: true },
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

        const code = await run({ theme: "a/theme.json", dark: false }, tmp);

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

      expect(await run({ theme: "../outside/theme.json" }, tmp)).toBe(1);

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
        expect(await run({}, tmp)).toBe(0);
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
        expect(await run({}, tmp)).toBe(0);
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
        expect(await run({}, tmp)).toBe(0);
        expect(out()).toContain("// next.config.mjs");
        expect(out()).toContain('/** @type {import("next").NextConfig} */');
        expect(out()).not.toContain("import type");
      });

      it("nuxt 4: scaffolds under app/assets/css and passes the project root", async () => {
        setup(["nuxt.config.ts"], ["app"]);
        expect(await run({}, tmp)).toBe(0);
        expect(config()).toEqual({
          theme: "app/assets/css/theme.json",
          output: "app/assets/css/theme.css",
        });
        expect(out()).toContain(
          'styleGenVite({ root: fileURLToPath(new URL(".", import.meta.url)) })',
        );
        expect(out()).not.toContain("themePath");
        expect(out()).not.toContain("outDir");
        expect(out()).toContain('css: ["~/assets/css/main.css"],');
        expect(out()).toContain(
          '@import "tailwindcss";\n@import "./theme.css";',
        );
        expect(out()).toContain(
          "Commit app/assets/css/theme.tokens.ts and add app/assets/css/theme.css to .gitignore",
        );
      });

      it("nuxt without app/: scaffolds under assets/css", async () => {
        setup(["nuxt.config.ts"]);
        expect(await run({}, tmp)).toBe(0);
        expect(config()).toEqual({
          theme: "assets/css/theme.json",
          output: "assets/css/theme.css",
        });
      });

      it("nuxt: --theme outside app/ prints the same root-only snippet and no warning", async () => {
        setup(["nuxt.config.ts"], ["app"]);
        const warn = vi
          .spyOn(logger, "warn")
          .mockImplementation(() => undefined);
        expect(await run({ theme: "styles/theme.json" }, tmp)).toBe(0);
        expect(warn).not.toHaveBeenCalled();
        expect(out()).toContain("styleGenVite({ root: fileURLToPath(");
      });

      it("stores and prints an absolute --theme inside the root as a relative POSIX path", async () => {
        setup(["vite.config.ts"], ["src"]);
        const abs = path.join(tmp, "src", "styles", "theme.json");
        expect(await run({ theme: abs }, tmp)).toBe(0);
        expect(config()).toEqual({
          theme: "src/styles/theme.json",
          output: "src/styles/theme.css",
        });
        expect(out()).not.toContain(tmp);
      });

      it("escapes a quote and keeps a space in the printed CSS import", async () => {
        setup(["nuxt.config.ts"], ["app"]);
        expect(await run({ theme: 'app/my "x" dir/theme.json' }, tmp)).toBe(0);
        expect(out()).toContain('@import "../../my \\"x\\" dir/theme.css";');
      });

      it("prefers next.config.* over a vite.config.* kept for tests", async () => {
        setup(["vite.config.ts", "next.config.ts"], ["app"]);
        expect(await run({}, tmp)).toBe(0);
        expect(out()).toContain("styleGenNext()");
        expect(out()).not.toContain("styleGenVite");
      });

      it("none: prints the style-gen generate fallback and no bundler snippet", async () => {
        expect(await run({}, tmp)).toBe(0);
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

      expect(await run({}, tmp)).toBe(0);

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

      expect(await run({}, tmp)).toBe(0);

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

      expect(await run({}, tmp)).toBe(0);

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

      expect(await run({}, tmp)).toBe(0);

      expect(p.text).toHaveBeenCalledTimes(1);
      expect(p.text).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Theme file location?",
          initialValue: "app/assets/css/theme.json",
        }),
      );
    });
  });

  describe("agent rules", () => {
    let out: () => string;
    const rulesPath = (): string => path.join(tmp, RULES_FILE);
    const readRules = (): string => fs.readFileSync(rulesPath(), "utf8");
    const writeRules = (content: string): void => {
      fs.mkdirSync(path.dirname(rulesPath()), { recursive: true });
      fs.writeFileSync(rulesPath(), content);
    };

    beforeEach(() => {
      const info = vi.spyOn(logger, "info").mockImplementation(() => undefined);
      const log = vi.spyOn(logger, "log").mockImplementation(() => undefined);
      const success = vi
        .spyOn(logger, "success")
        .mockImplementation(() => undefined);
      out = () =>
        [...info.mock.calls, ...log.mock.calls, ...success.mock.calls]
          .map((c) => c[0])
          .join("\n");
      fs.mkdirSync(path.join(tmp, "src"));
      fs.writeFileSync(path.join(tmp, "vite.config.ts"), "");
    });

    it("writes the shipped rules and prints @source not for .claude", async () => {
      expect(await run({ theme: "src/styles/theme.json" }, tmp)).toBe(0);

      expect(readRules()).toBe(RULES);
      expect(out()).toContain(`Created ${RULES_FILE}`);
      expect(out()).toContain(
        '@import "tailwindcss";\n@import "./styles/theme.css";\n@source not "../.claude";',
      );
    });

    it("leaves an identical copy and says it is up to date", async () => {
      writeRules(RULES);

      expect(await run({ theme: "src/styles/theme.json" }, tmp)).toBe(0);

      expect(out()).toContain(`Rules up to date: ${RULES_FILE}`);
      expect(readRules()).toBe(RULES);
    });

    it("keeps a changed copy when not interactive and says how to update it", async () => {
      writeRules("# edited\n");

      expect(await run({ theme: "src/styles/theme.json" }, tmp)).toBe(0);

      expect(readRules()).toBe("# edited\n");
      expect(out()).toContain(
        "Run `style-gen init --rules-only` in an interactive terminal to replace it.",
      );
      expect(out()).toContain('@source not "../.claude";');
    });

    it("replaces a copy stamped with another version without a terminal", async () => {
      writeRules("<!-- @duydpdev/style-generator 0.0.0-old — x -->\n\nold\n");

      expect(await run({ theme: "src/styles/theme.json" }, tmp)).toBe(0);

      expect(readRules()).toBe(RULES);
      expect(out()).toContain(`Updated ${RULES_FILE} (0.0.0-old → 0.0.0-test)`);
      expect(p.confirm).not.toHaveBeenCalled();
    });

    it("treats a CRLF copy of this version as up to date", async () => {
      writeRules(RULES.replaceAll("\n", "\r\n"));

      expect(await run({ theme: "src/styles/theme.json" }, tmp)).toBe(0);

      expect(out()).toContain(`Rules up to date: ${RULES_FILE}`);
    });

    it("keeps an edited copy of this version without a terminal", async () => {
      const edited = `${RULES}\nLocal note.\n`;
      writeRules(edited);

      expect(await run({ theme: "src/styles/theme.json" }, tmp)).toBe(0);

      expect(readRules()).toBe(edited);
      expect(out()).toContain(`${RULES_FILE} was edited; kept.`);
    });

    describe("--rules-only", () => {
      const theme = (): string => path.join(tmp, "src/styles/theme.json");

      beforeEach(() => {
        fs.mkdirSync(path.dirname(theme()), { recursive: true });
        fs.writeFileSync(theme(), "{}");
      });

      it("refreshes the rules next to an existing theme without a terminal", async () => {
        writeRules("<!-- @duydpdev/style-generator 0.0.0-old — x -->\n");

        expect(await run({ rulesOnly: true }, tmp)).toBe(0);

        expect(readRules()).toBe(RULES);
        expect(fs.readFileSync(theme(), "utf8")).toBe("{}");
        expect(fs.existsSync(path.join(tmp, "style-gen.config.json"))).toBe(
          false,
        );
        // `out()` groups calls by logger method, so check each part.
        expect(out()).toContain(
          "Keep these lines in src/index.css (or the CSS file in src/ that imports Tailwind):",
        );
        expect(out()).toContain(
          '@import "tailwindcss";\n@import "./styles/theme.css";\n@source not "../.claude";',
        );
      });

      it("reads the generated CSS path from style-gen.config.json", async () => {
        fs.writeFileSync(
          path.join(tmp, "style-gen.config.json"),
          JSON.stringify({
            theme: "src/styles/theme.json",
            output: "src/gen/theme.css",
          }),
        );

        expect(await run({ rulesOnly: true }, tmp)).toBe(0);

        expect(out()).toContain('@import "./gen/theme.css";');
      });

      it("never opens the wizard", async () => {
        setTty(true);

        expect(await run({ rulesOnly: true }, tmp)).toBe(0);

        expect(p.text).not.toHaveBeenCalled();
        expect(readRules()).toBe(RULES);
      });

      it.each<InitArgs>([
        { rulesOnly: true, theme: "src/styles/theme.json" },
        { rulesOnly: true, dark: true },
        { rulesOnly: true, skipRules: true },
      ])("rejects %o", async (args) => {
        const error = vi
          .spyOn(logger, "error")
          .mockImplementation(() => undefined);

        expect(await run(args, tmp)).toBe(1);

        expect(error).toHaveBeenCalledWith(
          "--rules-only cannot be combined with --theme, --dark or --skip-rules.",
        );
        expect(fs.existsSync(path.join(tmp, ".claude"))).toBe(false);
      });
    });

    it("replaces a changed copy after an interactive confirm", async () => {
      setTty(true);
      writeRules("# edited\n");
      vi.mocked(p.confirm).mockResolvedValueOnce(true);

      expect(await run({ theme: "src/styles/theme.json" }, tmp)).toBe(0);

      expect(readRules()).toBe(RULES);
      expect(out()).toContain(`Updated ${RULES_FILE}`);
    });

    it("keeps a changed copy and still prints the next steps when the confirm is cancelled", async () => {
      setTty(true);
      writeRules("# edited\n");
      vi.mocked(p.confirm).mockResolvedValueOnce(prompts.cancelled);

      expect(await run({ theme: "src/styles/theme.json" }, tmp)).toBe(0);

      expect(readRules()).toBe("# edited\n");
      expect(p.cancel).not.toHaveBeenCalled();
      expect(out()).toContain(`Kept ${RULES_FILE}`);
      expect(out()).toContain('@source not "../.claude";');
    });

    it("--skip-rules writes no rules and prints no @source not", async () => {
      expect(
        await run({ theme: "src/styles/theme.json", skipRules: true }, tmp),
      ).toBe(0);

      expect(fs.existsSync(path.join(tmp, ".claude"))).toBe(false);
      expect(out()).not.toContain("@source not");
    });

    it("--skip-rules alone still opens the wizard", async () => {
      setTty(true);
      vi.mocked(p.text).mockResolvedValueOnce("src/styles/theme.json");
      vi.mocked(p.confirm).mockResolvedValueOnce(false); // dark mode

      expect(await run({ skipRules: true }, tmp)).toBe(0);

      expect(p.text).toHaveBeenCalledTimes(1);
      expect(fs.existsSync(path.join(tmp, ".claude"))).toBe(false);
    });

    it("refreshes the rules when an existing theme is kept", async () => {
      setTty(true);
      fs.mkdirSync(path.join(tmp, "src/styles"), { recursive: true });
      fs.writeFileSync(path.join(tmp, "src/styles/theme.json"), "{}");
      vi.mocked(p.confirm).mockResolvedValueOnce(false); // theme overwrite

      expect(await run({ theme: "src/styles/theme.json" }, tmp)).toBe(0);

      expect(
        fs.readFileSync(path.join(tmp, "src/styles/theme.json"), "utf8"),
      ).toBe("{}");
      expect(readRules()).toBe(RULES);
      // An upgrade re-run is when the app first needs the @source not line.
      expect(out()).toContain(
        '@import "tailwindcss";\n@import "./styles/theme.css";\n@source not "../.claude";',
      );
    });

    it("warns and still exits 0 when the build ships no rules", async () => {
      const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);

      // The default source: from src/ it does not exist.
      expect(await initCommand({ theme: "src/styles/theme.json" }, tmp)).toBe(
        0,
      );

      expect(warn).toHaveBeenCalledWith(
        `This build ships no agent rules; ${RULES_FILE} not written.`,
      );
      expect(fs.existsSync(path.join(tmp, ".claude"))).toBe(false);
      expect(out()).not.toContain("@source not");
    });
  });
});
