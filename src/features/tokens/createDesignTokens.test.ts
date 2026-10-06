import { describe, it, expect } from "vitest";

import type { ThemeConfig } from "../../core/themeSchema";
import { generateSourceInline } from "../registry/generateSourceInline";

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

  it("defaults breakpoints to the same keys the `@source inline` responsive variants cover", () => {
    const { breakpoints } = createDesignTokens(mockTheme).DesignTokens.Web;
    const sourceInline = generateSourceInline({
      colors: { primary: "#007AFF" },
      borderRadius: { sm: "2px" },
    });

    expect(breakpoints).toEqual(["md", "lg"]);
    const variantGroup = breakpoints.map((bp) => bp + ":").join(",");
    expect(sourceInline).toContain('@source inline("{' + variantGroup + ",}");
  });

  it("treats an empty category record like an omitted one: default keys, as in @source inline", () => {
    const omitted = createDesignTokens({ colors: { primary: "#fff" } });
    const empty = createDesignTokens({
      colors: { primary: "#fff" },
      borderWidth: {},
      borderRadius: {},
    });
    expect(empty.DesignTokens.Web.borderWidthOption).toEqual([
      "0",
      "1",
      "2",
      "4",
    ]);
    expect(empty.DesignTokens.Web.roundedOption).toEqual(
      omitted.DesignTokens.Web.roundedOption,
    );
  });
});
