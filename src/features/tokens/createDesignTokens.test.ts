import { describe, it, expect } from "vitest";

import { ThemeConfig } from "../../core/ThemeConfig";

import { createDesignTokens } from "./createDesignTokens";

describe("createDesignTokens", () => {
  const mockTheme: ThemeConfig = {
    colors: {
      base: {
        primary: "#007AFF",
      },
      text: {
        main: "#000000",
        muted: {
          DEFAULT: "#666666",
          darker: "#333333",
        },
      },
      common: {
        white: "#FFFFFF",
      },
    },
    typography: {
      h1: {
        fontSize: "32px",
        lineHeight: "40px",
        fontWeight: 700,
        letterSpacing: "0",
      },
    },
    shadows: {
      md: "0 4px 6px shadow",
    },
  };

  it("should extract variantTextColor correctly with nesting and DEFAULT", () => {
    const result = createDesignTokens(mockTheme);
    expect(result.DesignTokens.Web.variantTextColor).toContain("main");
    expect(result.DesignTokens.Web.variantTextColor).toContain("muted");
    expect(result.DesignTokens.Web.variantTextColor).toContain("mutedDarker");
    // DEFAULT itself should be converted to an empty string in the helper but we filter(Boolean) later or handle it.
    // In createDesignTokens, it's pushed as "" which is then filtered out in variantColor.
  });

  it("should merge all color keys into variantColor", () => {
    const result = createDesignTokens(mockTheme);
    const colors = result.DesignTokens.Web.variantColor;
    expect(colors).toContain("primary");
    expect(colors).toContain("main");
    expect(colors).toContain("muted");
    expect(colors).toContain("mutedDarker");
    expect(colors).toContain("white");
  });

  it("should extract typography keys", () => {
    const result = createDesignTokens(mockTheme);
    expect(result.DesignTokens.Web.variantText).toEqual(["h1"]);
  });

  it("should extract shadow keys", () => {
    const result = createDesignTokens(mockTheme);
    expect(result.DesignTokens.Web.variantShadow).toEqual(["md"]);
  });

  it("should include screens and breakpoints", () => {
    const result = createDesignTokens(mockTheme, { breakpoints: ["md"] });
    expect(result.DesignTokens.Web.breakpoints).toEqual(["md"]);
    expect(result.DesignTokens.Web.screens).toHaveProperty("md");
  });
  it("should handle nested base colors correctly", () => {
    const themeWithNestedBase: ThemeConfig = {
      ...mockTheme,
      colors: {
        ...mockTheme.colors,
        base: {
          primary: "#007AFF",
          blue: {
            "500": "#3B82F6",
            "600": "#2563EB",
          },
        },
      },
    };
    const result = createDesignTokens(themeWithNestedBase);
    const colors = result.DesignTokens.Web.variantColor;
    expect(colors).toContain("primary");
    expect(colors).toContain("blue500");
    expect(colors).toContain("blue600");
  });
});
