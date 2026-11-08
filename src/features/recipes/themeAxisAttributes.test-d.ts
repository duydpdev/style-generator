import { describe, expectTypeOf, it } from "vitest";

import { defineTheme } from "../../core/defineTheme";
import type { ThemeAxesState } from "../../core/designTokensTypes";

import { themeAxisAttributes } from "./themeAxisAttributes";

const theme = defineTheme({
  colors: { primary: "#111" },
  themeAxes: {
    theme: { dark: { colors: { primary: "#eee" } } },
    palette: { forest: { colors: { primary: "#0a0" } } },
  },
});

expectTypeOf(theme.themeAxes).toHaveProperty("theme");

describe("themeAxisAttributes", () => {
  it("returns a readonly attribute-name → value record", () => {
    expectTypeOf(
      themeAxisAttributes<typeof theme>({ theme: "dark" }),
    ).toEqualTypeOf<Readonly<Record<string, string>>>();
  });

  it("takes the typed axes state: declared variants and base only", () => {
    expectTypeOf<
      Parameters<typeof themeAxisAttributes<typeof theme>>[0]
    >().toEqualTypeOf<ThemeAxesState<typeof theme>>();
    themeAxisAttributes<typeof theme>({ theme: "dark", palette: "base" });
    themeAxisAttributes<typeof theme>({});
    // @ts-expect-error "light" is not a variant of the theme axis
    themeAxisAttributes<typeof theme>({ theme: "light" });
    // @ts-expect-error "mode" is not an axis
    themeAxisAttributes<typeof theme>({ mode: "dark" });
  });

  it("takes no options argument", () => {
    expectTypeOf<
      Parameters<typeof themeAxisAttributes<typeof theme>>
    >().toEqualTypeOf<[state: ThemeAxesState<typeof theme>]>();
    // @ts-expect-error a second argument is not accepted
    themeAxisAttributes<typeof theme>({ theme: "dark" }, {});
  });
});
