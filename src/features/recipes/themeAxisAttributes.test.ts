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
      themeAxisAttributes<typeof theme>({
        theme: "dark",
        colorPalette: "forestGreen",
      }),
    ).toEqual({ "data-theme": "dark", "data-color-palette": "forest-green" });
  });

  it("emits nothing for base and for omitted/undefined axes", () => {
    expect(
      // `undefined` is rejected by the types (exactOptionalPropertyTypes) but a JS caller can pass it
      themeAxisAttributes<typeof theme>({
        theme: "base",
        colorPalette: undefined,
      } as never),
    ).toEqual({});
    expect(themeAxisAttributes<typeof theme>({})).toEqual({});
    expect(
      themeAxisAttributes<typeof theme>({
        theme: "base",
        colorPalette: "deep2xl",
      }),
    ).toEqual({ "data-color-palette": "deep-2xl" });
  });

  it("renames attributes through the axis → attribute map, falling back per axis", () => {
    expect(
      themeAxisAttributes<typeof theme>(
        { theme: "dark", colorPalette: "forestGreen" },
        { attribute: { theme: "data-mode" } },
      ),
    ).toEqual({ "data-mode": "dark", "data-color-palette": "forest-green" });
  });

  it("an empty options object or attribute map behaves like no options", () => {
    const state = { theme: "dark" } as const;
    expect(themeAxisAttributes<typeof theme>(state, {})).toEqual({
      "data-theme": "dark",
    });
    expect(themeAxisAttributes<typeof theme>(state, { attribute: {} })).toEqual(
      {
        "data-theme": "dark",
      },
    );
  });

  it("mirrors the selectors generate() emits, for both the default and a renamed attribute", () => {
    const state = { theme: "dark", colorPalette: "forestGreen" } as const;
    const selectors = (css: string) => css.match(/html\[[^\]]+\]/g) ?? [];

    const { css } = generate(theme);
    const attrs = themeAxisAttributes<typeof theme>(state);
    for (const [name, value] of Object.entries(attrs)) {
      expect(selectors(css)).toContain(`html[${name}="${value}"]`);
    }

    const attribute = { theme: "data-mode", colorPalette: "data-tone" };
    const { css: renamed } = generate(theme, { axes: { attribute } });
    const renamedAttrs = themeAxisAttributes<typeof theme>(state, {
      attribute,
    });
    expect(new Set(Object.keys(renamedAttrs))).toEqual(
      new Set(["data-mode", "data-tone"]),
    );
    for (const [name, value] of Object.entries(renamedAttrs)) {
      expect(selectors(renamed)).toContain(`html[${name}="${value}"]`);
    }
  });
});
