import { describe, it, expectTypeOf } from "vitest";

import type { SpacingKey } from "../shared/defaultOption";

import { defineOptions, defineTheme } from "./defineTheme";
import type { ThemeAxesState } from "./designTokensTypes";
import { generate } from "./generate";
import type { GenerateResult } from "./generate";
import type { DesignTokensWeb } from "./inference";
import type { Breakpoint, StyleGeneratorOptions } from "./Options";
import type { ThemeConfig } from "./themeSchema";

describe("generate consumer shape", () => {
  const theme = defineTheme({
    colors: {
      primary: "#3B82F6",
      primaryForeground: "#FFFFFF",
      "sidebar-foreground": "#111827",
      "blue-500": "#3B82F6",
    },
    typography: {
      h1: {
        fontSize: "32px",
        lineHeight: "40px",
        fontWeight: 700,
        letterSpacing: "0",
      },
      bodyLg: {
        fontSize: "18px",
        lineHeight: "28px",
        fontWeight: 400,
        letterSpacing: "0",
      },
    },
    shadows: { sm: "0 1px 2px rgba(0,0,0,0.05)", md: "..." },
    borderRadius: { sm: "4px", "2xl": "16px" },
  });

  const result = generate(theme, { breakpoints: ["md", "lg"] });

  it("return shape is exactly { css, tokens, schema } — no legacy plugin/safelist/themeCss fields", () => {
    expectTypeOf<keyof typeof result>().toEqualTypeOf<
      "css" | "tokens" | "schema"
    >();
    expectTypeOf(result).toEqualTypeOf<
      GenerateResult<
        typeof theme,
        { readonly breakpoints: readonly ["md", "lg"] }
      >
    >();
    expectTypeOf(result.tokens).toEqualTypeOf<{
      Web: DesignTokensWeb<
        typeof theme,
        { readonly breakpoints: readonly ["md", "lg"] }
      >;
    }>();
  });

  it("css is typed string", () => {
    expectTypeOf(result.css).toEqualTypeOf<string>();
  });

  it("DesignTokens.Web.colors is literal camelCase union", () => {
    expectTypeOf(result.tokens.Web.colors).toEqualTypeOf<
      readonly (
        | "primary"
        | "primaryForeground"
        | "sidebarForeground"
        | "blue500"
      )[]
    >();
  });

  it("DesignTokens.Web.typography is typography keys", () => {
    expectTypeOf(result.tokens.Web.typography).toEqualTypeOf<
      readonly ("h1" | "bodyLg")[]
    >();
  });

  it("DesignTokens.Web.borderRadius preserves digit-prefix tokens", () => {
    expectTypeOf(result.tokens.Web.borderRadius).toEqualTypeOf<
      readonly ("sm" | "2xl")[]
    >();
  });

  it("aliasedColors is empty when no color value is an alias", () => {
    expectTypeOf(result.tokens.Web.aliasedColors).toEqualTypeOf<
      readonly never[]
    >();
  });
});

describe("generate options flow into the token types", () => {
  const theme = defineTheme({ colors: { primary: "#3B82F6" } });

  it("literal breakpoints", () => {
    const { tokens } = generate(theme, { breakpoints: ["md", "xl"] });
    expectTypeOf(tokens.Web.breakpoints).toEqualTypeOf<
      readonly ("md" | "xl")[]
    >();
  });

  it("omitted options fall back to the default breakpoints", () => {
    expectTypeOf(generate(theme).tokens.Web.breakpoints).toEqualTypeOf<
      readonly ("md" | "lg")[]
    >();
    expectTypeOf(
      generate(theme, { enableResponsive: false }).tokens.Web.breakpoints,
    ).toEqualTypeOf<readonly ("md" | "lg")[]>();
  });

  it("options annotated StyleGeneratorOptions widen to string", () => {
    const options: StyleGeneratorOptions = { breakpoints: ["md"] };
    const { tokens } = generate(theme, options);
    expectTypeOf(tokens.Web.breakpoints).toEqualTypeOf<readonly string[]>();
    expectTypeOf(tokens.Web.spacingProperties).toEqualTypeOf<
      readonly string[]
    >();
  });

  it("custom spacing.properties keys replace the defaults", () => {
    const { tokens } = generate(theme, {
      spacing: { properties: { inset: ["inset"] } },
    });
    expectTypeOf(tokens.Web.spacingProperties).toEqualTypeOf<
      readonly "inset"[]
    >();
  });

  it("spacing without properties keeps the default spacing keys", () => {
    expectTypeOf(
      generate(theme, { spacing: { enabled: false } }).tokens.Web
        .spacingProperties,
    ).toEqualTypeOf<readonly SpacingKey[]>();
    expectTypeOf(generate(theme).tokens.Web.spacingProperties).toEqualTypeOf<
      readonly SpacingKey[]
    >();
  });

  it("screens are the default screens plus the custom keys", () => {
    expectTypeOf(generate(theme).tokens.Web.screens).toEqualTypeOf<
      Readonly<Record<Breakpoint, string>>
    >();
    expectTypeOf(
      generate(theme, { screens: { "3xl": "1920px" } }).tokens.Web.screens,
    ).toEqualTypeOf<Readonly<Record<Breakpoint | "3xl", string>>>();
  });

  it("defineOptions keeps the literals through generate()", () => {
    const options = defineOptions({
      breakpoints: ["sm", "md"],
      spacing: { properties: { p: ["padding"] } },
    });
    const { tokens } = generate(theme, options);
    expectTypeOf(tokens.Web.breakpoints).toEqualTypeOf<
      readonly ("sm" | "md")[]
    >();
    expectTypeOf(tokens.Web.spacingProperties).toEqualTypeOf<readonly "p"[]>();
  });

  it("a theme annotated ThemeConfig widens its keys to string", () => {
    const wide: ThemeConfig = { colors: { primary: "#fff" } };
    const { tokens } = generate(wide);
    expectTypeOf(tokens.Web.colors).toEqualTypeOf<readonly string[]>();
    expectTypeOf(tokens.Web.borderRadius).toEqualTypeOf<readonly string[]>();
  });

  it("themeAxes variants are type-checked through ThemeAxesState", () => {
    const themed = defineTheme({
      colors: { primary: "#111" },
      themeAxes: {
        theme: { dark: { colors: { primary: "#fff" } } },
        palette: { forest: { colors: { primary: "#0f0" } } },
      },
    });
    expectTypeOf(generate(themed).tokens.Web.colors).toEqualTypeOf<
      readonly "primary"[]
    >();
    expectTypeOf<ThemeAxesState<typeof themed>>().toEqualTypeOf<{
      readonly theme?: "dark" | "base";
      readonly palette?: "forest" | "base";
    }>();
  });
});

describe("explicit type arguments never mistype the options", () => {
  const theme = defineTheme({ colors: { primary: "#3B82F6" } });

  it("generate<typeof theme>(theme, options) widens to string", () => {
    const { tokens } = generate<typeof theme>(theme, { breakpoints: ["xl"] });
    expectTypeOf(tokens.Web.breakpoints).toEqualTypeOf<readonly string[]>();
    expectTypeOf(tokens.Web.breakpoints).not.toEqualTypeOf<
      readonly ("md" | "lg")[]
    >();
    expectTypeOf(tokens.Web.spacingProperties).toEqualTypeOf<
      readonly string[]
    >();
    expectTypeOf<keyof typeof tokens.Web.screens>().toEqualTypeOf<string>();
  });

  it("generate<typeof theme>(theme) keeps the defaults", () => {
    expectTypeOf(
      generate<typeof theme>(theme).tokens.Web.breakpoints,
    ).toEqualTypeOf<readonly ("md" | "lg")[]>();
  });
});

describe("aliasedColors", () => {
  const aliased = defineTheme({
    colors: {
      blue500: "#00f",
      primary: "$blue500",
      accent: "#f00",
      "sidebar-ring": "#111",
      "on-dark": "#eee",
    },
    themeAxes: {
      theme: { dark: { colors: { accent: "$blue500", "on-dark": "#fff" } } },
      palette: { sand: { colors: { "sidebar-ring": "$blue500" } } },
    },
  });

  it("is the literal alias holders of the base record and every override", () => {
    expectTypeOf(generate(aliased).tokens.Web.aliasedColors).toEqualTypeOf<
      readonly ("primary" | "accent" | "sidebarRing")[]
    >();
  });

  it("is empty when no value is an alias", () => {
    const plain = defineTheme({ colors: { primary: "#111" } });
    expectTypeOf(generate(plain).tokens.Web.aliasedColors).toEqualTypeOf<
      readonly never[]
    >();
  });

  it("keeps every key when the values are only typed string", () => {
    const wide: ThemeConfig = { colors: { primary: "#fff" } };
    expectTypeOf(generate(wide).tokens.Web.aliasedColors).toEqualTypeOf<
      readonly string[]
    >();
  });
});
