import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generate } from "../core/generate";
import type { StyleGeneratorOptions } from "../core/Options";
import type { ThemeConfig } from "../core/themeSchema";
import { createDesignTokens } from "../features/tokens/createDesignTokens";

import { checkTokensModule, emitTheme } from "./themeEmitter";
import type { EmitResult } from "./themeEmitter";
import { renderTokensModule } from "./tokensModule";

const theme: ThemeConfig = {
  colors: { primary: "#0af", surface: "#fff" },
  borderRadius: { md: "6px" },
  shadows: { soft: "0 1px 2px rgb(0 0 0 / 0.1)" },
  themeAxes: { theme: { dark: { colors: { primary: "#07a" } } } },
};

describe("emitTheme", () => {
  let dir: string;
  let themeFile: string;
  let outFile: string;
  let tokensFile: string;

  const writeTheme = (value: unknown): void => {
    fs.writeFileSync(
      themeFile,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  };

  const failed = (r: EmitResult): Extract<EmitResult, { ok: false }> => {
    if (r.ok) throw new Error("expected a failed emit");
    return r;
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-emitter-"));
    themeFile = path.join(dir, "theme.json");
    outFile = path.join(dir, "out", "nested", "theme.css");
    tokensFile = path.join(dir, "out", "nested", "theme.tokens.ts");
    writeTheme(theme);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe("write-if-changed", () => {
    it("creates the output directory and writes exactly what generate() returns", () => {
      const options: StyleGeneratorOptions = { breakpoints: ["md"] };
      const r = emitTheme({ themeFile, outFile, tokensFile, options });

      expect(r).toEqual({
        ok: true,
        outFile,
        tokensFile,
        changed: true,
        cssChanged: true,
        tokensChanged: true,
      });
      expect(fs.readFileSync(outFile, "utf8")).toBe(
        generate(theme, options).css,
      );
    });

    it("writes the tokens module next to the CSS, equal to renderTokensModule", () => {
      const options: StyleGeneratorOptions = { breakpoints: ["md"] };
      emitTheme({ themeFile, outFile, tokensFile, options });

      expect(fs.readFileSync(tokensFile, "utf8")).toBe(
        renderTokensModule(
          createDesignTokens(theme, options).DesignTokens.Web,
          theme.themeAxes,
        ),
      );
    });

    it("reports changed: false on a second identical call and leaves both files alone", () => {
      expect(emitTheme({ themeFile, outFile, tokensFile })).toMatchObject({
        changed: true,
      });
      const before = fs.statSync(outFile);
      const tokensBefore = fs.statSync(tokensFile);

      const second = emitTheme({ themeFile, outFile, tokensFile });

      expect(second).toEqual({
        ok: true,
        outFile,
        tokensFile,
        changed: false,
        cssChanged: false,
        tokensChanged: false,
      });
      const after = fs.statSync(outFile);
      expect(after.ino).toBe(before.ino);
      expect(after.mtimeMs).toBe(before.mtimeMs);
      const tokensAfter = fs.statSync(tokensFile);
      expect(tokensAfter.ino).toBe(tokensBefore.ino);
      expect(tokensAfter.mtimeMs).toBe(tokensBefore.mtimeMs);
    });

    it("reports changed: true again when the theme or the options change the CSS", () => {
      emitTheme({ themeFile, outFile, tokensFile });

      writeTheme({
        ...theme,
        colors: { primary: "#f00", surface: "#fff" },
      });
      expect(emitTheme({ themeFile, outFile, tokensFile })).toMatchObject({
        changed: true,
        cssChanged: true,
        tokensChanged: false,
      });
      expect(fs.readFileSync(outFile, "utf8")).toContain("#f00");

      expect(
        emitTheme({
          themeFile,
          outFile,
          tokensFile,
          options: { resetTailwindDefaults: ["colors"] },
        }),
      ).toMatchObject({ changed: true });
      expect(fs.readFileSync(outFile, "utf8")).toContain("--color-*: initial;");
    });

    it("rewrites the tokens file as well when a key is added", () => {
      emitTheme({ themeFile, outFile, tokensFile });

      writeTheme({
        ...theme,
        colors: { primary: "#0af", surface: "#fff", accent: "#f0f" },
      });

      expect(emitTheme({ themeFile, outFile, tokensFile })).toMatchObject({
        changed: true,
        cssChanged: true,
        tokensChanged: true,
      });
      expect(fs.readFileSync(tokensFile, "utf8")).toContain('"accent"');
    });

    it("rewrites a file whose content was edited by hand", () => {
      emitTheme({ themeFile, outFile, tokensFile });
      fs.writeFileSync(outFile, "/* edited */");
      fs.writeFileSync(tokensFile, "// edited");

      expect(emitTheme({ themeFile, outFile, tokensFile })).toMatchObject({
        changed: true,
        cssChanged: true,
        tokensChanged: true,
      });
      expect(fs.readFileSync(outFile, "utf8")).not.toContain("edited");
      expect(fs.readFileSync(tokensFile, "utf8")).not.toContain("edited");
    });

    it("leaves no temp file behind", () => {
      emitTheme({ themeFile, outFile, tokensFile });
      expect(
        fs
          .readdirSync(path.dirname(outFile))
          .sort((a, b) => a.localeCompare(b)),
      ).toEqual(["theme.css", "theme.tokens.ts"]);
    });
  });

  describe("failures name the stage and write nothing", () => {
    it("read: a missing theme file", () => {
      const missing = path.join(dir, "nope.json");
      const r = failed(emitTheme({ themeFile: missing, outFile, tokensFile }));

      expect(r.stage).toBe("read");
      expect(r.message).toBe(`Theme file not found: ${missing}`);
      expect((r.cause as NodeJS.ErrnoException).code).toBe("ENOENT");
      expect(fs.existsSync(outFile)).toBe(false);
      expect(fs.existsSync(tokensFile)).toBe(false);
    });

    it("read: a directory instead of a file", () => {
      const r = failed(emitTheme({ themeFile: dir, outFile, tokensFile }));

      expect(r.stage).toBe("read");
      expect(r.message).toBe(`Theme path is a directory: ${dir}`);
    });

    it("parse: invalid JSON", () => {
      writeTheme("{ not json");
      const r = failed(emitTheme({ themeFile, outFile, tokensFile }));

      expect(r.stage).toBe("parse");
      expect(r.message).toMatch(
        new RegExp(`^Invalid JSON in ${themeFile.replace(/\./g, "\\.")}: `),
      );
      expect(r.cause).toBeInstanceOf(SyntaxError);
      expect(fs.existsSync(outFile)).toBe(false);
      expect(fs.existsSync(tokensFile)).toBe(false);
    });

    it("theme: an invalid theme, labelled with the file", () => {
      writeTheme({ colors: { primary: "{" } });
      const r = failed(emitTheme({ themeFile, outFile, tokensFile }));

      expect(r.stage).toBe("theme");
      expect(r.message).toContain(`Invalid theme (${themeFile}):\n`);
      expect(r.message).toContain("colors.primary");
      expect(fs.existsSync(outFile)).toBe(false);
      expect(fs.existsSync(tokensFile)).toBe(false);
    });

    it("theme: an unknown theme key", () => {
      writeTheme({ ...theme, colours: {} });
      expect(failed(emitTheme({ themeFile, outFile, tokensFile })).stage).toBe(
        "theme",
      );
    });

    it("options: an unknown option is not labelled an invalid theme", () => {
      const r = failed(
        emitTheme({
          themeFile,
          outFile,
          tokensFile,
          options: { extraSources: ["a"] } as never,
        }),
      );

      expect(r.stage).toBe("options");
      expect(r.message).toMatch(/^Invalid options:\n/);
      expect(r.message).toContain("extraSources");
      expect(r.message).not.toContain("Invalid theme");
    });

    it("options: reported before the theme when both are invalid", () => {
      writeTheme({ colors: { primary: "{" } });
      const r = failed(
        emitTheme({
          themeFile,
          outFile,
          tokensFile,
          options: { resetTailwindDefaults: ["fonts" as never] },
        }),
      );

      expect(r.stage).toBe("options");
    });

    it("cross: resetTailwindDefaults radius with no borderRadius", () => {
      writeTheme({ colors: { primary: "#0af" } });
      const r = failed(
        emitTheme({
          themeFile,
          outFile,
          tokensFile,
          options: { resetTailwindDefaults: ["radius"] },
        }),
      );

      expect(r.stage).toBe("cross");
      expect(r.message).toMatch(/^Invalid theme\/options:\n/);
      expect(r.message).toContain("resetTailwindDefaults.0");
      expect(fs.existsSync(outFile)).toBe(false);
      expect(fs.existsSync(tokensFile)).toBe(false);
    });

    it("write: an output path below a regular file", () => {
      const blocker = path.join(dir, "blocker");
      fs.writeFileSync(blocker, "x");
      const target = path.join(blocker, "theme.css");
      const r = failed(emitTheme({ themeFile, outFile: target, tokensFile }));

      expect(r.stage).toBe("write");
      expect(r.message).toMatch(
        new RegExp(`^Cannot write ${target.replace(/\./g, "\\.")}: `),
      );
    });

    it("write: a tokens path below a regular file names the tokens file", () => {
      const blocker = path.join(dir, "blocker");
      fs.writeFileSync(blocker, "x");
      const target = path.join(blocker, "theme.tokens.ts");
      const r = failed(emitTheme({ themeFile, outFile, tokensFile: target }));

      expect(r.stage).toBe("write");
      expect(r.message).toMatch(
        new RegExp(`^Cannot write ${target.replace(/\./g, "\\.")}: `),
      );
    });

    it("write: an output path that is a directory", () => {
      const asDir = path.join(dir, "taken");
      fs.mkdirSync(asDir);

      expect(
        failed(emitTheme({ themeFile, outFile: asDir, tokensFile })).stage,
      ).toBe("write");
      expect(fs.readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
    });

    it("never throws: a failure after a success leaves the earlier output intact", () => {
      emitTheme({ themeFile, outFile, tokensFile });
      const good = fs.readFileSync(outFile, "utf8");
      const goodTokens = fs.readFileSync(tokensFile, "utf8");

      writeTheme({ colors: { primary: "{" } });
      expect(emitTheme({ themeFile, outFile, tokensFile }).ok).toBe(false);
      expect(fs.readFileSync(outFile, "utf8")).toBe(good);
      expect(fs.readFileSync(tokensFile, "utf8")).toBe(goodTokens);
    });
  });
});

describe("checkTokensModule", () => {
  let dir: string;
  let themeFile: string;
  let outFile: string;
  let tokensFile: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-check-"));
    themeFile = path.join(dir, "theme.json");
    outFile = path.join(dir, "theme.css");
    tokensFile = path.join(dir, "theme.tokens.ts");
    fs.writeFileSync(themeFile, JSON.stringify(theme));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("is ok right after an emit and writes nothing", () => {
    emitTheme({ themeFile, outFile, tokensFile });
    const before = fs.statSync(tokensFile);

    expect(checkTokensModule({ themeFile, tokensFile })).toEqual({ ok: true });

    expect(fs.statSync(tokensFile).mtimeMs).toBe(before.mtimeMs);
  });

  it("is stale after the theme gains a key, and leaves the file untouched", () => {
    emitTheme({ themeFile, outFile, tokensFile });
    const before = fs.statSync(tokensFile);
    const bytes = fs.readFileSync(tokensFile, "utf8");
    fs.writeFileSync(
      themeFile,
      JSON.stringify({
        ...theme,
        colors: { primary: "#0af", surface: "#fff", accent: "#f0f" },
      }),
    );

    const r = checkTokensModule({ themeFile, tokensFile });

    expect(r).toMatchObject({
      ok: false,
      stage: "stale",
      message: `${tokensFile} is out of date. Run: style-gen generate`,
    });
    expect(fs.readFileSync(tokensFile, "utf8")).toBe(bytes);
    expect(fs.statSync(tokensFile).mtimeMs).toBe(before.mtimeMs);
  });

  it("is stale when the file is missing", () => {
    expect(checkTokensModule({ themeFile, tokensFile })).toMatchObject({
      ok: false,
      stage: "stale",
      message: `${tokensFile} does not exist. Run: style-gen generate`,
    });
    expect(fs.existsSync(tokensFile)).toBe(false);
  });

  it("is ok when the file on disk uses CRLF line endings", () => {
    emitTheme({ themeFile, outFile, tokensFile });
    fs.writeFileSync(
      tokensFile,
      fs.readFileSync(tokensFile, "utf8").replace(/\n/g, "\r\n"),
    );

    expect(checkTokensModule({ themeFile, tokensFile })).toEqual({ ok: true });
  });

  it("reports the validation stage of an invalid theme", () => {
    fs.writeFileSync(themeFile, "{ not json");

    expect(checkTokensModule({ themeFile, tokensFile })).toMatchObject({
      ok: false,
      stage: "parse",
    });
  });
});
