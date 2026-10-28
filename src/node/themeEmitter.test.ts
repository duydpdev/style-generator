import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { generate } from "../core/generate";
import type { StyleGeneratorOptions } from "../core/Options";
import type { ThemeConfig } from "../core/themeSchema";

import { emitThemeCss } from "./themeEmitter";
import type { EmitResult } from "./themeEmitter";

const theme: ThemeConfig = {
  colors: { primary: "#0af", surface: "#fff" },
  borderRadius: { md: "6px" },
  shadows: { soft: "0 1px 2px rgb(0 0 0 / 0.1)" },
};

describe("emitThemeCss", () => {
  let dir: string;
  let themeFile: string;
  let outFile: string;

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
    writeTheme(theme);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe("write-if-changed", () => {
    it("creates the output directory and writes exactly what generate() returns", () => {
      const options: StyleGeneratorOptions = { breakpoints: ["md"] };
      const r = emitThemeCss({ themeFile, outFile, options });

      expect(r).toEqual({ ok: true, outFile, changed: true });
      expect(fs.readFileSync(outFile, "utf8")).toBe(
        generate(theme, options).css,
      );
    });

    it("reports changed: false on a second identical call and leaves the file alone", () => {
      expect(emitThemeCss({ themeFile, outFile })).toMatchObject({
        changed: true,
      });
      const before = fs.statSync(outFile);

      const second = emitThemeCss({ themeFile, outFile });

      expect(second).toEqual({ ok: true, outFile, changed: false });
      const after = fs.statSync(outFile);
      expect(after.ino).toBe(before.ino);
      expect(after.mtimeMs).toBe(before.mtimeMs);
    });

    it("reports changed: true again when the theme or the options change the CSS", () => {
      emitThemeCss({ themeFile, outFile });

      writeTheme({ ...theme, colors: { primary: "#f00", surface: "#fff" } });
      expect(emitThemeCss({ themeFile, outFile })).toMatchObject({
        changed: true,
      });
      expect(fs.readFileSync(outFile, "utf8")).toContain("#f00");

      expect(
        emitThemeCss({
          themeFile,
          outFile,
          options: { resetTailwindDefaults: ["colors"] },
        }),
      ).toMatchObject({ changed: true });
      expect(fs.readFileSync(outFile, "utf8")).toContain("--color-*: initial;");
    });

    it("rewrites a file whose content was edited by hand", () => {
      emitThemeCss({ themeFile, outFile });
      fs.writeFileSync(outFile, "/* edited */");

      expect(emitThemeCss({ themeFile, outFile })).toMatchObject({
        changed: true,
      });
      expect(fs.readFileSync(outFile, "utf8")).not.toContain("edited");
    });

    it("leaves no temp file behind", () => {
      emitThemeCss({ themeFile, outFile });
      expect(fs.readdirSync(path.dirname(outFile))).toEqual(["theme.css"]);
    });
  });

  describe("failures name the stage and write nothing", () => {
    it("read: a missing theme file", () => {
      const missing = path.join(dir, "nope.json");
      const r = failed(emitThemeCss({ themeFile: missing, outFile }));

      expect(r.stage).toBe("read");
      expect(r.message).toBe(`Theme file not found: ${missing}`);
      expect((r.cause as NodeJS.ErrnoException).code).toBe("ENOENT");
      expect(fs.existsSync(outFile)).toBe(false);
    });

    it("read: a directory instead of a file", () => {
      const r = failed(emitThemeCss({ themeFile: dir, outFile }));

      expect(r.stage).toBe("read");
      expect(r.message).toBe(`Theme path is a directory: ${dir}`);
    });

    it("parse: invalid JSON", () => {
      writeTheme("{ not json");
      const r = failed(emitThemeCss({ themeFile, outFile }));

      expect(r.stage).toBe("parse");
      expect(r.message).toMatch(
        new RegExp(`^Invalid JSON in ${themeFile.replace(/\./g, "\\.")}: `),
      );
      expect(r.cause).toBeInstanceOf(SyntaxError);
      expect(fs.existsSync(outFile)).toBe(false);
    });

    it("theme: an invalid theme, labelled with the file", () => {
      writeTheme({ colors: { primary: "{" } });
      const r = failed(emitThemeCss({ themeFile, outFile }));

      expect(r.stage).toBe("theme");
      expect(r.message).toContain(`Invalid theme (${themeFile}):\n`);
      expect(r.message).toContain("colors.primary");
      expect(fs.existsSync(outFile)).toBe(false);
    });

    it("theme: an unknown theme key", () => {
      writeTheme({ ...theme, colours: {} });
      expect(failed(emitThemeCss({ themeFile, outFile })).stage).toBe("theme");
    });

    it("options: an invalid option is not labelled an invalid theme", () => {
      const r = failed(
        emitThemeCss({
          themeFile,
          outFile,
          options: { extraSources: ["a;b"] },
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
        emitThemeCss({
          themeFile,
          outFile,
          options: { resetTailwindDefaults: ["fonts" as never] },
        }),
      );

      expect(r.stage).toBe("options");
    });

    it("cross: a stale $-alias holder under axes.scope element", () => {
      writeTheme({
        colors: { brand: "#00f", primary: "$brand" },
        themeAxes: { theme: { dark: { colors: { brand: "#0af" } } } },
      });
      const r = failed(
        emitThemeCss({
          themeFile,
          outFile,
          options: { axes: { scope: "element" } },
        }),
      );

      expect(r.stage).toBe("cross");
      expect(r.message).toMatch(/^Invalid theme\/options:\n/);
      expect(r.message).toContain("themeAxes.theme.dark.colors.brand");
    });

    it("cross: resetTailwindDefaults radius with no borderRadius", () => {
      writeTheme({ colors: { primary: "#0af" } });
      const r = failed(
        emitThemeCss({
          themeFile,
          outFile,
          options: { resetTailwindDefaults: ["radius"] },
        }),
      );

      expect(r.stage).toBe("cross");
      expect(r.message).toContain("resetTailwindDefaults.0");
      expect(fs.existsSync(outFile)).toBe(false);
    });

    it("write: an output path below a regular file", () => {
      const blocker = path.join(dir, "blocker");
      fs.writeFileSync(blocker, "x");
      const target = path.join(blocker, "theme.css");
      const r = failed(emitThemeCss({ themeFile, outFile: target }));

      expect(r.stage).toBe("write");
      expect(r.message).toMatch(
        new RegExp(`^Cannot write ${target.replace(/\./g, "\\.")}: `),
      );
    });

    it("write: an output path that is a directory", () => {
      const asDir = path.join(dir, "taken");
      fs.mkdirSync(asDir);

      expect(failed(emitThemeCss({ themeFile, outFile: asDir })).stage).toBe(
        "write",
      );
      expect(fs.readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
    });

    it("never throws: a failure after a success leaves the earlier output intact", () => {
      emitThemeCss({ themeFile, outFile });
      const good = fs.readFileSync(outFile, "utf8");

      writeTheme({ colors: { primary: "{" } });
      expect(emitThemeCss({ themeFile, outFile }).ok).toBe(false);
      expect(fs.readFileSync(outFile, "utf8")).toBe(good);
    });
  });
});
