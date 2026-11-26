import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { checkCanvas } from "../cli/commands/canvas";

import { writeTmpFile } from "./__fixtures__/tmpProject";

type Theme = Record<string, Record<string, unknown>>;

const THEME: Theme = {
  colors: { primary: "#111111", foreground: "#222222" },
  fontFamily: { sans: '"Geist", sans-serif', display: '"Newsreader", serif' },
  opacity: { disabled: 0.4 },
  borderRadius: { md: "6px", full: "9999px" },
  shadows: { sm: "0 1px 2px #0001" },
  zIndex: { modal: 50 },
};

describe("board class rules", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sg-board-rules-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // The lines of `rule` that a board with `classes` and the optional preset produce.
  const run = async (
    rule: "ref-class" | "token-bypass",
    classes: string,
    extra: {
      theme?: Theme;
      preset?: string;
      standard?: object;
      config?: object;
    } = {},
  ): Promise<string[]> => {
    writeTmpFile(dir, "theme.json", extra.theme ?? THEME);
    writeTmpFile(dir, "canvas/x.dc.html", `<div class="${classes}">x</div>\n`);
    if (extra.preset !== undefined)
      writeTmpFile(dir, "ds.preset.ts", extra.preset);
    if (extra.standard !== undefined)
      writeTmpFile(dir, "standard.json", extra.standard);
    if (extra.config !== undefined)
      writeTmpFile(dir, "style-gen.config.json", extra.config);
    const result = await checkCanvas({
      canvasDir: "canvas",
      theme: "theme.json",
      boards: true,
      cwd: dir,
      ...(extra.preset === undefined ? {} : { preset: "ds.preset.ts" }),
      ...(extra.standard === undefined ? {} : { standard: "standard.json" }),
      ...(extra.config === undefined
        ? {}
        : { config: "style-gen.config.json" }),
    });
    return result.errors.filter((line) => line.includes(`[${rule};`));
  };

  describe("ref-class", () => {
    it("passes a class the theme defines, in every namespace", async () => {
      expect(
        await run(
          "ref-class",
          "font-display font-sans text-primary bg-foreground/50 rounded-md shadow-sm md:rounded-full flex p-4 font-bold",
        ),
      ).toEqual([]);
    });

    it("fails a class whose token the theme lacks", async () => {
      const lines = await run("ref-class", "font-serif bg-nope rounded-xl");
      expect(lines.map((line) => line.split(" [")[0])).toEqual([
        "x.dc.html:1 unknown class font-serif (no fontFamily token or utility produces it)",
        "x.dc.html:1 unknown class bg-nope (no colors token or utility produces it)",
        "x.dc.html:1 unknown class rounded-xl (no borderRadius token or utility produces it)",
      ]);
      expect(lines[0]).toContain(
        "[ref-class; technical: a class with no token behind it renders nothing]",
      );
    });

    it("fails a font the theme dropped, and passes it once the theme has it", async () => {
      const without: Theme = {
        ...THEME,
        fontFamily: { sans: '"Geist", sans-serif' },
      };
      expect(
        await run("ref-class", "font-display", { theme: without }),
      ).toHaveLength(1);
      expect(await run("ref-class", "font-display")).toEqual([]);
    });

    it("never reports a class outside the theme's families", async () => {
      expect(
        await run("ref-class", "flex grid-cols-3 text-center bl-card hidden"),
      ).toEqual([]);
    });

    it("accepts a class behind a breakpoint whose name starts with a digit", async () => {
      expect(
        await run("ref-class", "2xl:bg-primary 2xl:rounded-md", {
          config: { screens: { "2xl": "1536px" }, breakpoints: ["2xl"] },
        }),
      ).toEqual([]);
    });

    it("reads the preset as text and checks its classes", async () => {
      const preset = [
        'import { cva } from "class-variance-authority";',
        "throw new Error('a preset must never run');",
        'export const button = { focus: "outline-2 font-mono" };',
      ].join("\n");
      const lines = await run("ref-class", "flex", { preset });
      expect(lines.map((line) => line.split(" [")[0])).toEqual([
        "ds.preset.ts:3 unknown class font-mono (no fontFamily token or utility produces it)",
      ]);
    });

    it("reads the product's generator options from --config", async () => {
      expect(
        await run("ref-class", "bg-nope", {
          config: { resetTailwindDefaults: ["colors"] },
        }),
      ).toHaveLength(1);
    });
  });

  describe("token-bypass", () => {
    it("fails a raw value in a family the theme defines", async () => {
      const lines = await run(
        "token-bypass",
        "opacity-50 rounded-[6px] z-50 bg-[#fff]",
      );
      expect(lines.map((line) => line.split(" [")[0])).toEqual([
        "x.dc.html:1 class opacity-50 writes a raw opacity value (use a opacity token)",
        "x.dc.html:1 class rounded-[6px] writes a raw borderRadius value (use a borderRadius token)",
        "x.dc.html:1 class z-50 writes a raw zIndex value (use a zIndex token)",
        "x.dc.html:1 class bg-[#fff] writes a raw colors value (use a colors token)",
      ]);
    });

    it("leaves a bare default and a zero or full value alone", async () => {
      expect(
        await run(
          "token-bypass",
          "rounded shadow border opacity-0 opacity-100 z-0 border-0",
        ),
      ).toEqual([]);
    });

    it("passes a token class and an arbitrary value that reads a token", async () => {
      expect(
        await run(
          "token-bypass",
          "opacity-disabled z-modal rounded-md bg-[var(--sg-color-primary)] p-[13px] h-[40px]",
        ),
      ).toEqual([]);
    });

    it("leaves a family the theme does not define alone", async () => {
      const rest: Theme = { ...THEME };
      delete rest.opacity;
      expect(await run("token-bypass", "opacity-50", { theme: rest })).toEqual(
        [],
      );
    });

    it("catches a variant in the preset", async () => {
      const preset = 'export const b = { disabled: "disabled:opacity-50" };';
      const bad = await run("token-bypass", "flex", { preset });
      expect(bad.map((line) => line.split(" [")[0])).toEqual([
        "ds.preset.ts:1 class disabled:opacity-50 writes a raw opacity value (use a opacity token)",
      ]);
      const good =
        'export const b = { disabled: "disabled:opacity-disabled" };';
      expect(await run("token-bypass", "flex", { preset: good })).toEqual([]);
    });

    it("skips a class an exception names in that file", async () => {
      const standard = {
        exceptions: {
          bypass: [
            {
              class: "opacity-50",
              files: ["x.dc.html"],
              reason: "dim overlay",
            },
          ],
        },
      };
      expect(await run("token-bypass", "opacity-50", { standard })).toEqual([]);
      expect(
        await run("token-bypass", "opacity-50", {
          standard: {
            exceptions: {
              bypass: [
                { class: "opacity-50", files: ["other.dc.html"], reason: "x" },
              ],
            },
          },
        }),
      ).toHaveLength(1);
    });
  });

  describe("token-unused", () => {
    const UNUSED_THEME: Theme = {
      colors: {
        primary: "#111111",
        primaryHover: "#000000",
        primarySubtle: "#eeeeee",
        danger: "#cc0000",
        dangerHover: "#aa0000",
        accent: "#ff00aa",
        base: "#fafafa",
        muted: "$base",
      },
      shadows: { sm: "0 1px 2px #0001", lg: "0 8px 24px #0002" },
    };

    // The `token-unused` findings (as `<category>.<key>`) a board with `classes` produces.
    const unused = async (
      classes: string,
      extra: { preset?: string; standard?: object; style?: string } = {},
    ): Promise<{ keys: string[]; lines: string[] }> => {
      writeTmpFile(dir, "theme.json", UNUSED_THEME);
      writeTmpFile(
        dir,
        "canvas/x.dc.html",
        `<div class="${classes}">x</div>\n`,
      );
      if (extra.preset !== undefined)
        writeTmpFile(dir, "ds.preset.ts", extra.preset);
      if (extra.standard !== undefined)
        writeTmpFile(dir, "standard.json", extra.standard);
      const result = await checkCanvas({
        canvasDir: "canvas",
        theme: "theme.json",
        boards: true,
        cwd: dir,
        ...(extra.preset === undefined ? {} : { preset: "ds.preset.ts" }),
        ...(extra.standard === undefined ? {} : { standard: "standard.json" }),
      });
      const lines = result.findings.filter((line) =>
        line.includes("[token-unused"),
      );
      return {
        keys: lines.map((line) => /\s(\w+\.\w+) is read/.exec(line)?.[1] ?? ""),
        lines,
      };
    };

    it("finds a token no class, variable, alias or preset reads", async () => {
      const { keys, lines } = await unused(
        "bg-primary hover:bg-primary-hover bg-primary-subtle text-danger shadow-sm",
      );
      expect(keys).toEqual([
        "colors.dangerHover",
        "colors.accent",
        "colors.muted",
        "shadows.lg",
      ]);
      expect(lines[0]).toMatch(/^finding: theme\.json:1 /);
    });

    it("counts an alias target and a /n modifier as reads", async () => {
      const { keys } = await unused("bg-primary/50 bg-muted shadow-lg");
      expect(keys).not.toContain("colors.base");
      expect(keys).not.toContain("colors.primary");
    });

    it("counts a named opacity modifier as a read of both tokens", async () => {
      const theme = { ...UNUSED_THEME, opacity: { soft: 0.4, loud: 0.9 } };
      writeTmpFile(dir, "theme.json", theme);
      writeTmpFile(
        dir,
        "canvas/x.dc.html",
        '<div class="bg-primary/soft">x</div>\n',
      );
      const result = await checkCanvas({
        canvasDir: "canvas",
        theme: "theme.json",
        boards: true,
        cwd: dir,
      });
      const text = result.findings.join("\n");
      expect(text).not.toContain("opacity.soft");
      expect(text).toContain("opacity.loud");
    });

    it("counts a variable read as a use", async () => {
      writeTmpFile(dir, "theme.json", UNUSED_THEME);
      writeTmpFile(
        dir,
        "canvas/x.dc.html",
        '<div style="color: var(--sg-color-accent)">x</div>\n',
      );
      const result = await checkCanvas({
        canvasDir: "canvas",
        theme: "theme.json",
        boards: true,
        cwd: dir,
      });
      expect(
        result.findings.some((line) => line.includes("colors.accent")),
      ).toBe(false);
    });

    it("counts the keys a preset names and the siblings a recipe reads", async () => {
      const preset =
        'export const intents = ["primary", "danger"]; export const x = "flex";';
      const { keys } = await unused("flex", { preset });
      expect(keys).not.toContain("colors.primaryHover");
      expect(keys).not.toContain("colors.primarySubtle");
      expect(keys).not.toContain("colors.dangerHover");
      expect(keys).toContain("colors.accent");
    });

    it("skips a reserved token and reports nothing as an error", async () => {
      const { keys } = await unused("bg-primary", {
        standard: {
          reserved: { "colors.accent": { reason: "set aside for the brand" } },
        },
      });
      expect(keys).not.toContain("colors.accent");
    });

    it("never fails the run: findings only", async () => {
      writeTmpFile(dir, "theme.json", UNUSED_THEME);
      writeTmpFile(dir, "canvas/x.dc.html", '<div class="flex">x</div>\n');
      const result = await checkCanvas({
        canvasDir: "canvas",
        theme: "theme.json",
        boards: true,
        cwd: dir,
      });
      expect(result.findings.length).toBeGreaterThan(0);
      expect(
        result.errors.filter((line) => line.includes("[token-unused")),
      ).toEqual([]);
    });
  });
});
