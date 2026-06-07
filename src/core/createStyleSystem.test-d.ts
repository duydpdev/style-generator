import { describe, it, expectTypeOf } from "vitest";

import { createStyleSystem } from "./createStyleSystem";
import { defineTheme } from "./defineTheme";

describe("createStyleSystem consumer shape", () => {
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

  const sys = createStyleSystem(theme, { breakpoints: ["md", "lg"] });

  it("DesignTokens.Web.variantColor is literal camelCase union", () => {
    expectTypeOf(sys.DesignTokens.Web.variantColor).toEqualTypeOf<
      ("primary" | "primaryForeground" | "sidebarForeground" | "blue500")[]
    >();
  });

  it("DesignTokens.Web.variantText is typography keys", () => {
    expectTypeOf(sys.DesignTokens.Web.variantText).toEqualTypeOf<
      ("h1" | "bodyLg")[]
    >();
  });

  it("DesignTokens.Web.roundedOption preserves digit-prefix tokens", () => {
    expectTypeOf(sys.DesignTokens.Web.roundedOption).toEqualTypeOf<
      ("sm" | "2xl")[]
    >();
  });

  it("safelist element type contains theme-derived literal classes", () => {
    type S = (typeof sys.safelist)[number];
    expectTypeOf<"text-primary">().toExtend<S>();
    expectTypeOf<"bg-sidebar-foreground">().toExtend<S>();
    expectTypeOf<"border-blue-500">().toExtend<S>();
    expectTypeOf<"shadow-md">().toExtend<S>();
  });

  it("safelist supports responsive prefix for responsive modules", () => {
    type S = (typeof sys.safelist)[number];
    expectTypeOf<"md:bg-primary">().toExtend<S>();
    expectTypeOf<"lg:text-sidebar-foreground">().toExtend<S>();
  });

  it("themeCss is typed string", () => {
    expectTypeOf(sys.themeCss).toEqualTypeOf<string>();
  });
});
