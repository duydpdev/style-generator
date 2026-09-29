import { describe, it, expect } from "vitest";

import type { ThemeConfig } from "../../core/themeSchema";

import { generateBorderWidthCss } from "./generateBorderWidthCss";

describe("generateBorderWidthCss", () => {
  it("returns an empty string when the theme omits borderWidth", () => {
    const theme: ThemeConfig = { colors: { primary: "#fff" } };
    expect(generateBorderWidthCss(theme)).toBe("");
  });

  it("returns an empty string when borderWidth is an empty object", () => {
    const theme: ThemeConfig = { colors: { primary: "#fff" }, borderWidth: {} };
    expect(generateBorderWidthCss(theme)).toBe("");
  });

  it("emits one @utility per side prefix, referencing the intermediate var", () => {
    const theme: ThemeConfig = {
      colors: { primary: "#fff" },
      borderWidth: { hairline: "1px" },
    };
    const css = generateBorderWidthCss(theme);

    expect(css).toContain(
      "@utility border-hairline {\n  border-width: var(--sg-border-width-hairline);\n}",
    );
    expect(css).toContain(
      "@utility border-x-hairline {\n  border-left-width: var(--sg-border-width-hairline);\n  border-right-width: var(--sg-border-width-hairline);\n}",
    );
    expect(css).toContain(
      "@utility border-y-hairline {\n  border-top-width: var(--sg-border-width-hairline);\n  border-bottom-width: var(--sg-border-width-hairline);\n}",
    );
    expect(css).toContain(
      "@utility border-t-hairline {\n  border-top-width: var(--sg-border-width-hairline);\n}",
    );
    expect(css).toContain(
      "@utility border-r-hairline {\n  border-right-width: var(--sg-border-width-hairline);\n}",
    );
    expect(css).toContain(
      "@utility border-b-hairline {\n  border-bottom-width: var(--sg-border-width-hairline);\n}",
    );
    expect(css).toContain(
      "@utility border-l-hairline {\n  border-left-width: var(--sg-border-width-hairline);\n}",
    );
  });

  it("kebab-cases camelCase borderWidth keys in both the class name and the var reference", () => {
    const theme: ThemeConfig = {
      colors: { primary: "#fff" },
      borderWidth: { extraThick: "8px" },
    };
    const css = generateBorderWidthCss(theme);
    expect(css).toContain("@utility border-extra-thick {");
    expect(css).toContain("var(--sg-border-width-extra-thick)");
  });

  it("emits one block per (key, side) pair for multiple keys", () => {
    const theme: ThemeConfig = {
      colors: { primary: "#fff" },
      borderWidth: { hairline: "1px", thick: "4px" },
    };
    const css = generateBorderWidthCss(theme);
    const utilityCount = (css.match(/@utility /g) ?? []).length;
    expect(utilityCount).toBe(2 * 7);
  });
});
