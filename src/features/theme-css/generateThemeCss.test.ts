import { describe, it, expect } from "vitest";

import { ThemeConfig } from "../../core/ThemeConfig";

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
      themes: {
        dark: {
          colors: { primary: "#0A84FF" },
        },
      },
    };
    const css = generateThemeCss(config);
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain("--sg-primary: #0A84FF;");
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
