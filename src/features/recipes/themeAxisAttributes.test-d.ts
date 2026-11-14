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

describe("themeAxisAttributes", () => {
  it("returns a readonly attribute-name → value record", () => {
    expectTypeOf(themeAxisAttributes({ theme: "dark" })).toEqualTypeOf<
      Readonly<Record<string, string>>
    >();
  });

  it("takes a plain axis → variant record, optional values included", () => {
    expectTypeOf<Parameters<typeof themeAxisAttributes>[0]>().toEqualTypeOf<
      Readonly<Record<string, string | undefined>>
    >();
    themeAxisAttributes({ theme: "dark" });
    themeAxisAttributes({});
    themeAxisAttributes({ theme: undefined });
  });

  it("accepts a ThemeAxesState typed from a defineTheme value", () => {
    const state: ThemeAxesState<typeof theme> = {
      theme: "dark",
      palette: "base",
    };
    expectTypeOf(theme).toBeObject();
    expectTypeOf(themeAxisAttributes(state)).toEqualTypeOf<
      Readonly<Record<string, string>>
    >();
  });

  it("takes no options argument", () => {
    expectTypeOf<Parameters<typeof themeAxisAttributes>>().toEqualTypeOf<
      [state: Readonly<Record<string, string | undefined>>]
    >();
    // @ts-expect-error a second argument is not accepted
    themeAxisAttributes({ theme: "dark" }, {});
  });
});
