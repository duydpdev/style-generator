import { describe, it, expectTypeOf } from "vitest";

import {
  CamelCase,
  KebabCase,
  InferColorKeys,
  DesignTokensWeb,
  InferBorderOptions,
  InferRoundedOptions,
} from "./inference";
import type { ThemeConfig } from "./ThemeConfig";

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
});

// ---- Color key inference ----

describe("InferColorKeys", () => {
  it("infers simple flat color keys as-is", () => {
    interface T {
      colors: { primary: string; white: string };
      typography: Record<string, never>;
    }
    expectTypeOf<InferColorKeys<T>>().toEqualTypeOf<"primary" | "white">();
  });

  it("converts kebab-case keys to camelCase: sidebar-foreground → sidebarForeground", () => {
    interface T {
      colors: { "sidebar-foreground": string; "primary-blue": string };
      typography: Record<string, never>;
    }
    expectTypeOf<InferColorKeys<T>>().toEqualTypeOf<
      "sidebarForeground" | "primaryBlue"
    >();
  });

  it("converts numeric-suffix keys: blue-500 → blue500, gray-100 → gray100", () => {
    interface T {
      colors: { "blue-500": string; "gray-100": string };
      typography: Record<string, never>;
    }
    expectTypeOf<InferColorKeys<T>>().toEqualTypeOf<"blue500" | "gray100">();
  });

  it("does not return never when using base ThemeConfig annotation", () => {
    expectTypeOf<InferColorKeys<ThemeConfig>>().not.toBeNever();
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
    border: { thin: string; thick: string };
  }

  type Web = DesignTokensWeb<MyTheme>;

  it("variantColor: kebab keys become camelCase, numeric-suffix keys collapsed", () => {
    expectTypeOf<Web["variantColor"]>().toEqualTypeOf<
      ("primary" | "sidebarForeground" | "blue500")[]
    >();
  });

  it("variantText: typography keys become camelCase", () => {
    expectTypeOf<Web["variantText"]>().toEqualTypeOf<("h1" | "bodyLg")[]>();
  });

  it("variantShadow: shadow keys as camelCase", () => {
    expectTypeOf<Web["variantShadow"]>().toEqualTypeOf<("md" | "lg")[]>();
  });

  it("roundedOption: supports digit-prefix values like 2xl and 4xl", () => {
    expectTypeOf<Web["roundedOption"]>().toEqualTypeOf<
      ("sm" | "2xl" | "4xl")[]
    >();
  });

  it("borderOption: inferred from theme border keys", () => {
    expectTypeOf<Web["borderOption"]>().toEqualTypeOf<("thin" | "thick")[]>();
  });

  it("variantColor not never with base ThemeConfig", () => {
    expectTypeOf<
      DesignTokensWeb<ThemeConfig>["variantColor"]
    >().not.toBeNever();
  });
});

// ---- InferBorderOptions / InferRoundedOptions fallback ----

describe("InferBorderOptions / InferRoundedOptions defaults", () => {
  it("falls back to DefaultBorderValue when no border in theme", () => {
    interface T {
      colors: Record<string, string>;
      typography: Record<string, never>;
    }
    // No border → should use default type (not never)
    expectTypeOf<InferBorderOptions<T>>().not.toBeNever();
  });

  it("falls back to DefaultRoundedValue when no borderRadius in theme", () => {
    interface T {
      colors: Record<string, string>;
      typography: Record<string, never>;
    }
    expectTypeOf<InferRoundedOptions<T>>().not.toBeNever();
  });
});
