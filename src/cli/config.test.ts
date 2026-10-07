import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  normalizePath,
  readConfigFile,
  resolveConfig,
  toGeneratorOptions,
} from "./config";

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

  it("returns defaults when no file config exists, with no generator script", () => {
    const config = resolveConfig({});
    expect(config.theme).toBe("styles/theme.json");
    expect(config.output).toBe("styles/theme.css");
    expect(config.plugin).toBeUndefined();
  });

  it("merges style-gen.config.json when present", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ theme: "custom/theme.json", output: "custom/out.txt" }),
    );

    const config = resolveConfig({});
    expect(config.theme).toBe("custom/theme.json");
    expect(config.output).toBe("custom/out.txt");
    expect(config.plugin).toBeUndefined();
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

  it("falls back to defaults on a malformed style-gen.config.json and reports it", () => {
    fs.writeFileSync(path.join(tmp, "style-gen.config.json"), "not json{{{");

    expect(resolveConfig({}).theme).toBe("styles/theme.json");
    const file = readConfigFile(tmp);
    expect(file.source).toBe("style-gen.config.json");
    expect(file.error).toMatch(/style-gen\.config\.json is not valid JSON/);
  });

  it("falls back to defaults on a malformed package.json and reports it", () => {
    fs.writeFileSync(path.join(tmp, "package.json"), "broken json!!!");

    expect(resolveConfig({}).theme).toBe("styles/theme.json");
    expect(readConfigFile(tmp).error).toMatch(
      /package\.json is not valid JSON/,
    );
  });

  it("reports a non-object config instead of merging it", () => {
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "test", "style-gen": "styles/theme.json" }),
    );

    expect(resolveConfig({}).theme).toBe("styles/theme.json");
    expect(readConfigFile(tmp).error).toMatch(
      /package\.json "style-gen" must be a JSON object/,
    );
  });

  it("reports a style-gen.config.json that is not a JSON object", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify(["styles/theme.json"]),
    );

    expect(resolveConfig({}).theme).toBe("styles/theme.json");
    expect(readConfigFile(tmp).error).toBe(
      "style-gen.config.json must contain a JSON object",
    );
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

  it("passes through extraSources/spacing/typography from style-gen.config.json", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({
        extraSources: ["hover:bg-primary"],
        spacing: { enabled: false },
        typography: { cssVarDriven: true },
      }),
    );

    const config = resolveConfig({});
    expect(config.extraSources).toEqual(["hover:bg-primary"]);
    expect(config.spacing).toEqual({ enabled: false });
    expect(config.typography).toEqual({ cssVarDriven: true });
  });

  it("accepts the array form of spacing.properties from style-gen.config.json", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ spacing: { properties: { inset: ["top", "bottom"] } } }),
    );

    const config = resolveConfig({});

    expect(config.spacing).toEqual({
      properties: { inset: ["top", "bottom"] },
    });
  });

  it("CLI-flag-style extraSources/spacing/typography override file config", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ extraSources: ["file-only"] }),
    );

    const config = resolveConfig({ extraSources: ["flag-wins"] });
    expect(config.extraSources).toEqual(["flag-wins"]);
  });

  it("accepts `coverage` from style-gen.config.json and forwards it to generate() options", () => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({
        coverage: { colors: false, borderRadius: { prefixes: ["rounded"] } },
      }),
    );

    const file = readConfigFile(tmp);
    expect(file.issues).toBeUndefined();
    expect(toGeneratorOptions(resolveConfig({}, file)).coverage).toEqual({
      colors: false,
      borderRadius: { prefixes: ["rounded"] },
    });
  });
});

describe("readConfigFile schema validation (X-04)", () => {
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

  const writeConfig = (cfg: unknown): void => {
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify(cfg),
    );
  };

  it.each([
    [{ breakpoint: ["xl"], outptu: "x.css" }, /^breakpoint → /m],
    [
      { coverage: { colors: { prefixes: ["bgg"] } } },
      /^coverage\.colors\.prefixes\.0 → /m,
    ],
    [{ coverage: { color: false } }, /^coverage\.color → Unrecognized key/m],
    [{ theme: 123 }, /^theme → /m],
    [{ breakpoints: "md" }, /^breakpoints → /m],
    [{ breakpoints: ["tablet"] }, /^breakpoints\.0 → /m],
    [
      { typography: { cssVarDriven: "false" } },
      /^typography\.cssVarDriven → /m,
    ],
  ])("reports %o as issues and merges nothing", (cfg, line) => {
    writeConfig(cfg);
    const file = readConfigFile(tmp);
    expect(file.issues).toMatch(line);
    expect(file.config).toEqual({});
    expect(file.source).toBe("style-gen.config.json");
  });

  it('validates package.json["style-gen"] the same way', () => {
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "x", "style-gen": { outptu: "x.css" } }),
    );
    const file = readConfigFile(tmp);
    expect(file.issues).toMatch(/^outptu → /m);
    expect(file.source).toBe("package.json");
  });

  it("accepts every option key, including enableResponsive", () => {
    const cfg = {
      theme: "a/theme.json",
      output: "a/theme.css",
      plugin: "p.ts",
      breakpoints: ["md"],
      screens: { md: "800px" },
      enableResponsive: false,
      spacing: { enabled: true },
      typography: { cssVarDriven: true },
      extraSources: ["bg-x"],
    };
    writeConfig(cfg);
    const file = readConfigFile(tmp);
    expect(file.issues).toBeUndefined();
    expect(file.config).toEqual(cfg);
  });

  it("accepts the editor $schema key", () => {
    writeConfig({ $schema: "./node_modules/x.json", breakpoints: ["md"] });
    expect(readConfigFile(tmp).issues).toBeUndefined();
  });
});
