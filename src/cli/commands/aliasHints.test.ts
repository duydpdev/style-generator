import { describe, expect, it } from "vitest";

import { ThemeSchema } from "../../core/themeSchema";

import { findAliasHints } from "./aliasHints";

const parse = (theme: unknown) => ThemeSchema.parse(theme);

describe("findAliasHints", () => {
  it("names the base key whose literal an override repeats", () => {
    const hints = findAliasHints(
      parse({
        colors: { blue500: "#3B82F6", primary: "#000" },
        themeAxes: { theme: { dark: { colors: { primary: "#3b82f6" } } } },
      }),
    );

    expect(hints).toEqual([
      'Override theme.dark.colors.primary repeats base value #3b82f6 → use alias "$blue500"',
    ]);
  });

  it("covers every CSS-var category, not only colors", () => {
    const hints = findAliasHints(
      parse({
        colors: { primary: "#000" },
        shadows: { sm: "0 1px 2px #0000000d", card: "none" },
        borderRadius: { base: "4px", box: "8px" },
        themeAxes: {
          theme: {
            dark: {
              shadows: { card: "0 1px 2px #0000000D" },
              borderRadius: { box: " 4px " },
            },
          },
        },
      }),
    );

    expect(hints).toEqual([
      'Override theme.dark.shadows.card repeats base value 0 1px 2px #0000000D → use alias "$sm"',
      'Override theme.dark.borderRadius.box repeats base value 4px → use alias "$base"',
    ]);
  });

  it("skips an override equal to its own base key (a redundant override, not an alias candidate)", () => {
    expect(
      findAliasHints(
        parse({
          colors: { primary: "#fff" },
          themeAxes: { theme: { dark: { colors: { primary: "#FFF" } } } },
        }),
      ),
    ).toEqual([]);
  });

  it("skips alias values and base keys that are themselves aliases", () => {
    expect(
      findAliasHints(
        parse({
          colors: { blue500: "#3B82F6", primary: "$blue500", other: "#000" },
          themeAxes: {
            theme: { dark: { colors: { other: "$blue500", primary: "#111" } } },
          },
        }),
      ),
    ).toEqual([]);
  });

  it("does not suggest swapping two keys the same variant redefines (dark surface → $text would turn white)", () => {
    expect(
      findAliasHints(
        parse({
          colors: { surface: "#fff", text: "#000" },
          themeAxes: {
            theme: { dark: { colors: { surface: "#000", text: "#fff" } } },
          },
        }),
      ),
    ).toEqual([]);
  });

  it("skips a candidate that another variant or another axis redefines, and takes the next stable one", () => {
    const theme = parse({
      colors: { text: "#000", ink: "#000", stable: "#000", bg: "#fff" },
      themeAxes: {
        theme: {
          dark: { colors: { bg: "#000" } },
          contrast: { colors: { text: "#111" } },
        },
        palette: { forest: { colors: { ink: "#222" } } },
      },
    });

    expect(findAliasHints(theme)).toEqual([
      'Override theme.dark.colors.bg repeats base value #000 → use alias "$stable"',
    ]);
  });

  it("still hints when the repeated key is not redefined anywhere", () => {
    expect(
      findAliasHints(
        parse({
          colors: { surface: "#fff", text: "#000", white: "#fff" },
          themeAxes: { theme: { dark: { colors: { surface: "#000" } } } },
        }),
      ),
    ).toEqual([
      'Override theme.dark.colors.surface repeats base value #000 → use alias "$text"',
    ]);
  });

  it("names the first matching base key and reports per axis and variant", () => {
    const hints = findAliasHints(
      parse({
        colors: { a: "#111", b: "#111", c: "#222" },
        themeAxes: {
          theme: { dark: { colors: { c: "#111" } } },
          palette: { forest: { colors: { c: "#111" } } },
        },
      }),
    );

    expect(hints).toEqual([
      'Override theme.dark.colors.c repeats base value #111 → use alias "$a"',
      'Override palette.forest.colors.c repeats base value #111 → use alias "$a"',
    ]);
  });

  it("returns nothing without themeAxes or when no literal repeats", () => {
    expect(findAliasHints(parse({ colors: { primary: "#fff" } }))).toEqual([]);
    expect(
      findAliasHints(
        parse({
          colors: { primary: "#fff", bg: "#000" },
          themeAxes: { theme: { dark: { colors: { primary: "#eee" } } } },
        }),
      ),
    ).toEqual([]);
  });
});
