import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { assertTokensFile, resolveEmitTarget } from "./resolveEmitTarget";
import { isCaseInsensitiveDir } from "./sameFile";

/** The tmp filesystem ignores case: the real-filesystem case tests run only there. */
const caseInsensitiveTmp = ((): boolean => {
  const probe = realpathSync(
    mkdtempSync(join(tmpdir(), "style-gen-emit-probe-")),
  );
  try {
    return isCaseInsensitiveDir(probe);
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
})();

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

  it("rejects an output that is the tokens module (N-M1)", () => {
    expect(() =>
      resolveEmitTarget(
        root,
        { theme: "t.json", output: "gen/theme.tokens.ts" },
        "[p] ",
      ),
    ).toThrow(
      `[p] output and tokens file (theme.tokens.ts beside output) must be different files, both resolve to ${join(root, "gen/theme.tokens.ts")}`,
    );
    expect(() =>
      resolveEmitTarget(root, {
        theme: "t.json",
        output: "o.ts",
        tokensOutput: "./o.ts",
      }),
    ).toThrow("output and tokensOutput must be different files");
  });

  it("rejects an output that is the theme file (N-M3)", () => {
    expect(() =>
      resolveEmitTarget(root, {
        theme: "styles/t.json",
        output: "styles/./t.json",
      }),
    ).toThrow(
      `theme and output must be different files, both resolve to ${join(root, "styles/t.json")}`,
    );
  });

  it("rejects a tokensOutput that is the theme file (N-M3)", () => {
    expect(() =>
      resolveEmitTarget(root, {
        theme: "t.ts",
        output: "o.css",
        tokensOutput: "t.ts",
      }),
    ).toThrow("theme and tokensOutput must be different files");
  });

  // L5: the integration prefix opens the message once, not before each role.
  it("puts the label prefix once before a collision message (L5)", () => {
    let message = "";
    try {
      resolveEmitTarget(
        root,
        { theme: "styles/t.json", output: "styles/t.json" },
        "[style-gen-vite] ",
      );
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toBe(
      `[style-gen-vite] theme and output must be different files, both resolve to ${join(root, "styles/t.json")}`,
    );
  });

  // M1: one file behind two paths.
  it("rejects an output that reaches the theme through a symlinked directory (M1)", () => {
    mkdirSync(join(root, "styles"));
    writeFileSync(join(root, "styles/theme.json"), "{}");
    symlinkSync(join(root, "styles"), join(root, "link"));

    expect(() =>
      resolveEmitTarget(root, {
        theme: "styles/theme.json",
        output: "link/theme.json",
      }),
    ).toThrow("theme and output must be different files");
  });

  it("rejects a tokensOutput that reaches the CSS through a symlinked directory that does not hold it yet (M1)", () => {
    mkdirSync(join(root, "styles"));
    symlinkSync(join(root, "styles"), join(root, "link"));

    expect(() =>
      resolveEmitTarget(root, {
        theme: "t.json",
        output: "styles/out.ts",
        tokensOutput: "link/out.ts",
      }),
    ).toThrow("output and tokensOutput must be different files");
  });

  it.skipIf(!caseInsensitiveTmp)(
    "rejects an output that differs from the theme only in case (M1, case-insensitive filesystem)",
    () => {
      mkdirSync(join(root, "styles"));
      writeFileSync(join(root, "styles/theme.json"), "{}");

      expect(() =>
        resolveEmitTarget(root, {
          theme: "styles/theme.json",
          output: "styles/Theme.json",
        }),
      ).toThrow("theme and output must be different files");
      expect(() =>
        resolveEmitTarget(root, {
          theme: "t.json",
          output: "styles/out.ts",
          tokensOutput: "styles/OUT.ts",
        }),
      ).toThrow("output and tokensOutput must be different files");
    },
  );

  // L4: an emit target may not be the config file.
  it.each(["style-gen.config.json", "package.json"])(
    "rejects an output that is %s, whether or not it exists (L4)",
    (output) => {
      expect(() =>
        resolveEmitTarget(root, { theme: "t.json", output }),
      ).toThrow(
        `output and ${output} must be different files, both resolve to ${join(root, output)}`,
      );
    },
  );

  it("rejects a theme that is a config file (L4)", () => {
    expect(() =>
      resolveEmitTarget(root, { theme: "package.json", output: "o.css" }),
    ).toThrow("theme and package.json must be different files");
  });

  it("accepts a project root that holds neither config file (A14)", () => {
    expect(
      resolveEmitTarget(root, { theme: "t.json", output: "o.css" }).outFile,
    ).toBe(join(root, "o.css"));
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
