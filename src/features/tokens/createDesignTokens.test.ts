import { describe, it, expect } from "vitest";

import { resolveOptions } from "../../core/resolveOptions";
import type { ThemeConfig } from "../../core/themeSchema";
import { toKebabCase } from "../../shared/helpers";
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

  it("should extract camelCase color keys into colors", () => {
    const result = createDesignTokens(mockTheme);
    const colors = result.DesignTokens.Web.colors;
    expect(colors).toContain("primary");
    expect(colors).toContain("main");
    expect(colors).toContain("sidebarForeground");
    expect(colors).toContain("white");
  });

  it("should convert kebab-case color keys to camelCase in colors", () => {
    const theme: ThemeConfig = {
      ...mockTheme,
      colors: {
        "primary-blue": "#007",
        "sidebar-foreground": "#fff",
      },
    };
    const result = createDesignTokens(theme);
    const colors = result.DesignTokens.Web.colors;
    expect(colors).toContain("primaryBlue");
    expect(colors).toContain("sidebarForeground");
  });

  it("should extract typography keys", () => {
    const result = createDesignTokens(mockTheme);
    expect(result.DesignTokens.Web.typography).toEqual(["h1"]);
  });

  it("should extract shadow keys", () => {
    const result = createDesignTokens(mockTheme);
    expect(result.DesignTokens.Web.shadows).toEqual(["md"]);
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
    expect(empty.DesignTokens.Web.borderWidth).toEqual(["0", "1", "2", "4"]);
    expect(empty.DesignTokens.Web.borderRadius).toEqual(
      omitted.DesignTokens.Web.borderRadius,
    );
  });

  it("aliasedColors lists the camelCased colors whose value is a $alias, in declaration order", () => {
    const { aliasedColors } = createDesignTokens({
      colors: {
        blue500: "#3B82F6",
        primary: "$blue500",
        "sidebar-accent": "$primary",
        plain: "#fff",
      },
    }).DesignTokens.Web;
    expect(aliasedColors).toEqual(["primary", "sidebarAccent"]);
  });

  it("aliasedColors is empty when no color is an alias", () => {
    expect(
      createDesignTokens({ colors: { primary: "#fff" } }).DesignTokens.Web
        .aliasedColors,
    ).toEqual([]);
  });

  it("aliasedColors includes holders that exist only in a themeAxes override, once, camelCased", () => {
    const { aliasedColors } = createDesignTokens({
      colors: {
        blue500: "#3B82F6",
        primary: "$blue500",
        accent: "#f00",
        "sidebar-ring": "#111",
        plain: "#fff",
      },
      themeAxes: {
        theme: {
          dark: { colors: { accent: "$blue500", primary: "$blue500" } },
          dim: { colors: { accent: "$primary" } },
        },
        palette: { sand: { colors: { "sidebar-ring": "$blue500" } } },
      },
    }).DesignTokens.Web;
    expect(aliasedColors).toEqual(["primary", "accent", "sidebarRing"]);
  });

  it('aliasedColors matches the holders coverage.keys "aliased" keeps', () => {
    const theme: ThemeConfig = {
      colors: { blue500: "#00f", primary: "$blue500", "sidebar-ring": "#111" },
      themeAxes: {
        theme: { dark: { colors: { "sidebar-ring": "$blue500" } } },
      },
    };
    const { aliasedColors } = createDesignTokens(theme).DesignTokens.Web;
    const line = generateSourceInline(
      theme,
      resolveOptions({ coverage: { colors: { keys: "aliased" } } }),
    )
      .split("\n")
      .find((l) => l.includes("{bg,"));
    expect(line).toBeDefined();
    for (const key of aliasedColors) {
      expect(line).toContain(toKebabCase(key));
    }
    expect(line).not.toContain("blue-500");
  });

  it("tolerates an unvalidated theme without colors or with non-string values", () => {
    const bad = {
      colors: { primary: 1, ok: "$x" },
    } as unknown as ThemeConfig;
    expect(createDesignTokens(bad).DesignTokens.Web.aliasedColors).toEqual([
      "ok",
    ]);
    const noColors = {} as unknown as ThemeConfig;
    const web = createDesignTokens(noColors).DesignTokens.Web;
    expect(web.aliasedColors).toEqual([]);
    expect(web.colors).toEqual([]);
  });

  it("spacingProperties are the custom spacing.properties keys, else the defaults", () => {
    const theme = { colors: { primary: "#fff" } };
    expect(
      createDesignTokens(theme, {
        spacing: { properties: { inset: ["inset"] } },
      }).DesignTokens.Web.spacingProperties,
    ).toEqual(["inset"]);
    expect(
      createDesignTokens(theme).DesignTokens.Web.spacingProperties,
    ).toContain("px");
  });

  it("screens merge the default screens with options.screens", () => {
    const { screens } = createDesignTokens(
      { colors: { primary: "#fff" } },
      { screens: { md: "800px", "3xl": "1920px" } },
    ).DesignTokens.Web;
    expect(screens).toEqual({
      sm: "640px",
      md: "800px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "3xl": "1920px",
    });
  });
});
