import { describe, it, expectTypeOf } from "vitest";

import type {
  ColorVariant,
  TextVariant,
  ShadowVariant,
  RoundedVariant,
  BorderWidthVariant,
  FontFamilyVariant,
  BackdropBlurVariant,
  DesignTokenKeys,
} from "./designTokensTypes";
import type { CategoryTokenKey } from "./inference";
import type { ThemeConfig } from "./themeSchema";

describe("DesignTokenKeys semantic aliases", () => {
  interface SampleTheme extends ThemeConfig {
    colors: {
      primary: string;
      sidebarForeground: string;
    };
    typography: {
      text16Medium: {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        letterSpacing: string;
      };
    };
    shadows: { sm: string };
    backDropBlurs: { md: string };
    borderRadius: { pill: string };
    borderWidth: { thin: string };
    fontFamily: { sans: string };
  }

  it("ColorVariant<T> equals CategoryTokenKey<T, 'colors'>", () => {
    expectTypeOf<ColorVariant<SampleTheme>>().toEqualTypeOf<
      CategoryTokenKey<SampleTheme, "colors">
    >();
  });

  it("ColorVariant<T> includes camelCased keys", () => {
    expectTypeOf<ColorVariant<SampleTheme>>().toEqualTypeOf<
      "primary" | "sidebarForeground"
    >();
  });

  it("TextVariant<T> picks typography keys", () => {
    expectTypeOf<TextVariant<SampleTheme>>().toEqualTypeOf<"text16Medium">();
  });

  it("ShadowVariant<T> picks shadow keys", () => {
    expectTypeOf<ShadowVariant<SampleTheme>>().toEqualTypeOf<"sm">();
  });

  it("BackdropBlurVariant<T> picks backdrop blur keys", () => {
    expectTypeOf<BackdropBlurVariant<SampleTheme>>().toEqualTypeOf<"md">();
  });

  it("RoundedVariant<T> picks borderRadius keys", () => {
    expectTypeOf<RoundedVariant<SampleTheme>>().toEqualTypeOf<"pill">();
  });

  it("BorderWidthVariant<T> picks borderWidth keys", () => {
    expectTypeOf<BorderWidthVariant<SampleTheme>>().toEqualTypeOf<"thin">();
  });

  it("FontFamilyVariant<T> picks fontFamily keys", () => {
    expectTypeOf<FontFamilyVariant<SampleTheme>>().toEqualTypeOf<"sans">();
  });

  it("DesignTokenKeys<T> exposes all six keys", () => {
    type Keys = DesignTokenKeys<SampleTheme>;
    expectTypeOf<Keys["colorKey"]>().toEqualTypeOf<
      "primary" | "sidebarForeground"
    >();
    expectTypeOf<Keys["textKey"]>().toEqualTypeOf<"text16Medium">();
    expectTypeOf<Keys["shadowKey"]>().toEqualTypeOf<"sm">();
  });
});
