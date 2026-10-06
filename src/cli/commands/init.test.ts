import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";

import { ThemeSchema } from "../../core/themeSchema";

import { initCommand } from "./init";

describe("initCommand (non-interactive)", () => {
  let tmp: string;
  let origCwd: string;
  let origTty: boolean | undefined;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-init-"));
    origCwd = process.cwd();
    process.chdir(tmp);
    // Force non-interactive branch
    origTty = process.stdin.isTTY;
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    });
  });

  afterEach(() => {
    process.chdir(origCwd);
    Object.defineProperty(process.stdin, "isTTY", {
      value: origTty,
      configurable: true,
    });
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("scaffolds theme.json, its schema, the generator script and style-gen.config.json", async () => {
    await initCommand({
      theme: "styles/theme.json",
      plugin: "plugins/theme-plugin.ts",
      dark: false,
    });

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
    await initCommand({
      theme: "styles/theme.json",
      plugin: "plugins/theme-plugin.ts",
      dark: true,
    });

    const theme = JSON.parse(
      fs.readFileSync(path.join(tmp, "styles/theme.json"), "utf8"),
    ) as { themeAxes?: { theme?: Record<string, unknown> } };
    expect(theme).toHaveProperty("themeAxes");
    expect(theme.themeAxes?.theme).toHaveProperty("dark");
  });

  it("uses src/ prefix when src directory exists", async () => {
    fs.mkdirSync(path.join(tmp, "src"), { recursive: true });

    await initCommand({});

    expect(fs.existsSync(path.join(tmp, "src/styles/theme.json"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, "src/plugins/theme-plugin.ts"))).toBe(
      true,
    );
  });

  it("exits with code 1 when files exist (non-interactive safety)", async () => {
    // Pre-create theme
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "styles/theme.json"), "{}");

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("__exit__");
    }) as never);

    await expect(
      initCommand({
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        dark: false,
      }),
    ).rejects.toThrow("__exit__");

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("merges theme/plugin/output into an existing style-gen.config.json while keeping its other keys", async () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ breakpoints: ["xl"], extraSources: ["bg-x"] }),
    );

    await initCommand({ theme: "a/theme.json", plugin: "p.ts", dark: false });

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

  it("exits with code 1 and leaves the file untouched if theme.schema.json already exists", async () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "styles/theme.schema.json"), '{"x":1}');
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("__exit__");
    }) as never);

    await expect(initCommand({ theme: "styles/theme.json" })).rejects.toThrow(
      "__exit__",
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
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

    await initCommand({ theme: "a/theme.json", plugin: "p.ts", dark: false });

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
    "exits with code 1 before writing anything when style-gen.config.json is %s",
    async (_label, content) => {
      fs.writeFileSync(path.join(tmp, "style-gen.config.json"), content);
      const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
        throw new Error("__exit__");
      }) as never);
      vi.spyOn(console, "error").mockImplementation(() => undefined);

      await expect(
        initCommand({ theme: "a/theme.json", plugin: "p.ts", dark: false }),
      ).rejects.toThrow("__exit__");

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(fs.existsSync(path.join(tmp, "a"))).toBe(false);
      expect(fs.existsSync(path.join(tmp, "p.ts"))).toBe(false);
      expect(
        fs.readFileSync(path.join(tmp, "style-gen.config.json"), "utf8"),
      ).toBe(content);
    },
  );
});
