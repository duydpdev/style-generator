import { describe, it, expect } from "vitest";

import type { ThemeConfig } from "../../core/themeSchema";

import { generateSourceInline } from "./generateSourceInline";

describe("generateSourceInline", () => {
  const emptyTheme: ThemeConfig = { colors: { primary: "#fff" } };

  it("emits the sp-* brace-expansion line by default", () => {
    const css = generateSourceInline(emptyTheme);
    expect(css).toMatch(/@source inline\("sp-\{.*\}"\);\n$/);
  });

  it("omits the sp-* line when spacing is disabled", () => {
    const css = generateSourceInline(emptyTheme, {
      spacing: { enabled: false },
    });
    expect(css).not.toMatch(/sp-\{/);
  });

  it("appends one @source inline(...) line per extraSources entry after sp-*", () => {
    const css = generateSourceInline(emptyTheme, {
      extraSources: ["hover:bg-primary", "md:flex"],
    });
    const lines = css.trim().split("\n");
    expect(lines[lines.length - 3]).toMatch(/^@source inline\("sp-\{.*\}"\);$/);
    expect(lines[lines.length - 2]).toBe('@source inline("hover:bg-primary");');
    expect(lines[lines.length - 1]).toBe('@source inline("md:flex");');
  });

  it("still emits extraSources lines when spacing is disabled", () => {
    const css = generateSourceInline(emptyTheme, {
      spacing: { enabled: false },
      extraSources: ["hover:bg-primary"],
    });
    expect(css).toMatch(/@source inline\("hover:bg-primary"\);\n$/);
  });

  it("still emits lines for categories with defaultValues even when theme is empty and spacing is disabled", () => {
    const css = generateSourceInline(
      { colors: {} },
      { spacing: { enabled: false } },
    );
    // Default values for borderRadius and borderWidth are still emitted!
    expect(css).toMatch(/@source inline.*rounded/);
    expect(css).toMatch(/@source inline.*border/);
  });
});
