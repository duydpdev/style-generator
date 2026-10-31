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

  it("attribute is an axis → attribute-name map, not a function", () => {
    expectTypeOf<
      NonNullable<Parameters<typeof themeAxisAttributes<typeof theme>>[1]>
    >().toEqualTypeOf<{
      readonly attribute?: Readonly<Record<string, string>> | undefined;
    }>();
    themeAxisAttributes<typeof theme>(
      { theme: "dark" },
      { attribute: { theme: "data-mode" } },
    );
    themeAxisAttributes<typeof theme>({}, {});
    // an explicit `undefined` (e.g. `options.axes?.attribute`) is fine under exactOptionalPropertyTypes
    const maybe: Readonly<Record<string, string>> | undefined = undefined as
      | Readonly<Record<string, string>>
      | undefined;
    themeAxisAttributes<typeof theme>({ theme: "dark" }, { attribute: maybe });
    themeAxisAttributes<typeof theme>(
      { theme: "dark" },
      // @ts-expect-error a function is not accepted (the map is shared with options.axes.attribute)
      { attribute: (axis: string) => `data-${axis}` },
    );
  });
});
