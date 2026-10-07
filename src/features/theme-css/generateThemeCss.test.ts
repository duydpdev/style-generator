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
    expect(css).toContain("--sg-color-primary: #007AFF;");
    expect(css).toContain("--sg-color-secondary: #FF9500;");
    expect(css).toContain("--color-primary: var(--sg-color-primary);");
    expect(css).toContain("--color-secondary: var(--sg-color-secondary);");
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
    expect(css).toContain("--sg-color-sidebar-foreground: #fff;");
    expect(css).toContain("--sg-color-primary-blue: #007;");
    expect(css).toContain(
      "--color-sidebar-foreground: var(--sg-color-sidebar-foreground);",
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
    expect(css).toContain("--sg-color-primary: #0A84FF;");
  });

  it("resolves an alias declared inside a variant override to the target's --sg var, pinned to html", () => {
    const config: ThemeConfig = {
      colors: { primary: "#007AFF", blue500: "#3B82F6" },
      themeAxes: {
        palette: { rose: { colors: { primary: "$blue500" } } },
      },
    };
    const css = generateThemeCss(config);
    const block = css.slice(css.indexOf('html[data-palette="rose"]'));
    expect(block).toMatch(
      /^html\[data-palette="rose"\] \{\s*--sg-color-primary: var\(--sg-color-blue-500\);\s*\}/,
    );
  });

  it("resolves one alias per category to the same category's --sg var", () => {
    // Distinct target keys per category, so a lookup in the wrong category
    // cannot produce the expected var by accident.
    const config: ThemeConfig = {
      colors: { brand: "#00f", primary: "$brand" },
      shadows: { soft: "0 1px #000", card: "$soft" },
      backDropBlurs: { light: "4px", panel: "$light" },
      borderRadius: { round: "4px", card: "$round" },
      fontFamily: { sans: "Inter", body: "$sans" },
      borderWidth: { hairline: "1px", card: "$hairline" },
    };
    const root = generateThemeCss(config).split(":root {")[1]?.split("}")[0];
    expect(root).toContain("--sg-color-primary: var(--sg-color-brand);");
    expect(root).toContain("--sg-shadow-card: var(--sg-shadow-soft);");
    expect(root).toContain(
      "--sg-backdrop-blur-panel: var(--sg-backdrop-blur-light);",
    );
    expect(root).toContain("--sg-radius-card: var(--sg-radius-round);");
    expect(root).toContain("--sg-font-body: var(--sg-font-sans);");
    expect(root).toContain(
      "--sg-border-width-card: var(--sg-border-width-hairline);",
    );
  });

  it("kebab-cases axis and variant names in html selectors", () => {
    const css = generateThemeCss({
      colors: { primary: "#fff" },
      themeAxes: { highContrast: { onDark: { colors: { primary: "#000" } } } },
    });
    expect(css).toMatch(
      /^html\[data-high-contrast="on-dark"\] \{\s*--sg-color-primary: #000;\s*\}/m,
    );
    expect(css).not.toMatch(/highContrast|onDark/);
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
    expect(themeBlock).toContain("--color-primary: var(--sg-color-primary);");
    expect(themeBlock).toContain("--shadow-sm: var(--sg-shadow-sm);");
    expect(themeBlock).toContain("--radius-md: var(--sg-radius-md);");
    expect(themeBlock).toContain(
      "--backdrop-blur-sm: var(--sg-backdrop-blur-sm);",
    );
    expect(themeBlock).not.toMatch(/--color-(shadow|radius|backdrop-blur)-/);
  });

  it("maps borderWidth keys into Tailwind's --border-width-* namespace, last in @theme inline", () => {
    const config: ThemeConfig = {
      colors: { primary: "#007AFF" },
      borderRadius: { md: "8px" },
      borderWidth: { thin: "1px", thick: "$thin" },
    };
    const themeBlock = generateThemeCss(config).split("@theme inline")[1] ?? "";
    const lines = themeBlock
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("--"));

    expect(lines.slice(-2)).toEqual([
      "--border-width-thin: var(--sg-border-width-thin);",
      "--border-width-thick: var(--sg-border-width-thick);",
    ]);
    expect(lines.indexOf("--radius-md: var(--sg-radius-md);")).toBeLessThan(
      lines.indexOf("--border-width-thin: var(--sg-border-width-thin);"),
    );
  });

  it("keeps a color named like another category's key in its own --sg-color- namespace", () => {
    const config: ThemeConfig = {
      colors: { shadowPrimary: "#ff0000", spP: "#00ff00" },
      shadows: { primary: "0 1px 2px #000" },
    };
    const css = generateThemeCss(config);
    expect(css).toContain("--sg-color-shadow-primary: #ff0000;");
    expect(css).toContain("--sg-shadow-primary: 0 1px 2px #000;");
    expect(css).toContain("--sg-color-sp-p: #00ff00;");
    expect(css).not.toMatch(/--sg-sp-p\b/);
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
