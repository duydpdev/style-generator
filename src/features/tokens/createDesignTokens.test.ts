import { describe, it, expect } from "vitest";

import { ThemeConfig } from "../../core/ThemeConfig";

import { createDesignTokens } from "./createDesignTokens";

describe("createDesignTokens", () => {
  const mockTheme: ThemeConfig = {
    colors: {
      primary: "#007AFF",
      main: "#000000",
      sidebarForeground: "#666666",
      white: "#FFFFFF",
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

  it("should extract camelCase color keys into variantColor", () => {
    const result = createDesignTokens(mockTheme);
    const colors = result.DesignTokens.Web.variantColor;
    expect(colors).toContain("primary");
    expect(colors).toContain("main");
    expect(colors).toContain("sidebarForeground");
    expect(colors).toContain("white");
  });

  it("should convert kebab-case color keys to camelCase in variantColor", () => {
    const theme: ThemeConfig = {
      ...mockTheme,
      colors: {
        "primary-blue": "#007",
        "sidebar-foreground": "#fff",
      },
    };
    const result = createDesignTokens(theme);
    const colors = result.DesignTokens.Web.variantColor;
    expect(colors).toContain("primaryBlue");
    expect(colors).toContain("sidebarForeground");
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
});
