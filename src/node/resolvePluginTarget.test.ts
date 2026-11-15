import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  parsePluginRootOptions,
  resolvePluginTarget,
} from "./resolvePluginTarget";

describe("resolvePluginTarget", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), "style-gen-target-")));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("uses the default paths when there is no config file", () => {
    expect(resolvePluginTarget(root, "x")).toEqual({
      target: {
        themeFile: join(root, "styles/theme.json"),
        outFile: join(root, "styles/theme.css"),
        tokensFile: join(root, "styles/theme.tokens.ts"),
        options: {},
      },
      configFile: join(root, "style-gen.config.json"),
    });
  });

  it("reads theme, output and generator options from style-gen.config.json", () => {
    writeFileSync(
      join(root, "style-gen.config.json"),
      JSON.stringify({
        theme: "t.json",
        output: "out/o.css",
        enableResponsive: false,
      }),
    );

    expect(resolvePluginTarget(root, "x")).toEqual({
      target: {
        themeFile: join(root, "t.json"),
        outFile: join(root, "out/o.css"),
        tokensFile: join(root, "out/theme.tokens.ts"),
        options: { enableResponsive: false },
      },
      configFile: join(root, "style-gen.config.json"),
    });
  });

  it("reports package.json as the config file when the config lives in package.json#style-gen", () => {
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ "style-gen": { theme: "pkg/t.json", output: "o.css" } }),
    );

    const { target, configFile } = resolvePluginTarget(root, "x");

    expect(configFile).toBe(join(root, "package.json"));
    expect(target.themeFile).toBe(join(root, "pkg/t.json"));
  });

  it("allows a theme outside the root", () => {
    const project = join(root, "app");
    mkdirSync(project);
    writeFileSync(
      join(project, "style-gen.config.json"),
      JSON.stringify({ theme: "../theme.json", output: "o.css" }),
    );

    expect(resolvePluginTarget(project, "x").target.themeFile).toBe(
      join(root, "theme.json"),
    );
  });

  it("throws the source and the issues of an invalid config", () => {
    writeFileSync(
      join(root, "style-gen.config.json"),
      JSON.stringify({ breakpoint: ["xl"] }),
    );

    expect(() => resolvePluginTarget(root, "my-plugin")).toThrow(
      /^\[my-plugin\] Invalid config \(style-gen\.config\.json\):\n[^]*breakpoint/,
    );
  });

  it("throws for a config file that is not valid JSON", () => {
    writeFileSync(join(root, "style-gen.config.json"), "{");

    expect(() => resolvePluginTarget(root, "x")).toThrow(
      /Invalid config \(style-gen\.config\.json\):\n.*not valid JSON/,
    );
  });

  it("rejects an output outside the root", () => {
    writeFileSync(
      join(root, "style-gen.config.json"),
      JSON.stringify({ output: "../o.css" }),
    );

    expect(() => resolvePluginTarget(root, "x")).toThrow(
      "[x] output escapes project root: ../o.css",
    );
  });

  it("honours tokensOutput and labels its errors with the integration", () => {
    writeFileSync(
      join(root, "style-gen.config.json"),
      JSON.stringify({ tokensOutput: "gen/t.ts" }),
    );
    expect(resolvePluginTarget(root, "x").target.tokensFile).toBe(
      join(root, "gen/t.ts"),
    );

    writeFileSync(
      join(root, "style-gen.config.json"),
      JSON.stringify({ tokensOutput: "../t.ts" }),
    );
    expect(() => resolvePluginTarget(root, "my-plugin")).toThrow(
      "[my-plugin] tokensOutput escapes project root: ../t.ts",
    );
  });
});

describe("parsePluginRootOptions", () => {
  it("accepts no options, an empty object and a root", () => {
    expect(parsePluginRootOptions(undefined, "x")).toEqual({});
    expect(parsePluginRootOptions({}, "x")).toEqual({});
    expect(parsePluginRootOptions({ root: "x" }, "x")).toEqual({ root: "x" });
  });

  it.each(["themePath", "outDir", "options"])(
    "rejects the removed %s key and points to the migration guide",
    (key) => {
      expect(() => parsePluginRootOptions({ [key]: "a" }, "my-plugin")).toThrow(
        new RegExp(
          `^\\[my-plugin\\] Invalid options:\\n[^]*${key}[^]*7\\.x-to-8\\.0`,
        ),
      );
    },
  );

  it("rejects an empty or non-string root", () => {
    expect(() => parsePluginRootOptions({ root: "" }, "x")).toThrow(
      /Invalid options:\n[^]*root/,
    );
    expect(() => parsePluginRootOptions({ root: 1 }, "x")).toThrow(
      /Invalid options:\n[^]*root/,
    );
  });
});
