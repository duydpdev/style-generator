import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { assertTokensFile, resolveEmitTarget } from "./resolveEmitTarget";

describe("resolveEmitTarget", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), "style-gen-emit-target-")));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("puts theme.tokens.ts beside output by default and forwards the generator options", () => {
    expect(
      resolveEmitTarget(root, {
        theme: "t.json",
        output: "out/o.css",
        breakpoints: ["sm"],
      }),
    ).toEqual({
      themeFile: join(root, "t.json"),
      outFile: join(root, "out/o.css"),
      tokensFile: join(root, "out/theme.tokens.ts"),
      options: { breakpoints: ["sm"] },
    });
  });

  it("honours tokensOutput", () => {
    expect(
      resolveEmitTarget(root, {
        theme: "t.json",
        output: "out/o.css",
        tokensOutput: "gen/t.ts",
      }).tokensFile,
    ).toBe(join(root, "gen/t.ts"));
  });

  it("rejects a tokensOutput outside the root, with the label prefix", () => {
    const config = {
      theme: "t.json",
      output: "o.css",
      tokensOutput: "../x.ts",
    };

    expect(() => resolveEmitTarget(root, config)).toThrow(
      "tokensOutput escapes project root: ../x.ts",
    );
    expect(() => resolveEmitTarget(root, config, "[my-plugin] ")).toThrow(
      "[my-plugin] tokensOutput escapes project root: ../x.ts",
    );
  });

  it.each(["a.d.ts", "a.js"])("rejects tokensOutput %s", (tokensOutput) => {
    expect(() =>
      resolveEmitTarget(root, {
        theme: "t.json",
        output: "o.css",
        tokensOutput,
      }),
    ).toThrow(/tokensOutput must be a \.ts/);
  });

  it("allows a theme outside the root but not an output outside it", () => {
    const project = join(root, "app");
    mkdirSync(project);

    expect(
      resolveEmitTarget(project, { theme: "../theme.json", output: "o.css" })
        .themeFile,
    ).toBe(join(root, "theme.json"));
    expect(() =>
      resolveEmitTarget(project, { theme: "t.json", output: "../o.css" }, "x "),
    ).toThrow("x output escapes project root: ../o.css");
  });
});

describe("assertTokensFile", () => {
  it("prints the shown path instead of the file when given", () => {
    expect(() => {
      assertTokensFile("/abs/keys.js", "--out", "keys.js");
    }).toThrow(
      "--out must be a .ts, .mts or .cts file (not a .d.ts declaration): the output is TypeScript, got keys.js",
    );
  });

  it.each(["a.ts", "a.mts", "a.cts"])("accepts %s", (file) => {
    expect(() => {
      assertTokensFile(file, "x");
    }).not.toThrow();
  });
});
