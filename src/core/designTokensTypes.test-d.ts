import { describe, it, expectTypeOf } from "vitest";

import type {
  DefaultBorderValue,
  DefaultRoundedValue,
} from "../shared/defaultOption";

import type {
  ColorVariant,
  TextVariant,
  ShadowVariant,
  RoundedVariant,
  BorderWidthVariant,
  FontFamilyVariant,
  BackdropBlurVariant,
  DesignTokenKeys,
  ThemeAxesState,
  ThemeAxisName,
  ThemeAxisVariant,
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

  it("DesignTokenKeys<T> exposes exactly the seven per-category keys", () => {
    type Keys = DesignTokenKeys<SampleTheme>;
    expectTypeOf<keyof Keys>().toEqualTypeOf<
      | "colorKey"
      | "textKey"
      | "shadowKey"
      | "backdropBlurKey"
      | "fontFamilyKey"
      | "borderWidthKey"
      | "roundedKey"
    >();
    expectTypeOf<Keys["colorKey"]>().toEqualTypeOf<
      "primary" | "sidebarForeground"
    >();
    expectTypeOf<Keys["textKey"]>().toEqualTypeOf<"text16Medium">();
    expectTypeOf<Keys["shadowKey"]>().toEqualTypeOf<"sm">();
    expectTypeOf<Keys["backdropBlurKey"]>().toEqualTypeOf<"md">();
    expectTypeOf<Keys["fontFamilyKey"]>().toEqualTypeOf<"sans">();
    expectTypeOf<Keys["borderWidthKey"]>().toEqualTypeOf<"thin">();
    expectTypeOf<Keys["roundedKey"]>().toEqualTypeOf<"pill">();
  });
});

describe("*Variant aliases handle kebab-case keys in every category", () => {
  interface KebabTheme extends ThemeConfig {
    colors: { "sidebar-foreground": string; "blue-500": string };
    typography: {
      "text-16-medium": {
        fontSize: string;
        lineHeight: string;
        fontWeight: number;
        letterSpacing: string;
      };
    };
    shadows: { "soft-lg": string };
    backDropBlurs: { "blur-md": string };
    borderRadius: { "pill-lg": string };
    borderWidth: { "thin-line": string };
    fontFamily: { "sans-serif": string };
  }

  it("colorKey", () => {
    expectTypeOf<ColorVariant<KebabTheme>>().toEqualTypeOf<
      "sidebarForeground" | "blue500"
    >();
  });
  it("textKey", () => {
    expectTypeOf<TextVariant<KebabTheme>>().toEqualTypeOf<"text16Medium">();
  });
  it("shadowKey", () => {
    expectTypeOf<ShadowVariant<KebabTheme>>().toEqualTypeOf<"softLg">();
  });
  it("backdropBlurKey", () => {
    expectTypeOf<BackdropBlurVariant<KebabTheme>>().toEqualTypeOf<"blurMd">();
  });
  it("roundedKey", () => {
    expectTypeOf<RoundedVariant<KebabTheme>>().toEqualTypeOf<"pillLg">();
  });
  it("borderWidthKey", () => {
    expectTypeOf<BorderWidthVariant<KebabTheme>>().toEqualTypeOf<"thinLine">();
  });
  it("fontFamilyKey", () => {
    expectTypeOf<FontFamilyVariant<KebabTheme>>().toEqualTypeOf<"sansSerif">();
  });
});

describe("*Variant aliases on annotated and bare themes", () => {
  it("every alias of an annotated ThemeConfig is exactly string", () => {
    expectTypeOf<ColorVariant<ThemeConfig>>().toEqualTypeOf<string>();
    expectTypeOf<TextVariant<ThemeConfig>>().toEqualTypeOf<string>();
    expectTypeOf<ShadowVariant<ThemeConfig>>().toEqualTypeOf<string>();
    expectTypeOf<BackdropBlurVariant<ThemeConfig>>().toEqualTypeOf<string>();
    expectTypeOf<FontFamilyVariant<ThemeConfig>>().toEqualTypeOf<string>();
    expectTypeOf<RoundedVariant<ThemeConfig>>().toEqualTypeOf<string>();
    expectTypeOf<BorderWidthVariant<ThemeConfig>>().toEqualTypeOf<string>();
  });

  it("a theme without borderRadius/borderWidth falls back to the literal defaults", () => {
    // Not `extends ThemeConfig`: that would inherit the optional `borderRadius?`.
    interface Bare {
      colors: { primary: string };
    }
    expectTypeOf<RoundedVariant<Bare>>().toEqualTypeOf<DefaultRoundedValue>();
    expectTypeOf<
      BorderWidthVariant<Bare>
    >().toEqualTypeOf<`${DefaultBorderValue}`>();
  });

  it("an interface extending ThemeConfig inherits the optional categories, so they are string", () => {
    interface Extending extends ThemeConfig {
      colors: { primary: string };
    }
    expectTypeOf<RoundedVariant<Extending>>().toEqualTypeOf<string>();
    expectTypeOf<BorderWidthVariant<Extending>>().toEqualTypeOf<string>();
  });

  it("an empty borderRadius record falls back to the defaults like an omitted one", () => {
    interface Empty {
      colors: { primary: string };
      borderRadius: Record<never, string>;
    }
    expectTypeOf<RoundedVariant<Empty>>().toEqualTypeOf<DefaultRoundedValue>();
  });
});

describe("theme axes types", () => {
  interface AxesTheme extends ThemeConfig {
    colors: { primary: string };
    themeAxes: {
      theme: {
        dark: { colors: { primary: string } };
        "high-contrast": { colors: { primary: string } };
      };
      palette: { forest: { colors: { primary: string } } };
    };
  }

  it("ThemeAxisName is the axis keys", () => {
    expectTypeOf<ThemeAxisName<AxesTheme>>().toEqualTypeOf<
      "theme" | "palette"
    >();
  });

  it("ThemeAxisVariant is the variants of one axis", () => {
    expectTypeOf<ThemeAxisVariant<AxesTheme, "theme">>().toEqualTypeOf<
      "dark" | "high-contrast"
    >();
    expectTypeOf<
      ThemeAxisVariant<AxesTheme, "palette">
    >().toEqualTypeOf<"forest">();
  });

  it("ThemeAxesState is a readonly partial map of axis to variant or base", () => {
    expectTypeOf<ThemeAxesState<AxesTheme>>().toEqualTypeOf<{
      readonly theme?: "dark" | "high-contrast" | "base";
      readonly palette?: "forest" | "base";
    }>();
  });

  it("rejects an unknown axis, an unknown variant and a typo", () => {
    expectTypeOf<{ theme: "dark" }>().toExtend<ThemeAxesState<AxesTheme>>();
    expectTypeOf<{ theme: "light" }>().not.toExtend<
      ThemeAxesState<AxesTheme>
    >();
    expectTypeOf<{ palete: "forest" }>().not.toExtend<
      ThemeAxesState<AxesTheme>
    >();
  });

  it("rejects a typo next to a valid axis (excess property check)", () => {
    const accept = (state: ThemeAxesState<AxesTheme>) => state;
    // @ts-expect-error `palete` is not an axis of AxesTheme
    accept({ theme: "dark", palete: "forest" });
    // @ts-expect-error `light` is not a variant of the `theme` axis
    accept({ theme: "light" });
    expectTypeOf(accept({ theme: "dark", palette: "base" })).toEqualTypeOf<
      ThemeAxesState<AxesTheme>
    >();
  });

  it("ThemeAxisName and ThemeAxisVariant distribute over a union of themes", () => {
    interface ThemeA {
      colors: { primary: string };
      themeAxes: { theme: { dark: Record<never, never> } };
    }
    interface ThemeB {
      colors: { primary: string };
      themeAxes: { palette: { forest: Record<never, never> } };
    }
    expectTypeOf<ThemeAxisName<ThemeA | ThemeB>>().toEqualTypeOf<
      "theme" | "palette"
    >();
    expectTypeOf<
      ThemeAxisVariant<ThemeA | ThemeB, "theme">
    >().toEqualTypeOf<"dark">();
    expectTypeOf<
      ThemeAxisVariant<ThemeA | ThemeB, "palette">
    >().toEqualTypeOf<"forest">();
  });

  it("a theme without themeAxes has no axes", () => {
    interface NoAxes {
      colors: { primary: string };
    }
    expectTypeOf<ThemeAxisName<NoAxes>>().toBeNever();
  });

  it("an annotated ThemeConfig accepts any axis and variant name", () => {
    expectTypeOf<ThemeAxisName<ThemeConfig>>().toEqualTypeOf<string>();
  });
});
