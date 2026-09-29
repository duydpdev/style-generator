import { describe, it, expect } from "vitest";

import type { ThemeConfig } from "../../core/themeSchema";

import { generateThemeCss } from "./generateThemeCss";

describe("generateThemeCss", () => {
  it("should generate CSS vars for flat colors", () => {
    const config: ThemeConfig = {
      colors: { primary: "#007AFF", secondary: "#FF9500" },
      typography: {
        body: {
          fontSize: "16px",
          lineHeight: "1.5",
          fontWeight: 400,
          letterSpacing: "0",
        },
      },
    };
    const css = generateThemeCss(config);
    expect(css).toContain("--sg-primary: #007AFF;");
    expect(css).toContain("--sg-secondary: #FF9500;");
    expect(css).toContain("--color-primary: var(--sg-primary);");
    expect(css).toContain("--color-secondary: var(--sg-secondary);");
    expect(css).toContain("@theme inline");
  });

  it("should convert camelCase color keys to kebab-case vars", () => {
    const config: ThemeConfig = {
      colors: { sidebarForeground: "#fff", primaryBlue: "#007" },
      typography: {
        body: {
          fontSize: "16px",
          lineHeight: "1.5",
          fontWeight: 400,
          letterSpacing: "0",
        },
      },
    };
    const css = generateThemeCss(config);
    expect(css).toContain("--sg-sidebar-foreground: #fff;");
    expect(css).toContain("--sg-primary-blue: #007;");
    expect(css).toContain(
      "--color-sidebar-foreground: var(--sg-sidebar-foreground);",
    );
  });

  it("should generate dark theme override block", () => {
    const config: ThemeConfig = {
      colors: { primary: "#007AFF" },
      typography: {
        body: {
          fontSize: "16px",
          lineHeight: "1.5",
          fontWeight: 400,
          letterSpacing: "0",
        },
      },
      themeAxes: {
        theme: {
          dark: {
            colors: { primary: "#0A84FF" },
          },
        },
      },
    };
    const css = generateThemeCss(config);
    expect(css).toContain('html[data-theme="dark"]');
    expect(css).toContain("--sg-primary: #0A84FF;");
  });

  it("emits multiple axes after :root, in declaration order (both axes and variants)", () => {
    const config: ThemeConfig = {
      colors: { primary: "#007AFF", secondary: "#FF9500" },
      themeAxes: {
        theme: {
          dark: { colors: { primary: "#0A84FF" } },
        },
        palette: {
          forest: { colors: { primary: "#2f5f47" } },
          sunset: { colors: { primary: "#b23a1b" } },
        },
      },
    };
    const css = generateThemeCss(config);
    const rootIndex = css.indexOf(":root");
    const themeIndex = css.indexOf('html[data-theme="dark"]');
    const forestIndex = css.indexOf('html[data-palette="forest"]');
    const sunsetIndex = css.indexOf('html[data-palette="sunset"]');
    expect(rootIndex).toBeGreaterThanOrEqual(0);
    expect(themeIndex).toBeGreaterThan(rootIndex);
    expect(forestIndex).toBeGreaterThan(themeIndex);
    expect(sunsetIndex).toBeGreaterThan(forestIndex);
  });

  it("reversing axis/variant declaration order reverses the output order", () => {
    const config: ThemeConfig = {
      colors: { primary: "#007AFF" },
      themeAxes: {
        palette: {
          sunset: { colors: { primary: "#b23a1b" } },
          forest: { colors: { primary: "#2f5f47" } },
        },
        theme: {
          dark: { colors: { primary: "#0A84FF" } },
        },
      },
    };
    const css = generateThemeCss(config);
    const sunsetIndex = css.indexOf('html[data-palette="sunset"]');
    const forestIndex = css.indexOf('html[data-palette="forest"]');
    const themeIndex = css.indexOf('html[data-theme="dark"]');
    expect(sunsetIndex).toBeGreaterThanOrEqual(0);
    expect(forestIndex).toBeGreaterThan(sunsetIndex);
    expect(themeIndex).toBeGreaterThan(forestIndex);
  });

  it("should generate shadow namespace vars", () => {
    const config: ThemeConfig = {
      colors: { primary: "#007AFF" },
      typography: {
        body: {
          fontSize: "16px",
          lineHeight: "1.5",
          fontWeight: 400,
          letterSpacing: "0",
        },
      },
      shadows: { sm: "0px 1px 2px rgba(0,0,0,0.05)" },
    };
    const css = generateThemeCss(config);
    expect(css).toContain("--sg-shadow-sm: 0px 1px 2px rgba(0,0,0,0.05);");
    expect(css).toContain("--shadow-sm: var(--sg-shadow-sm);");
  });

  it("should generate borderRadius namespace vars", () => {
    const config: ThemeConfig = {
      colors: { primary: "#007AFF" },
      typography: {
        body: {
          fontSize: "16px",
          lineHeight: "1.5",
          fontWeight: 400,
          letterSpacing: "0",
        },
      },
      borderRadius: { md: "8px" },
    };
    const css = generateThemeCss(config);
    expect(css).toContain("--sg-radius-md: 8px;");
    expect(css).toContain("--radius-md: var(--sg-radius-md);");
  });

  it("maps each category only into its own @theme namespace", () => {
    const config: ThemeConfig = {
      colors: { primary: "#007AFF" },
      shadows: { sm: "0 1px 2px #0000000d" },
      borderRadius: { md: "8px" },
      backDropBlurs: { sm: "4px" },
    };
    const themeBlock = generateThemeCss(config).split("@theme inline")[1];
    expect(themeBlock).toContain("--color-primary: var(--sg-primary);");
    expect(themeBlock).toContain("--shadow-sm: var(--sg-shadow-sm);");
    expect(themeBlock).toContain("--radius-md: var(--sg-radius-md);");
    expect(themeBlock).toContain(
      "--backdrop-blur-sm: var(--sg-backdrop-blur-sm);",
    );
    expect(themeBlock).not.toMatch(/--color-(shadow|radius|backdrop-blur)-/);
  });

  it("should return minimal output for empty config", () => {
    const config: ThemeConfig = {
      colors: {},
      typography: {
        body: {
          fontSize: "16px",
          lineHeight: "1.5",
          fontWeight: 400,
          letterSpacing: "0",
        },
      },
    };
    const css = generateThemeCss(config);
    // No colors or shadows → no :root block, no @theme
    expect(css).toBe("\n");
  });
});
