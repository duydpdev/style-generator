import { describe, it, expectTypeOf } from "vitest";

import type { kebabParityCases } from "../__integration__/__fixtures__/kebabParityCases";

import type {
  CamelCase,
  KebabCase,
  DesignTokensWeb,
  CategoryTokenKey,
  InferBorderWidthOptions,
  InferRoundedOptions,
} from "./inference";
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

  it("does not return never when using base ThemeConfig annotation", () => {
    expectTypeOf<CategoryTokenKey<ThemeConfig, "colors">>().not.toBeNever();
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
      ("primary" | "sidebarForeground" | "blue500")[]
    >();
  });

  it("typography: typography keys become camelCase", () => {
    expectTypeOf<Web["typography"]>().toEqualTypeOf<("h1" | "bodyLg")[]>();
  });

  it("shadows: shadow keys as camelCase", () => {
    expectTypeOf<Web["shadows"]>().toEqualTypeOf<("md" | "lg")[]>();
  });

  it("borderRadius: supports digit-prefix values like 2xl and 4xl", () => {
    expectTypeOf<Web["borderRadius"]>().toEqualTypeOf<
      ("sm" | "2xl" | "4xl")[]
    >();
  });

  it("borderWidth: inferred from theme borderWidth keys", () => {
    expectTypeOf<Web["borderWidth"]>().toEqualTypeOf<("thin" | "thick")[]>();
  });

  it("fontFamily: inferred from theme fontFamily keys", () => {
    expectTypeOf<Web["fontFamily"]>().toEqualTypeOf<"sans"[]>();
  });

  it("colors not never with base ThemeConfig", () => {
    expectTypeOf<DesignTokensWeb<ThemeConfig>["colors"]>().not.toBeNever();
  });
});

// ---- InferBorderOptions / InferRoundedOptions fallback ----

describe("InferBorderWidthOptions / InferRoundedOptions defaults", () => {
  it("falls back to DefaultBorderValue when no borderWidth in theme", () => {
    interface T {
      colors: Record<string, string>;
      typography: Record<string, never>;
    }
    // No border → should use default type (not never)
    expectTypeOf<InferBorderWidthOptions<T>>().not.toBeNever();
  });

  it("falls back to DefaultRoundedValue when no borderRadius in theme", () => {
    interface T {
      colors: Record<string, string>;
      typography: Record<string, never>;
    }
    expectTypeOf<InferRoundedOptions<T>>().not.toBeNever();
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
