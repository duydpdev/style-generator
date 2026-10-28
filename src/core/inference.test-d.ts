import { describe, it, expectTypeOf } from "vitest";

import type { kebabParityCases } from "../__integration__/__fixtures__/kebabParityCases";
import type { DefaultBreakpointKeys } from "../features/spacing/spacingHelpers";
import type {
  DefaultBorderValue,
  DefaultRoundedValue,
  SpacingKey,
} from "../shared/defaultOption";

import type {
  BreakpointKeys,
  CamelCase,
  KebabCase,
  DesignTokensWeb,
  CategoryTokenKey,
  InferBorderWidthOptions,
  InferRoundedOptions,
  ScreenKeys,
  SpacingKeys,
} from "./inference";
import type { Breakpoint, StyleGeneratorOptions } from "./Options";
import type { ThemeConfig } from "./themeSchema";

// ---- Base type helpers ----

describe("CamelCase", () => {
  it("converts kebab-case to camelCase", () => {
    expectTypeOf<
      CamelCase<"sidebar-foreground">
    >().toEqualTypeOf<"sidebarForeground">();
    expectTypeOf<CamelCase<"primary-blue">>().toEqualTypeOf<"primaryBlue">();
  });

  it("leaves simple keys unchanged", () => {
    expectTypeOf<CamelCase<"primary">>().toEqualTypeOf<"primary">();
    expectTypeOf<CamelCase<"h1">>().toEqualTypeOf<"h1">();
  });

  it("converts kebab with numeric suffix: blue-500 → blue500", () => {
    expectTypeOf<CamelCase<"blue-500">>().toEqualTypeOf<"blue500">();
    expectTypeOf<CamelCase<"gray-100">>().toEqualTypeOf<"gray100">();
  });

  it("handles digit-prefix values unchanged: 2xl, 3xl, 4xl", () => {
    expectTypeOf<CamelCase<"2xl">>().toEqualTypeOf<"2xl">();
    expectTypeOf<CamelCase<"3xl">>().toEqualTypeOf<"3xl">();
    expectTypeOf<CamelCase<"4xl">>().toEqualTypeOf<"4xl">();
  });
});

describe("KebabCase", () => {
  it("converts camelCase to kebab-case", () => {
    expectTypeOf<
      KebabCase<"sidebarForeground">
    >().toEqualTypeOf<"sidebar-foreground">();
    expectTypeOf<KebabCase<"primaryBlue">>().toEqualTypeOf<"primary-blue">();
  });

  it("adds dash at letter→digit boundary: blue500 → blue-500", () => {
    expectTypeOf<KebabCase<"blue500">>().toEqualTypeOf<"blue-500">();
    expectTypeOf<KebabCase<"gray100">>().toEqualTypeOf<"gray-100">();
  });

  it("preserves digit-prefix values: 2xl, 3xl, 4xl stay unchanged", () => {
    expectTypeOf<KebabCase<"2xl">>().toEqualTypeOf<"2xl">();
    expectTypeOf<KebabCase<"3xl">>().toEqualTypeOf<"3xl">();
    expectTypeOf<KebabCase<"4xl">>().toEqualTypeOf<"4xl">();
  });

  it("leaves simple lowercase keys unchanged", () => {
    expectTypeOf<KebabCase<"primary">>().toEqualTypeOf<"primary">();
    expectTypeOf<KebabCase<"md">>().toEqualTypeOf<"md">();
  });

  it("converts letter+digit shorthand: h1 → h-1, h2 → h-2 (matches runtime toKebabCase)", () => {
    expectTypeOf<KebabCase<"h1">>().toEqualTypeOf<"h-1">();
    expectTypeOf<KebabCase<"h2">>().toEqualTypeOf<"h-2">();
  });

  it("does not dash between consecutive capitals: primaryFG → primary-fg (matches runtime)", () => {
    expectTypeOf<KebabCase<"primaryFG">>().toEqualTypeOf<"primary-fg">();
    expectTypeOf<KebabCase<"HTMLParser">>().toEqualTypeOf<"htmlparser">();
  });

  it("dashes digit→uppercase and letter→digit: text12Mono → text-12-mono, 500Blue → 500-blue", () => {
    expectTypeOf<KebabCase<"text12Mono">>().toEqualTypeOf<"text-12-mono">();
    expectTypeOf<KebabCase<"500Blue">>().toEqualTypeOf<"500-blue">();
    expectTypeOf<KebabCase<"text2xl">>().toEqualTypeOf<"text-2xl">();
  });

  it("equals the runtime toKebabCase for every row of the shared parity table", () => {
    type Case = (typeof kebabParityCases)[number];
    expectTypeOf<{
      [C in Case as C["key"]]: KebabCase<C["key"]>;
    }>().toEqualTypeOf<{ [C in Case as C["key"]]: C["kebab"] }>();
  });
});

// ---- Color key inference ----

describe("CategoryTokenKey<T, 'colors'>", () => {
  it("infers simple flat color keys as-is", () => {
    interface T {
      colors: { primary: string; white: string };
      typography: Record<string, never>;
    }
    expectTypeOf<CategoryTokenKey<T, "colors">>().toEqualTypeOf<
      "primary" | "white"
    >();
  });

  it("converts kebab-case keys to camelCase: sidebar-foreground → sidebarForeground", () => {
    interface T {
      colors: { "sidebar-foreground": string; "primary-blue": string };
      typography: Record<string, never>;
    }
    expectTypeOf<CategoryTokenKey<T, "colors">>().toEqualTypeOf<
      "sidebarForeground" | "primaryBlue"
    >();
  });

  it("converts numeric-suffix keys: blue-500 → blue500, gray-100 → gray100", () => {
    interface T {
      colors: { "blue-500": string; "gray-100": string };
      typography: Record<string, never>;
    }
    expectTypeOf<CategoryTokenKey<T, "colors">>().toEqualTypeOf<
      "blue500" | "gray100"
    >();
  });

  it("an annotated ThemeConfig widens to exactly string (not Uncapitalize<string>)", () => {
    expectTypeOf<
      CategoryTokenKey<ThemeConfig, "colors">
    >().toEqualTypeOf<string>();
  });
});

// ---- DesignTokensWeb integration ----

describe("DesignTokensWeb", () => {
  interface MyTheme {
    colors: {
      primary: string;
      "sidebar-foreground": string;
      "blue-500": string;
    };
    typography: {
      h1: {
        fontSize: "32px";
        lineHeight: "40px";
        fontWeight: 700;
        letterSpacing: "0";
      };
      bodyLg: {
        fontSize: "18px";
        lineHeight: "28px";
        fontWeight: 400;
        letterSpacing: "0";
      };
    };
    shadows: { md: string; lg: string };
    borderRadius: { sm: string; "2xl": string; "4xl": string };
    borderWidth: { thin: string; thick: string };
    fontFamily: { sans: string };
  }

  type Web = DesignTokensWeb<MyTheme>;

  it("colors: kebab keys become camelCase, numeric-suffix keys collapsed", () => {
    expectTypeOf<Web["colors"]>().toEqualTypeOf<
      readonly ("primary" | "sidebarForeground" | "blue500")[]
    >();
  });

  it("typography: typography keys become camelCase", () => {
    expectTypeOf<Web["typography"]>().toEqualTypeOf<
      readonly ("h1" | "bodyLg")[]
    >();
  });

  it("shadows: shadow keys as camelCase", () => {
    expectTypeOf<Web["shadows"]>().toEqualTypeOf<readonly ("md" | "lg")[]>();
  });

  it("borderRadius: supports digit-prefix values like 2xl and 4xl", () => {
    expectTypeOf<Web["borderRadius"]>().toEqualTypeOf<
      readonly ("sm" | "2xl" | "4xl")[]
    >();
  });

  it("borderWidth: inferred from theme borderWidth keys", () => {
    expectTypeOf<Web["borderWidth"]>().toEqualTypeOf<
      readonly ("thin" | "thick")[]
    >();
  });

  it("fontFamily: inferred from theme fontFamily keys", () => {
    expectTypeOf<Web["fontFamily"]>().toEqualTypeOf<readonly "sans"[]>();
  });

  it("a category the theme omits is `never` (no defaults) or the literal defaults", () => {
    interface Bare {
      colors: { primary: string };
    }
    expectTypeOf<DesignTokensWeb<Bare>["backDropBlurs"]>().toEqualTypeOf<
      readonly never[]
    >();
    expectTypeOf<DesignTokensWeb<Bare>["borderRadius"]>().toEqualTypeOf<
      readonly DefaultRoundedValue[]
    >();
  });

  it("an annotated ThemeConfig makes every key array `readonly string[]`", () => {
    type Wide = DesignTokensWeb<ThemeConfig>;
    expectTypeOf<Wide["colors"]>().toEqualTypeOf<readonly string[]>();
    expectTypeOf<Wide["typography"]>().toEqualTypeOf<readonly string[]>();
    expectTypeOf<Wide["shadows"]>().toEqualTypeOf<readonly string[]>();
    expectTypeOf<Wide["borderRadius"]>().toEqualTypeOf<readonly string[]>();
  });

  it("aliasedColors keeps only keys whose value may be a $alias", () => {
    // `string`-typed values may be aliases at runtime: every key stays.
    expectTypeOf<Web["aliasedColors"]>().toEqualTypeOf<Web["colors"]>();
    // Literal values decide: base record and any themeAxes override count.
    type Plain = DesignTokensWeb<{ colors: { primary: "#fff" } }>;
    expectTypeOf<Plain["aliasedColors"]>().toEqualTypeOf<readonly never[]>();
    type Aliased = DesignTokensWeb<{
      colors: { blue500: "#00f"; "sidebar-ring": "$blue500" };
      themeAxes: { theme: { dark: { colors: { blue500: "$sidebar-ring" } } } };
    }>;
    expectTypeOf<Aliased["aliasedColors"]>().toEqualTypeOf<
      readonly ("sidebarRing" | "blue500")[]
    >();
    expectTypeOf<Aliased["aliasedColors"][number]>().toExtend<
      Aliased["colors"][number]
    >();
  });

  it("options default: md/lg breakpoints, default spacing keys, default screens", () => {
    expectTypeOf<Web["breakpoints"]>().toEqualTypeOf<
      readonly DefaultBreakpointKeys[]
    >();
    expectTypeOf<Web["breakpoints"]>().toEqualTypeOf<
      readonly ("md" | "lg")[]
    >();
    expectTypeOf<Web["spacingProperties"]>().toEqualTypeOf<
      readonly SpacingKey[]
    >();
    expectTypeOf<Web["screens"]>().toEqualTypeOf<
      Readonly<Record<Breakpoint, string>>
    >();
  });

  it("the O parameter drives breakpoints, spacingProperties and screens", () => {
    interface Opts {
      readonly breakpoints: readonly ["sm", "xl"];
      readonly screens: { readonly "3xl": "1920px" };
      readonly spacing: {
        readonly properties: { readonly inset: readonly ["inset"] };
      };
    }
    type WebO = DesignTokensWeb<MyTheme, Opts>;
    expectTypeOf<WebO["breakpoints"]>().toEqualTypeOf<
      readonly ("sm" | "xl")[]
    >();
    expectTypeOf<WebO["spacingProperties"]>().toEqualTypeOf<
      readonly "inset"[]
    >();
    expectTypeOf<WebO["screens"]>().toEqualTypeOf<
      Readonly<Record<Breakpoint | "3xl", string>>
    >();
  });
});

describe("BreakpointKeys / SpacingKeys / ScreenKeys", () => {
  it("BreakpointKeys: literal list, optional field, absent", () => {
    expectTypeOf<
      BreakpointKeys<{ readonly breakpoints: readonly ["md", "xl"] }>
    >().toEqualTypeOf<"md" | "xl">();
    expectTypeOf<
      BreakpointKeys<{ breakpoints?: readonly string[] }>
    >().toEqualTypeOf<string>();
    expectTypeOf<
      BreakpointKeys<StyleGeneratorOptions>
    >().toEqualTypeOf<string>();
    expectTypeOf<
      BreakpointKeys<Record<never, never>>
    >().toEqualTypeOf<DefaultBreakpointKeys>();
    expectTypeOf<
      BreakpointKeys<{ readonly enableResponsive: false }>
    >().toEqualTypeOf<DefaultBreakpointKeys>();
  });

  it("SpacingKeys: declared properties, optional properties, absent", () => {
    expectTypeOf<
      SpacingKeys<{
        readonly spacing: {
          readonly properties: {
            readonly a: readonly ["x"];
            readonly b: readonly ["y"];
          };
        };
      }>
    >().toEqualTypeOf<"a" | "b">();
    expectTypeOf<SpacingKeys<StyleGeneratorOptions>>().toEqualTypeOf<string>();
    expectTypeOf<
      SpacingKeys<{ readonly spacing: { readonly enabled: false } }>
    >().toEqualTypeOf<SpacingKey>();
    expectTypeOf<
      SpacingKeys<Record<never, never>>
    >().toEqualTypeOf<SpacingKey>();
  });

  it("ScreenKeys: declared keys, optional field, absent", () => {
    expectTypeOf<
      ScreenKeys<{ readonly screens: { readonly tablet: "800px" } }>
    >().toEqualTypeOf<"tablet">();
    expectTypeOf<ScreenKeys<StyleGeneratorOptions>>().toEqualTypeOf<string>();
    expectTypeOf<ScreenKeys<Record<never, never>>>().toBeNever();
  });
});

// A kebab-case key in every category must land on the camelCase union that
// `DesignTokens.Web.*` and the `*Variant` aliases expose, so `createVariantMapper`
// round-trips it back to the class the registry emits.
describe("kebab-case keys in every category become camelCase", () => {
  interface KebabTheme {
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
  type Web = DesignTokensWeb<KebabTheme>;

  it("colors", () => {
    expectTypeOf<Web["colors"][number]>().toEqualTypeOf<
      "sidebarForeground" | "blue500"
    >();
  });
  it("typography", () => {
    expectTypeOf<Web["typography"][number]>().toEqualTypeOf<"text16Medium">();
  });
  it("shadows", () => {
    expectTypeOf<Web["shadows"][number]>().toEqualTypeOf<"softLg">();
  });
  it("backDropBlurs", () => {
    expectTypeOf<Web["backDropBlurs"][number]>().toEqualTypeOf<"blurMd">();
  });
  it("borderRadius", () => {
    expectTypeOf<Web["borderRadius"][number]>().toEqualTypeOf<"pillLg">();
  });
  it("borderWidth", () => {
    expectTypeOf<Web["borderWidth"][number]>().toEqualTypeOf<"thinLine">();
  });
  it("fontFamily", () => {
    expectTypeOf<Web["fontFamily"][number]>().toEqualTypeOf<"sansSerif">();
  });
});

// ---- InferBorderOptions / InferRoundedOptions fallback ----

describe("InferBorderWidthOptions / InferRoundedOptions defaults", () => {
  interface Absent {
    colors: Record<string, string>;
    typography: Record<string, never>;
  }

  it("falls back to the literal DefaultBorderValue suffixes when no borderWidth in theme", () => {
    expectTypeOf<
      InferBorderWidthOptions<Absent>
    >().toEqualTypeOf<`${DefaultBorderValue}`>();
    expectTypeOf<InferBorderWidthOptions<Absent>>().toEqualTypeOf<
      "0" | "1" | "2" | "4"
    >();
  });

  it("falls back to DefaultRoundedValue when no borderRadius in theme", () => {
    expectTypeOf<
      InferRoundedOptions<Absent>
    >().toEqualTypeOf<DefaultRoundedValue>();
  });

  it("an optional-declared category (annotated ThemeConfig, JSON-parsed) is `string`, not the defaults", () => {
    interface Optional {
      colors: Record<string, string>;
      borderRadius?: { pill: string };
      borderWidth?: { thin: string };
    }
    expectTypeOf<InferRoundedOptions<Optional>>().toEqualTypeOf<string>();
    expectTypeOf<InferBorderWidthOptions<Optional>>().toEqualTypeOf<string>();
    expectTypeOf<InferRoundedOptions<ThemeConfig>>().toEqualTypeOf<string>();
    expectTypeOf<
      InferBorderWidthOptions<ThemeConfig>
    >().toEqualTypeOf<string>();
    expectTypeOf<
      CategoryTokenKey<ThemeConfig, "borderRadius">
    >().toEqualTypeOf<string>();
  });

  it("a required category lists only its declared keys", () => {
    interface Declared {
      colors: Record<string, string>;
      borderRadius: { pill: string; "2xl": string };
    }
    expectTypeOf<InferRoundedOptions<Declared>>().toEqualTypeOf<
      "pill" | "2xl"
    >();
  });
});

describe("an empty category record counts as not declared (runtime parity)", () => {
  it("`{}` resolves to the category defaults, like an omitted category", () => {
    interface Omitted {
      colors: Record<string, string>;
    }
    interface Empty {
      colors: Record<string, string>;
      borderWidth: Record<never, string>;
      borderRadius: Record<never, string>;
    }
    expectTypeOf<InferBorderWidthOptions<Empty>>().toEqualTypeOf<
      InferBorderWidthOptions<Omitted>
    >();
    expectTypeOf<InferRoundedOptions<Empty>>().toEqualTypeOf<
      InferRoundedOptions<Omitted>
    >();
  });

  it("declared keys win over the defaults (raw keys; CategoryTokenKey camelCases)", () => {
    interface T {
      colors: Record<string, string>;
      borderRadius: { "pill-lg": string };
    }
    expectTypeOf<InferRoundedOptions<T>>().toEqualTypeOf<"pill-lg">();
    expectTypeOf<
      CategoryTokenKey<T, "borderRadius">
    >().toEqualTypeOf<"pillLg">();
  });

  it("a union theme keeps the defaults of the members that omit the category", () => {
    interface Omits {
      colors: Record<string, string>;
    }
    interface Declares {
      colors: Record<string, string>;
      borderRadius: { pill: string };
    }
    expectTypeOf<InferRoundedOptions<Omits | Declares>>().toEqualTypeOf<
      InferRoundedOptions<Omits> | "pill"
    >();
  });
});

describe("CategoryTokenKey", () => {
  it("maps a declared category to its camelCased keys, other categories to defaults/never", () => {
    interface T {
      colors: { "primary-hover": string; blue500: string };
      shadows: { soft: string };
    }
    expectTypeOf<CategoryTokenKey<T, "colors">>().toEqualTypeOf<
      "primaryHover" | "blue500"
    >();
    expectTypeOf<CategoryTokenKey<T, "shadows">>().toEqualTypeOf<"soft">();
    expectTypeOf<CategoryTokenKey<T, "backDropBlurs">>().toBeNever();
  });
});
