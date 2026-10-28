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
    it("scaffolds theme.json, its schema, the generator script and style-gen.config.json", async () => {
      const code = await initCommand(
        {
          theme: "styles/theme.json",
          plugin: "plugins/theme-plugin.ts",
          dark: false,
        },
        tmp,
      );

      expect(code).toBe(0);
      const theme = path.join(tmp, "styles/theme.json");
      const plugin = path.join(tmp, "plugins/theme-plugin.ts");
      const config = path.join(tmp, "style-gen.config.json");

      expect(fs.existsSync(theme)).toBe(true);
      expect(fs.existsSync(plugin)).toBe(true);
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
        plugin: string;
        output: string;
      };
      expect(cfg).toEqual({
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        output: "styles/theme.css",
      });
    });

    it("includes dark mode variant when dark=true", async () => {
      await initCommand(
        {
          theme: "styles/theme.json",
          plugin: "plugins/theme-plugin.ts",
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
      expect(fs.existsSync(path.join(tmp, "src/plugins/theme-plugin.ts"))).toBe(
        true,
      );
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
          plugin: "plugins/theme-plugin.ts",
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

    it("merges theme/plugin/output into an existing style-gen.config.json while keeping its other keys", async () => {
      fs.writeFileSync(
        path.join(tmp, "style-gen.config.json"),
        JSON.stringify({ breakpoints: ["xl"], extraSources: ["bg-x"] }),
      );

      await initCommand(
        { theme: "a/theme.json", plugin: "p.ts", dark: false },
        tmp,
      );

      const cfg: unknown = JSON.parse(
        fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
      );
      expect(cfg).toEqual({
        theme: "a/theme.json",
        plugin: "p.ts",
        output: "a/theme.css",
        breakpoints: ["xl"],
        extraSources: ["bg-x"],
      });
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
      fs.writeFileSync(
        path.join(tmp, "package.json"),
        JSON.stringify({
          name: "app",
          "style-gen": { breakpoints: ["xl"], output: "old/theme.css" },
        }),
      );

      await initCommand(
        { theme: "a/theme.json", plugin: "p.ts", dark: false },
        tmp,
      );

      const cfg: unknown = JSON.parse(
        fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
      );
      expect(cfg).toEqual({
        theme: "a/theme.json",
        plugin: "p.ts",
        output: "a/theme.css",
        breakpoints: ["xl"],
      });
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
          { theme: "a/theme.json", plugin: "p.ts", dark: false },
          tmp,
        );

        expect(code).toBe(1);
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringMatching(/^style-gen\.config\.json .*Cannot merge/),
        );
        expect(fs.existsSync(path.join(tmp, "a"))).toBe(false);
        expect(fs.existsSync(path.join(tmp, "p.ts"))).toBe(false);
        expect(
          fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
        ).toBe(content);
      },
    );

    it.each([
      ["theme", { theme: "../outside/theme.json", plugin: "p.ts" }],
      ["plugin", { theme: "a/theme.json", plugin: "../outside/p.ts" }],
    ])(
      "returns 1 and writes nothing when the %s path escapes the project root",
      async (label, args) => {
        const errorSpy = vi
          .spyOn(logger, "error")
          .mockImplementation(() => undefined);

        expect(await initCommand(args, tmp)).toBe(1);

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining(`${label} escapes project root: `),
        );
        expect(fs.readdirSync(tmp)).toEqual([]);
      },
    );
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
      vi.mocked(p.text)
        .mockResolvedValueOnce("styles/theme.json")
        .mockResolvedValueOnce("plugins/theme-plugin.ts");
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
      vi.mocked(p.text)
        .mockResolvedValueOnce("styles/theme.json")
        .mockResolvedValueOnce("plugins/theme-plugin.ts");
      vi.mocked(p.confirm)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(prompts.cancelled);

      expect(await initCommand({}, tmp)).toBe(0);

      expect(p.cancel).toHaveBeenCalledWith("Operation cancelled.");
      expect(fs.readFileSync(path.join(tmp, "styles/theme.json"), "utf8")).toBe(
        "{}",
      );
    });
  });
});
