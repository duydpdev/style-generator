import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { normalizePath, resolveConfig } from "./config";

describe("normalizePath", () => {
  it("trims whitespace", () => {
    expect(normalizePath("  styles/theme.json  ")).toBe("styles/theme.json");
  });

  it("strips leading slash for relative-looking paths", () => {
    const result = normalizePath("/styles/theme.json");
    expect(result).not.toMatch(/^\/styles/);
  });

  it("preserves path that starts with cwd", () => {
    const abs = path.join(process.cwd(), "styles/theme.json");
    expect(normalizePath(abs)).toBe(path.normalize(abs));
  });
});

describe("resolveConfig", () => {
  let tmp: string;
  let origCwd: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-config-"));
    origCwd = process.cwd();
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns defaults when no file config exists", () => {
    const config = resolveConfig({});
    expect(config.theme).toBe("styles/theme.json");
    expect(config.output).toBe("styles/theme.css");
    expect(config.plugin).toBe("plugins/theme-plugin.ts");
  });

  it("merges style-gen.config.json when present", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ theme: "custom/theme.json", output: "custom/out.txt" }),
    );

    const config = resolveConfig({});
    expect(config.theme).toBe("custom/theme.json");
    expect(config.output).toBe("custom/out.txt");
    // Default plugin remains
    expect(config.plugin).toBe("plugins/theme-plugin.ts");
  });

  it("falls back to package.json style-gen key", () => {
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({
        name: "test",
        "style-gen": { theme: "pkg/theme.json" },
      }),
    );

    const config = resolveConfig({});
    expect(config.theme).toBe("pkg/theme.json");
  });

  it("CLI flags override file config", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ theme: "file/theme.json" }),
    );

    const config = resolveConfig({ theme: "cli/theme.json" });
    expect(config.theme).toBe("cli/theme.json");
  });

  it("handles malformed style-gen.config.json gracefully", () => {
    fs.writeFileSync(path.join(tmp, "style-gen.config.json"), "not json{{{");

    const config = resolveConfig({});
    // Falls back to defaults
    expect(config.theme).toBe("styles/theme.json");
  });

  it("handles malformed package.json gracefully", () => {
    fs.writeFileSync(path.join(tmp, "package.json"), "broken json!!!");

    const config = resolveConfig({});
    expect(config.theme).toBe("styles/theme.json");
  });

  it("ignores package.json without style-gen key", () => {
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "test", version: "1.0.0" }),
    );

    const config = resolveConfig({});
    expect(config.theme).toBe("styles/theme.json");
  });

  it("sanitizes undefined flag values", () => {
    const config = resolveConfig({
      theme: undefined,
      output: undefined,
      breakpoints: ["sm", "md"],
    });
    expect(config.theme).toBe("styles/theme.json");
    expect(config.breakpoints).toEqual(["sm", "md"]);
  });
});
