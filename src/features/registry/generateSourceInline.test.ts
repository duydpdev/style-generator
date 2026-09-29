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

  it("emits one @source inline state line per state that has a sibling pair", () => {
    const theme: ThemeConfig = {
      colors: {
        primary: "#fff",
        primaryHover: "#eee",
        primaryActive: "#ddd",
        danger: "#f00",
      },
    };
    const css = generateSourceInline(theme, { spacing: { enabled: false } });
    const lines = css.trim().split("\n");

    expect(lines).toContain(
      '@source inline("hover:{bg,text,border}-{primary-hover}");',
    );
    expect(lines).toContain(
      '@source inline("active:{bg,text,border}-{primary-active}");',
    );
  });

  it("never mixes different states' pairs into one line (no hover:...-primary-active)", () => {
    const theme: ThemeConfig = {
      colors: { primary: "#fff", primaryHover: "#eee" },
    };
    const css = generateSourceInline(theme, { spacing: { enabled: false } });

    expect(css).toMatch(
      /@source inline\("hover:\{bg,text,border\}-\{primary-hover\}"\);/,
    );
    expect(css).not.toMatch(/active:/);
  });

  it("omits a state line entirely when no token has a sibling for it", () => {
    const theme: ThemeConfig = { colors: { primary: "#fff", danger: "#f00" } };
    const css = generateSourceInline(theme, { spacing: { enabled: false } });

    expect(css).not.toMatch(/hover:|active:/);
  });
});
