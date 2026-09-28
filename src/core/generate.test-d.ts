import { describe, it, expectTypeOf } from "vitest";

import { defineTheme } from "./defineTheme";
import { generate } from "./generate";

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

  it("return shape is exactly { css, tokens } — no legacy plugin/safelist/themeCss fields", () => {
    expectTypeOf<keyof typeof result>().toEqualTypeOf<"css" | "tokens">();
  });

  it("css is typed string", () => {
    expectTypeOf(result.css).toEqualTypeOf<string>();
  });

  it("DesignTokens.Web.variantColor is literal camelCase union", () => {
    expectTypeOf(result.tokens.Web.variantColor).toEqualTypeOf<
      ("primary" | "primaryForeground" | "sidebarForeground" | "blue500")[]
    >();
  });

  it("DesignTokens.Web.variantText is typography keys", () => {
    expectTypeOf(result.tokens.Web.variantText).toEqualTypeOf<
      ("h1" | "bodyLg")[]
    >();
  });

  it("DesignTokens.Web.roundedOption preserves digit-prefix tokens", () => {
    expectTypeOf(result.tokens.Web.roundedOption).toEqualTypeOf<
      ("sm" | "2xl")[]
    >();
  });
});
