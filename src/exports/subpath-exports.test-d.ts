import { describe, it, expectTypeOf } from "vitest";

// Import via root barrel
import type * as root from "../index";
// Import via subpath barrels (v4 new paths — resolved via `src/exports/*`
// which is how consumers will see them after exports map resolves).
import type { ThemeConfig } from "../core/themeSchema";

import * as tokens from "./tokens";
import * as cva from "./cva";
import * as spacing from "./spacing";
import type * as types from "./types";

interface AxesTheme extends ThemeConfig {
  colors: { primary: string };
  themeAxes: {
    theme: { dark: { colors: { primary: string } } };
    palette: {
      forest: { colors: { primary: string } };
      sand: Record<never, never>;
    };
  };
}

describe("subpath exports — symbols match root barrel", () => {
  it("tokens subpath", () => {
    expectTypeOf(tokens.createDesignTokens).toEqualTypeOf<
      typeof root.createDesignTokens
    >();
  });

  it("tokens subpath does not re-export defineTheme/defineOptions (root-only, keeps Zod out of the browser-safe bundle)", () => {
    expectTypeOf<"defineTheme">().not.toExtend<keyof typeof tokens>();
    expectTypeOf<"defineOptions">().not.toExtend<keyof typeof tokens>();
  });

  it("cva subpath", () => {
    expectTypeOf(cva.createVariantMapper).toEqualTypeOf<
      typeof root.createVariantMapper
    >();
  });

  it("COLOR_STATES is one shared const across root, tokens and cva", () => {
    expectTypeOf(tokens.COLOR_STATES).toEqualTypeOf<
      readonly ["hover", "active"]
    >();
    expectTypeOf(cva.COLOR_STATES).toEqualTypeOf<typeof tokens.COLOR_STATES>();
    expectTypeOf(cva.COLOR_STATES).toEqualTypeOf<typeof root.COLOR_STATES>();
  });

  it("toKebabCase is one shared function across root and cva", () => {
    expectTypeOf(cva.toKebabCase).toEqualTypeOf<typeof root.toKebabCase>();
    expectTypeOf(cva.toKebabCase).toEqualTypeOf<(str: string) => string>();
  });

  it("root runtime exports are exactly the documented list", () => {
    expectTypeOf<keyof typeof root>().toEqualTypeOf<
      | "Breakpoint"
      | "COLOR_STATES"
      | "DEFAULT_BORDER_VALUES"
      | "DEFAULT_ROUNDED_VALUES"
      | "DEFAULT_SPACING_PROPERTIES"
      | "createDesignTokens"
      | "createVariantMapper"
      | "defaultScreens"
      | "defineOptions"
      | "defineTheme"
      | "formatZodError"
      | "generate"
      | "generateThemeCss"
      | "borderProperties"
      | "resolveSpacing"
      | "resolveSpacingProps"
      | "roundedProperties"
      | "toKebabCase"
    >();
  });

  it("tokens subpath runtime exports are exactly the documented list", () => {
    expectTypeOf<keyof typeof tokens>().toEqualTypeOf<
      | "Breakpoint"
      | "COLOR_STATES"
      | "DEFAULT_BORDER_VALUES"
      | "DEFAULT_ROUNDED_VALUES"
      | "borderProperties"
      | "createDesignTokens"
      | "defaultScreens"
      | "roundedProperties"
    >();
  });

  it("cva subpath runtime exports are exactly the documented list", () => {
    expectTypeOf<keyof typeof cva>().toEqualTypeOf<
      "COLOR_STATES" | "createVariantMapper" | "toKebabCase"
    >();
  });

  it("removed 4.x helper VariantMapperStatesOptions is gone from every subpath", () => {
    // @ts-expect-error removed in 5.0: `{ states }` is passed inline
    type FromCva = cva.VariantMapperStatesOptions;
    // @ts-expect-error removed in 5.0
    type FromRoot = root.VariantMapperStatesOptions;
    // @ts-expect-error removed in 5.0
    type FromTypes = types.VariantMapperStatesOptions;
    expectTypeOf<[FromCva, FromRoot, FromTypes]>().not.toBeAny();
  });

  it("types subpath carries the token, option and axis helper types the root exports", () => {
    expectTypeOf<types.DesignTokensWeb<ThemeConfig>>().toEqualTypeOf<
      root.DesignTokensWeb<ThemeConfig>
    >();
    expectTypeOf<types.BreakpointKeys<{ breakpoints: ["xl"] }>>().toEqualTypeOf<
      root.BreakpointKeys<{ breakpoints: ["xl"] }>
    >();
    expectTypeOf<types.SpacingKeys<Record<never, never>>>().toEqualTypeOf<
      root.SpacingKeys<Record<never, never>>
    >();
    expectTypeOf<types.CamelCase<"a-b">>().toEqualTypeOf<"aB">();
    expectTypeOf<types.KebabCase<"aB">>().toEqualTypeOf<"a-b">();
    expectTypeOf<types.ThemeAxisName<AxesTheme>>().toEqualTypeOf<
      root.ThemeAxisName<AxesTheme>
    >();
    expectTypeOf<types.ThemeAxisVariant<AxesTheme, "palette">>().toEqualTypeOf<
      root.ThemeAxisVariant<AxesTheme, "palette">
    >();
    expectTypeOf<types.ThemeAxesState<AxesTheme>>().toEqualTypeOf<
      root.ThemeAxesState<AxesTheme>
    >();
    expectTypeOf<types.SpacingPropertyMap>().toEqualTypeOf<root.SpacingPropertyMap>();
    expectTypeOf<types.DefaultBreakpointKeys>().toEqualTypeOf<root.DefaultBreakpointKeys>();
    expectTypeOf<types.InferRoundedOptions<ThemeConfig>>().toEqualTypeOf<
      root.InferRoundedOptions<ThemeConfig>
    >();
    expectTypeOf<types.InferBorderWidthOptions<ThemeConfig>>().toEqualTypeOf<
      root.InferBorderWidthOptions<ThemeConfig>
    >();
    expectTypeOf<types.InferSpacingKeys>().toEqualTypeOf<root.InferSpacingKeys>();
  });

  it("spacing subpath", () => {
    expectTypeOf(spacing.resolveSpacing).toEqualTypeOf<
      typeof root.resolveSpacing
    >();
    expectTypeOf(spacing.resolveSpacingProps).toEqualTypeOf<
      typeof root.resolveSpacingProps
    >();
    expectTypeOf(spacing.DEFAULT_SPACING_PROPERTIES).toEqualTypeOf<
      typeof root.DEFAULT_SPACING_PROPERTIES
    >();
  });
});
