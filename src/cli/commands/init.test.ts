import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

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

  it("scaffolds theme.json, plugin file, and style-gen.config.json", async () => {
    await initCommand({
      tw: "v4",
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

    // Plugin file must import createStyleSystem
    const pluginSrc = fs.readFileSync(plugin, "utf8");
    expect(pluginSrc).toMatch(/createStyleSystem|createStylePlugin/);
    expect(pluginSrc).toMatch(/@duydpdev\/style-generator/);

    // Config must point at the scaffolded files
    const cfg = JSON.parse(fs.readFileSync(config, "utf8")) as {
      theme: string;
      plugin: string;
    };
    expect(cfg.theme).toBe("styles/theme.json");
    expect(cfg.plugin).toBe("plugins/theme-plugin.ts");
  });

  it("includes dark mode variant when dark=true", async () => {
    await initCommand({
      tw: "v4",
      theme: "styles/theme.json",
      plugin: "plugins/theme-plugin.ts",
      dark: true,
    });

    const theme = JSON.parse(
      fs.readFileSync(path.join(tmp, "styles/theme.json"), "utf8"),
    ) as { themes?: Record<string, unknown> };
    expect(theme).toHaveProperty("themes");
    expect(theme.themes).toHaveProperty("dark");
  });

  it("uses src/ prefix when src directory exists", async () => {
    fs.mkdirSync(path.join(tmp, "src"), { recursive: true });

    await initCommand({ tw: "v4" });

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
        tw: "v4",
        theme: "styles/theme.json",
        plugin: "plugins/theme-plugin.ts",
        dark: false,
      }),
    ).rejects.toThrow("__exit__");

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
