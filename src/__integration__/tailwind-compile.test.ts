import { describe, it, expect } from "vitest";
import type { Rule } from "postcss";
import postcss from "postcss";

import { generate } from "../core/generate";

import { fixtureTheme } from "./__fixtures__/fixtureTheme";
import { compileFixtureCss } from "./compileFixtureCss";

/**
 * Declarations of every rule whose selector is exactly `selector`, as
 * `prop → value`. Later declarations win, as in the cascade.
 * @param {string} css - Compiled CSS
 * @param {string} selector - Exact rule selector to collect
 * @returns {Map<string, string>} Declarations found under that selector
 */
const declsOf = (css: string, selector: string): Map<string, string> => {
  const decls = new Map<string, string>();
  postcss.parse(css).walkRules((rule) => {
    if (rule.selector !== selector) return;
    rule.walkDecls((decl) => {
      decls.set(decl.prop, decl.value);
    });
  });
  return decls;
};

/**
 * End-to-end: feed `css` from generate() into the real Tailwind v4
 * compiler, then build CSS for a candidate class list. Asserts that:
 *   - color CSS variables appear in :root
 *   - data-theme override block emits when `themeAxes` set (html-pinned)
 *   - bg-/text- color utilities resolve to var() refs
 *   - generated CSS contains no raw error markers
 *   - no `*` selector rule redeclares a spacing var (D8 fix regression guard)
 *   - `@source inline` makes every `sp-*` utility appear with an empty
 *     candidate list, and disappear again without it (negative control)
 *
 * This is a regression guard against breaking changes in Tailwind v4 internals.
 */
describe("integration: Tailwind v4 compile pipeline", () => {
  const theme = fixtureTheme;

  const buildCss = async (
    extraInput = "",
    candidates: string[] = ["bg-primary", "text-sidebar-foreground"],
  ): Promise<string> => {
    const { css: themeCss } = generate(theme);
    return compileFixtureCss(`${themeCss}\n${extraInput}`, candidates);
  };

  it("emits :root with --sg-* intermediate vars", async () => {
    const root = declsOf(await buildCss(), ":root");
    expect(root.get("--sg-primary")).toMatch(/^#3B82F6$/i);
    expect(root.get("--sg-sidebar-foreground")).toMatch(/^#111827$/i);
  });

  it("emits dark theme override block, pinned to html[data-theme]", async () => {
    const dark = declsOf(await buildCss(), 'html[data-theme="dark"]');
    expect(dark.get("--sg-primary")).toMatch(/^#60A5FA$/i);
  });

  it("resolves utilities through @theme inline mapping to --sg-* vars", async () => {
    const css = await buildCss();
    expect(declsOf(css, ".bg-primary").get("background-color")).toBe(
      "var(--sg-primary)",
    );
    expect(declsOf(css, ".text-sidebar-foreground").get("color")).toBe(
      "var(--sg-sidebar-foreground)",
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

  it("build([]) emits expected classes for all categories and extraSources via @source inline", async () => {
    const { css: themeCss } = generate(theme, {
      extraSources: ["hover:bg-{primary,secondary}"],
    });
    const compiled = await compileFixtureCss(themeCss, []);

    const selectors = [
      ".bg-primary",
      ".text-primary",
      ".border-primary",
      ".text-12-mono",
      ".shadow-sm",
      ".backdrop-blur-sm",
      ".rounded-2xl",
      ".md\\:rounded-2xl",
      ".border-thin",
      ".font-sans",
      ".sp-p",
      ".hover\\:bg-primary",
    ];

    for (const sel of selectors) {
      expect(compiled).toContain(sel);
    }
  });

  it("negative control: without @source inline, build([]) never emits classes", async () => {
    const { css: themeCss } = generate(theme);
    expect(themeCss).toMatch(/@source inline\(/);
    const withoutSourceInline = themeCss.replace(
      /@source inline\([^)]*\);\n?/g,
      "",
    );
    expect(withoutSourceInline).not.toMatch(/@source inline/);

    const compiled = await compileFixtureCss(withoutSourceInline, []);
    expect(compiled).not.toContain(".bg-primary");
    expect(compiled).not.toContain(".sp-p");
  });

  it('case @import "./theme.css": candidates still resolve when loading theme css via @import', async () => {
    // `underline` is a Tailwind static utility the registry never emits, so
    // it only shows up if the imported file's `@source inline` is honoured.
    const { css: themeCss } = generate(theme, {
      extraSources: ["underline"],
    });

    const compiled = await compileFixtureCss('@import "./theme.css";', [], {
      imports: { "theme.css": themeCss },
    });

    expect(declsOf(compiled, ".bg-primary").get("background-color")).toBe(
      "var(--sg-primary)",
    );
    expect(declsOf(compiled, ".underline").get("text-decoration-line")).toBe(
      "underline",
    );
    expect(compiled).toContain(".sp-p");
  });
});
