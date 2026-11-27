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
      '@source inline("hover:{bg,text,border,ring,outline,divide,placeholder}-{primary-hover}");',
    );
    expect(lines).toContain(
      '@source inline("active:{bg,text,border,ring,outline,divide,placeholder}-{primary-active}");',
    );
  });

  it("never mixes different states' pairs into one line (no hover:...-primary-active)", () => {
    const theme: ThemeConfig = {
      colors: { primary: "#fff", primaryHover: "#eee" },
    };
    const css = generateSourceInline(theme, { spacing: { enabled: false } });

    expect(css).toMatch(
      /@source inline\("hover:\{bg,text,border,ring,outline,divide,placeholder\}-\{primary-hover\}"\);/,
    );
    expect(css).not.toMatch(/active:/);
  });

  it("detects siblings on camelCased keys, so a kebab-case theme key still gets its state line", () => {
    const theme: ThemeConfig = {
      colors: { primary: "#fff", "primary-hover": "#eee" },
    };
    const css = generateSourceInline(theme, { spacing: { enabled: false } });

    expect(css).toContain(
      '@source inline("hover:{bg,text,border,ring,outline,divide,placeholder}-{primary-hover}");',
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
  };
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
    expect(
      lines.some((l) =>
        l.includes("{bg,text,border,ring,outline,divide,placeholder}"),
      ),
    ).toBe(false);
    expect(lines.some((l) => l.startsWith('@source inline("hover:'))).toBe(
      false,
    );
    expect(lines.some((l) => l.includes("shadow"))).toBe(true);
  });

  it("`false` also drops the opacity group lines that a colors rule would emit", () => {
    const withGroups = linesOf({
      coverage: {
        colors: {
          opacities: [
            5,
            { steps: [32], prefixes: ["ring"], keys: ["primary"] },
          ],
        },
      },
    });
    expect(withGroups.some((l) => l.includes("/{5}"))).toBe(true);
    expect(withGroups).toContain('@source inline("{ring}-{primary}/{32}");');

    const dropped = linesOf({ coverage: { colors: false } });
    expect(dropped.some((l) => l.includes("/{"))).toBe(false);
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
      '@source inline("{bg,text,border,ring,outline,divide,placeholder}-{brand,brand-hover}");',
    );
    expect(lines).toContain(
      '@source inline("hover:{bg,text,border,ring,outline,divide,placeholder}-{brand-hover}");',
    );
    expect(lines).toContain('@source inline("{shadow}-{lifted}");');
    expect(lines.some((l) => l.includes("primary"))).toBe(false);
  });

  it('`keys: "aliased"` keeps a key that only holds an alias in a `themeAxes` override', () => {
    const lines = generateSourceInline(
      {
        colors: { primary: "#fff", accent: "#00f" },
        themeAxes: { theme: { dark: { colors: { primary: "$accent" } } } },
      },
      { ...base, coverage: { colors: { keys: "aliased" } } },
    );
    expect(lines).toContain(
      '@source inline("{bg,text,border,ring,outline,divide,placeholder}-{primary}");',
    );
  });

  it('`keys: "aliased"` along an alias chain keeps every holder, not the end of the chain', () => {
    const lines = generateSourceInline(
      { colors: { a: "$b", b: "$c", c: "#fff" } },
      { ...base, coverage: { colors: { keys: "aliased" } } },
    );
    expect(lines).toContain(
      '@source inline("{bg,text,border,ring,outline,divide,placeholder}-{a,b}");',
    );
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
      '@source inline("hover:{bg,text,border,ring,outline,divide,placeholder}-{primary-hover}");',
    );

    const onlySibling = generateSourceInline(
      {
        colors: { blue600: "#00f", primary: "#fff", primaryHover: "$blue600" },
      },
      options,
    );
    expect(onlySibling).toContain(
      '@source inline("{bg,text,border,ring,outline,divide,placeholder}-{primary-hover}");',
    );
    expect(onlySibling).not.toContain("hover:");
  });

  it('`keys: "aliased"` emits no line for a category without any alias', () => {
    const lines = generateSourceInline(
      { colors: { primary: "#fff", secondary: "#000" } },
      { ...base, coverage: { colors: { keys: "aliased" } } },
    );
    expect(lines).not.toContain(
      "{bg,text,border,ring,outline,divide,placeholder}",
    );
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
    expect(lines).not.toContain(
      "{bg,text,border,ring,outline,divide,placeholder}",
    );
    expect(lines).toContain('@source inline("{shadow}-{lifted}");');
  });

  it("composes `prefixes` with `keys`", () => {
    const lines = linesOf({
      coverage: { colors: { prefixes: ["bg"], keys: "aliased" } },
    });
    expect(lines).toContain('@source inline("{bg}-{brand,brand-hover}");');
    expect(lines).toContain('@source inline("hover:{bg}-{brand-hover}");');
  });

  it("`opacities` adds one ascending `/{…}` line right after the category line", () => {
    const lines = linesOf({ coverage: { colors: { opacities: [20, 10] } } });
    expect(lines.slice(0, 3)).toEqual([
      '@source inline("{bg,text,border,ring,outline,divide,placeholder}-{primary,primary-hover,brand,brand-hover}");',
      '@source inline("{bg,text,border,ring,outline,divide,placeholder}-{primary,primary-hover,brand,brand-hover}/{10,20}");',
      '@source inline("hover:{bg,text,border,ring,outline,divide,placeholder}-{primary-hover,brand-hover}");',
    ]);
  });

  it("without the `opacities` line the output is the option-less output, byte for byte", () => {
    const absent = generateSourceInline(theme, base);
    const withOpacities = generateSourceInline(theme, {
      ...base,
      coverage: { colors: { opacities: [10] } },
    });
    expect(
      withOpacities.replace(
        '@source inline("{bg,text,border,ring,outline,divide,placeholder}-{primary,primary-hover,brand,brand-hover}/{10}");\n',
        "",
      ),
    ).toBe(absent);
  });

  it("`opacities` follows `prefixes` and `keys` and never crosses the state lines", () => {
    const lines = linesOf({
      coverage: {
        colors: { prefixes: ["bg"], keys: "aliased", opacities: [10] },
      },
    });
    expect(lines).toContain('@source inline("{bg}-{brand,brand-hover}/{10}");');
    expect(lines).toContain('@source inline("hover:{bg}-{brand-hover}");');
    expect(lines.filter((l) => l.includes("/{"))).toHaveLength(1);
  });

  it("prefixes [bg, text, border] reproduces the 5.3 colors lines", () => {
    const lines = linesOf({
      coverage: { colors: { prefixes: ["bg", "text", "border"] } },
    });
    expect(lines).toContain(
      '@source inline("{bg,text,border}-{primary,primary-hover,brand,brand-hover}");',
    );
    expect(lines).toContain(
      '@source inline("hover:{bg,text,border}-{primary-hover,brand-hover}");',
    );
    const colorLines = lines.filter((l) => l.includes("primary"));
    expect(colorLines.length).toBeGreaterThan(0);
    expect(
      colorLines.some((l) => /ring|outline|divide|placeholder/.test(l)),
    ).toBe(false);
  });

  it("the opacity line follows the trimmed new prefixes", () => {
    const lines = linesOf({
      coverage: {
        colors: { prefixes: ["placeholder", "ring"], opacities: [50] },
      },
    });
    expect(lines).toContain(
      '@source inline("{ring,placeholder}-{primary,primary-hover,brand,brand-hover}/{50}");',
    );
  });

  it('`opacities` emits nothing when no key survives `keys: "aliased"`', () => {
    const css = generateSourceInline(
      { colors: { primary: "#fff" } },
      { ...base, coverage: { colors: { keys: "aliased", opacities: [10] } } },
    );
    expect(css).not.toContain("/{");
  });

  it("an opacity group adds its own narrow line after the plain-step line", () => {
    const lines = linesOf({
      coverage: {
        colors: {
          prefixes: ["bg", "text", "border"],
          opacities: [
            5,
            { steps: [32], prefixes: ["bg"], keys: ["brand", "primaryHover"] },
          ],
        },
      },
    });
    expect(lines.slice(0, 4)).toEqual([
      '@source inline("{bg,text,border}-{primary,primary-hover,brand,brand-hover}");',
      '@source inline("{bg,text,border}-{primary,primary-hover,brand,brand-hover}/{5}");',
      '@source inline("{bg}-{brand,primary-hover}/{32}");',
      '@source inline("hover:{bg,text,border}-{primary-hover,brand-hover}");',
    ]);
  });

  it("a group without prefixes or keys uses the rule's, with its steps ascending", () => {
    const lines = linesOf({
      coverage: {
        colors: { prefixes: ["bg"], opacities: [{ steps: [40, 32] }] },
      },
    });
    expect(lines).toContain(
      '@source inline("{bg}-{primary,primary-hover,brand,brand-hover}/{32,40}");',
    );
  });

  it("only groups emit no plain opacity line, and groups keep declaration order", () => {
    const lines = linesOf({
      coverage: {
        colors: {
          prefixes: ["bg"],
          opacities: [
            { steps: [32], keys: ["brand"] },
            { steps: [10], keys: ["primary"] },
          ],
        },
      },
    });
    expect(lines.filter((l) => l.includes("/{"))).toEqual([
      '@source inline("{bg}-{brand}/{32}");',
      '@source inline("{bg}-{primary}/{10}");',
    ]);
  });

  it('a group follows `keys: "aliased"` only when it names no keys', () => {
    const lines = linesOf({
      coverage: {
        colors: {
          prefixes: ["bg"],
          keys: "aliased",
          opacities: [{ steps: [32] }, { steps: [10], keys: ["primary"] }],
        },
      },
    });
    expect(lines).toContain('@source inline("{bg}-{brand,brand-hover}/{32}");');
    expect(lines).toContain('@source inline("{bg}-{primary}/{10}");');
  });
});

describe("generateSourceInline snapshots (learn-sql-like theme)", () => {
  const theme: ThemeConfig = {
    colors: {
      foreground: "#111",
      primary: "#222",
      primaryHover: "#333",
    },
  };

  it("default options", () => {
    expect(generateSourceInline(theme)).toMatchInlineSnapshot(`
      "@source inline("{bg,text,border,ring,outline,divide,placeholder}-{foreground,primary,primary-hover}");
      @source inline("hover:{bg,text,border,ring,outline,divide,placeholder}-{primary-hover}");
      @source inline("{md:,lg:,}{rounded,rounded-t,rounded-r,rounded-b,rounded-l}-{none,xs,sm,md,lg,xl,2xl,3xl,full}");
      @source inline("{border,border-x,border-y,border-t,border-r,border-b,border-l,border-s,border-e,divide-x,divide-y}-{0,1,2,4}");
      @source inline("sp-{p,px,py,pt,pb,pl,pr,m,mx,my,mt,mb,ml,mr,gap,gap-x,gap-y,top,right,bottom,left}");
      "
    `);
  });

  it("colors prefixes [bg, text, border] with plain opacities [5, 10, 15, 55]", () => {
    expect(
      generateSourceInline(theme, {
        coverage: {
          colors: {
            prefixes: ["bg", "text", "border"],
            opacities: [5, 10, 15, 55],
          },
        },
      }),
    ).toMatchInlineSnapshot(`
      "@source inline("{bg,text,border}-{foreground,primary,primary-hover}");
      @source inline("{bg,text,border}-{foreground,primary,primary-hover}/{5,10,15,55}");
      @source inline("hover:{bg,text,border}-{primary-hover}");
      @source inline("{md:,lg:,}{rounded,rounded-t,rounded-r,rounded-b,rounded-l}-{none,xs,sm,md,lg,xl,2xl,3xl,full}");
      @source inline("{border,border-x,border-y,border-t,border-r,border-b,border-l,border-s,border-e,divide-x,divide-y}-{0,1,2,4}");
      @source inline("sp-{p,px,py,pt,pb,pl,pr,m,mx,my,mt,mb,ml,mr,gap,gap-x,gap-y,top,right,bottom,left}");
      "
    `);
  });
});
