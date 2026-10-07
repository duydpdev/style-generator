import { describe, it, expect } from "vitest";

import type { StyleGeneratorOptions } from "../../core/Options";
import { resolveOptions } from "../../core/resolveOptions";
import type { ThemeConfig } from "../../core/themeSchema";

import { generateSourceInline as generateResolved } from "./generateSourceInline";

const generateSourceInline = (
  theme: ThemeConfig,
  options: StyleGeneratorOptions = {},
): string => generateResolved(theme, resolveOptions(options));

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

  it("detects siblings on camelCased keys, so a kebab-case theme key still gets its state line", () => {
    const theme: ThemeConfig = {
      colors: { primary: "#fff", "primary-hover": "#eee" },
    };
    const css = generateSourceInline(theme, { spacing: { enabled: false } });

    expect(css).toContain(
      '@source inline("hover:{bg,text,border}-{primary-hover}");',
    );
  });

  it("omits a state line entirely when no token has a sibling for it", () => {
    const theme: ThemeConfig = { colors: { primary: "#fff", danger: "#f00" } };
    const css = generateSourceInline(theme, { spacing: { enabled: false } });

    expect(css).not.toMatch(/hover:|active:/);
  });
});

describe("generateSourceInline coverage", () => {
  const base: StyleGeneratorOptions = { spacing: { enabled: false } };
  const theme: ThemeConfig = {
    colors: {
      primary: "#fff",
      primaryHover: "#eee",
      brand: "$primary",
      brandHover: "$primaryHover",
    },
    shadows: { soft: "0 1px 2px #000", lifted: "$soft" },
    borderRadius: { sm: "2px", pill: "$sm" },
    themeAxes: {
      theme: {
        dark: { colors: { brandHover: "$brand" } },
      },
    },
  } as ThemeConfig;
  const linesOf = (options: StyleGeneratorOptions): string[] =>
    generateSourceInline(theme, { ...base, ...options })
      .trim()
      .split("\n");

  it("is byte-identical for absent, `true` and `{}` coverage entries", () => {
    const absent = generateSourceInline(theme, base);
    const explicit = generateSourceInline(theme, {
      ...base,
      coverage: { colors: true, shadows: {}, borderRadius: { keys: "all" } },
    });
    expect(explicit).toBe(absent);
  });

  it("`false` drops the category's lines, state lines included", () => {
    const lines = linesOf({ coverage: { colors: false } });
    expect(lines.some((l) => l.includes("{bg,text,border}"))).toBe(false);
    expect(lines.some((l) => l.startsWith('@source inline("hover:'))).toBe(
      false,
    );
    expect(lines.some((l) => l.includes("shadow"))).toBe(true);
  });

  it("`prefixes` keeps only the listed class prefixes, in descriptor order", () => {
    const lines = linesOf({
      coverage: {
        colors: { prefixes: ["text", "bg"] },
        borderRadius: { prefixes: ["rounded-t", "rounded"] },
      },
    });
    expect(lines).toContain(
      '@source inline("{bg,text}-{primary,primary-hover,brand,brand-hover}");',
    );
    expect(lines).toContain(
      '@source inline("hover:{bg,text}-{primary-hover,brand-hover}");',
    );
    expect(lines).toContain(
      '@source inline("{md:,lg:,}{rounded,rounded-t}-{sm,pill}");',
    );
  });

  it('`keys: "aliased"` keeps the alias holders and drops the primitives they point to', () => {
    const lines = linesOf({
      coverage: { colors: { keys: "aliased" }, shadows: { keys: "aliased" } },
    });
    // `brand` and `brandHover` hold `$` aliases; `primary`/`primaryHover`
    // are only their targets (consumed through `var(--sg-*)`), so no class.
    expect(lines).toContain(
      '@source inline("{bg,text,border}-{brand,brand-hover}");',
    );
    expect(lines).toContain(
      '@source inline("hover:{bg,text,border}-{brand-hover}");',
    );
    expect(lines).toContain('@source inline("{shadow}-{lifted}");');
    expect(lines.some((l) => l.includes("primary"))).toBe(false);
  });

  it('`keys: "aliased"` keeps a key that only holds an alias in a `themeAxes` override', () => {
    const lines = generateSourceInline(
      {
        colors: { primary: "#fff", accent: "#00f" },
        themeAxes: { theme: { dark: { colors: { primary: "$accent" } } } },
      } as ThemeConfig,
      { ...base, coverage: { colors: { keys: "aliased" } } },
    );
    expect(lines).toContain('@source inline("{bg,text,border}-{primary}");');
  });

  it('`keys: "aliased"` along an alias chain keeps every holder, not the end of the chain', () => {
    const lines = generateSourceInline(
      { colors: { x: "$y", y: "$z", z: "#fff" } },
      { ...base, coverage: { colors: { keys: "aliased" } } },
    );
    expect(lines).toContain('@source inline("{bg,text,border}-{x,y}");');
  });

  it('`keys: "aliased"` emits a state line only when both the token and its sibling hold aliases', () => {
    const options: StyleGeneratorOptions = {
      ...base,
      coverage: { colors: { keys: "aliased" } },
    };
    const both = generateSourceInline(
      {
        colors: {
          blue600: "#00f",
          primary: "$blue600",
          primaryHover: "$blue600",
        },
      },
      options,
    );
    expect(both).toContain(
      '@source inline("hover:{bg,text,border}-{primary-hover}");',
    );

    const onlySibling = generateSourceInline(
      {
        colors: { blue600: "#00f", primary: "#fff", primaryHover: "$blue600" },
      },
      options,
    );
    expect(onlySibling).toContain(
      '@source inline("{bg,text,border}-{primary-hover}");',
    );
    expect(onlySibling).not.toContain("hover:");
  });

  it('`keys: "aliased"` emits no line for a category without any alias', () => {
    const lines = generateSourceInline(
      { colors: { primary: "#fff", secondary: "#000" } },
      { ...base, coverage: { colors: { keys: "aliased" } } },
    );
    expect(lines).not.toContain("{bg,text,border}");
  });

  it('`keys: "aliased"` emits nothing for a category with no declared keys (defaults are never aliased)', () => {
    const lines = linesOf({
      coverage: { borderWidth: { keys: "aliased" } },
    });
    expect(lines.some((l) => l.includes("border-x"))).toBe(false);
  });

  it("counts a `$` alias only within its own category", () => {
    const lines = generateSourceInline(
      {
        colors: { primary: "#fff" },
        shadows: { soft: "0 1px 2px #000", lifted: "$soft" },
      },
      {
        ...base,
        coverage: { colors: { keys: "aliased" }, shadows: { keys: "aliased" } },
      },
    );
    expect(lines).not.toContain("{bg,text,border}");
    expect(lines).toContain('@source inline("{shadow}-{lifted}");');
  });

  it("composes `prefixes` with `keys`", () => {
    const lines = linesOf({
      coverage: { colors: { prefixes: ["bg"], keys: "aliased" } },
    });
    expect(lines).toContain('@source inline("{bg}-{brand,brand-hover}");');
    expect(lines).toContain('@source inline("hover:{bg}-{brand-hover}");');
  });
});
