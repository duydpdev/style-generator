import { describe, expect, it } from "vitest";

import { generate } from "../../core/generate";
import { defineTheme } from "../../core/defineTheme";

import { themeAxisAttributes } from "./themeAxisAttributes";

const theme = defineTheme({
  colors: { primary: "#111" },
  themeAxes: {
    theme: { dark: { colors: { primary: "#eee" } } },
    colorPalette: {
      forestGreen: { colors: { primary: "#0a0" } },
      deep2xl: { colors: { primary: "#00a" } },
    },
  },
});

describe("themeAxisAttributes", () => {
  it("kebab-cases the axis into data-<axis> and the variant into its value", () => {
    expect(
      themeAxisAttributes({
        theme: "dark",
        colorPalette: "forestGreen",
      }),
    ).toEqual({ "data-theme": "dark", "data-color-palette": "forest-green" });
  });

  it("emits nothing for base and for omitted/undefined axes", () => {
    expect(
      // `undefined` marks an axis the caller leaves unset
      themeAxisAttributes({
        theme: "base",
        colorPalette: undefined,
      }),
    ).toEqual({});
    expect(themeAxisAttributes({})).toEqual({});
    expect(
      themeAxisAttributes({
        theme: "base",
        colorPalette: "deep2xl",
      }),
    ).toEqual({ "data-color-palette": "deep-2xl" });
  });

  it("mirrors the html[data-<axis>] selectors generate() emits", () => {
    const state = { theme: "dark", colorPalette: "forestGreen" } as const;
    const selectors = (css: string) => css.match(/html\[[^\]]+\]/g) ?? [];

    const { css } = generate(theme);
    const attrs = themeAxisAttributes(state);
    expect(attrs).toEqual({
      "data-theme": "dark",
      "data-color-palette": "forest-green",
    });
    for (const [name, value] of Object.entries(attrs)) {
      expect(selectors(css)).toContain(`html[${name}="${value}"]`);
    }
    expect(selectors(css)).toContain('html[data-theme="dark"]');
  });
});
