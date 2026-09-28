import { describe, it, expect } from "vitest";
import postcss, { Rule } from "postcss";

import { generate } from "../core/generate";
import { defineTheme } from "../core/defineTheme";

import { compileFixtureCss } from "./compileFixtureCss";

/**
 * End-to-end: feed `css` from generate() into the real Tailwind v4
 * compiler, then build CSS for a candidate class list. Asserts that:
 *   - color CSS variables appear in :root
 *   - data-theme override block emits when `themes` set
 *   - bg-/text- color utilities resolve to var() refs
 *   - generated CSS contains no raw error markers
 *   - no `*` selector rule redeclares a spacing var (D8 fix regression guard)
 *   - `@source inline` makes every `sp-*` utility appear with an empty
 *     candidate list, and disappear again without it (negative control)
 *
 * This is a regression guard against breaking changes in Tailwind v4 internals.
 */
describe("integration: Tailwind v4 compile pipeline", () => {
  const theme = defineTheme({
    colors: {
      primary: "#3B82F6",
      background: "#FFFFFF",
      sidebarForeground: "#111827",
    },
    typography: {
      h1: {
        fontSize: "32px",
        lineHeight: "40px",
        fontWeight: 700,
        letterSpacing: "0",
      },
    },
    themes: {
      dark: { colors: { primary: "#60A5FA", background: "#111827" } },
    },
  });

  const buildCss = async (
    extraInput = "",
    candidates: string[] = ["bg-primary", "text-sidebar-foreground"],
  ): Promise<string> => {
    const { css: themeCss } = generate(theme);
    return compileFixtureCss(`${themeCss}\n${extraInput}`, candidates);
  };

  it("emits :root with --sg-primary intermediate var", async () => {
    const css = await buildCss();
    expect(css).toMatch(/--sg-primary:\s*#3B82F6/i);
    expect(css).toMatch(/--sg-sidebar-foreground:\s*#111827/i);
  });

  it("emits dark theme override block", async () => {
    const css = await buildCss();
    expect(css).toMatch(/\[data-theme=["']dark["']\]/);
    expect(css).toMatch(/--sg-primary:\s*#60A5FA/i);
  });

  it("resolves utilities through @theme inline mapping to --sg-* vars", async () => {
    const css = await buildCss();
    expect(css).toMatch(/\.bg-primary\s*\{[^}]*var\(--sg-primary\)/);
    expect(css).toMatch(
      /\.text-sidebar-foreground\s*\{[^}]*var\(--sg-sidebar-foreground\)/,
    );
  });

  it("compiled CSS has no error markers", async () => {
    const css = await buildCss();
    expect(css).not.toMatch(/error|undefined/i);
  });

  it("compiled CSS never redeclares a spacing var inside a `*` selector rule (D8 fix, AC12)", async () => {
    // Tailwind's own Preflight (`*, ::after, ::before, ... { box-sizing: ... }`)
    // and its `@property` browser-compat polyfill (`@layer properties { ...
    // *, ::before, ::after, ::backdrop { --x: initial } ... }`) are expected
    // framework `*` rules, unrelated to spacing — the polyfill is excluded
    // below since it is nested inside `@layer properties` specifically. The
    // D8 bug this guards against is a `*` rule declaring an old `tw-sp-*`,
    // `sp-*`, or new `sg-sp-*` spacing custom property anywhere else — that
    // pattern must never reappear under any other selector, in any layer.
    const css = await buildCss();
    const root = postcss.parse(css);

    const propertiesLayerRules = new Set<Rule>();
    root.walkAtRules("layer", (layer) => {
      if (layer.params !== "properties") return;
      layer.walkRules((r) => {
        propertiesLayerRules.add(r);
      });
    });

    const offending: string[] = [];
    root.walkRules((rule) => {
      if (propertiesLayerRules.has(rule)) return;
      if (!rule.selectors.map((s) => s.trim()).includes("*")) return;

      rule.walkDecls((decl) => {
        if (/^-{2}(?:sg-)?sp-|^-{2}tw-sp-/.test(decl.prop)) {
          offending.push(`${rule.selector} { ${decl.prop}: ${decl.value} }`);
        }
      });
    });

    expect(offending).toEqual([]);
  });

  it("build([]) still emits .sp-p (and its @media fallback) via @source inline", async () => {
    const { css: themeCss } = generate(theme);
    const compiled = await compileFixtureCss(themeCss, []);
    expect(compiled).toMatch(/\.sp-p\s*\{/);
    expect(compiled).toMatch(/@media \(width >= 768px\)/);
  });

  it("negative control: without @source inline, build([]) never emits .sp-p", async () => {
    const { css: themeCss } = generate(theme);
    expect(themeCss).toMatch(/@source inline\(/);
    const withoutSourceInline = themeCss.replace(
      /@source inline\([^)]*\);\n?/,
      "",
    );
    expect(withoutSourceInline).not.toMatch(/@source inline/);

    const compiled = await compileFixtureCss(withoutSourceInline, []);
    expect(compiled).not.toMatch(/\.sp-p\s*\{/);
  });
});
