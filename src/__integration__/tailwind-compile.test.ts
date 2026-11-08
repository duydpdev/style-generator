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
    expect(root.get("--sg-color-primary")).toMatch(/^#3B82F6$/i);
    expect(root.get("--sg-color-sidebar-foreground")).toMatch(/^#111827$/i);
  });

  it("emits dark theme override block, pinned to html[data-theme]", async () => {
    const dark = declsOf(await buildCss(), 'html[data-theme="dark"]');
    expect(dark.get("--sg-color-primary")).toMatch(/^#60A5FA$/i);
  });

  it("resolves utilities through @theme inline mapping to --sg-* vars", async () => {
    const css = await buildCss();
    expect(declsOf(css, ".bg-primary").get("background-color")).toBe(
      "var(--sg-color-primary)",
    );
    expect(declsOf(css, ".text-sidebar-foreground").get("color")).toBe(
      "var(--sg-color-sidebar-foreground)",
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

  it("build([]) emits expected classes for all categories via @source inline", async () => {
    const { css: themeCss } = generate(theme);
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
      ".border-s-thin",
      ".divide-x-thin",
      ".font-sans",
      ".sp-p",
      ".hover\\:bg-primary",
    ];

    for (const sel of selectors) {
      expect(compiled).toContain(sel);
    }
  });

  it("coverage.colors.opacities builds the /<n> color classes via @source inline (build([]))", async () => {
    const { css: themeCss } = generate(theme, {
      coverage: { colors: { opacities: [10] } },
    });
    const compiled = await compileFixtureCss(themeCss, []);

    expect(compiled).toContain(".bg-primary\\/10");
    expect(compiled).toContain(".text-primary\\/10");
    expect(compiled).toContain(".border-primary\\/10");
    expect(
      declsOf(compiled, ".bg-primary\\/10").get("background-color"),
    ).toContain("var(--sg-color-primary) 10%");
    // Not crossed with the state lines.
    expect(compiled).not.toContain(".hover\\:bg-primary-hover\\/10");
  });

  it("negative control: without opacities, build([]) emits no /<n> color class", async () => {
    const compiled = await compileFixtureCss(generate(theme).css, []);
    expect(compiled).not.toContain(".bg-primary\\/10");
  });

  it("builds ring/outline/divide/placeholder color classes via @source inline (build([]))", async () => {
    const withMuted = {
      ...theme,
      colors: { ...theme.colors, muted: "#6B7280" },
    };
    const { css: themeCss } = generate(withMuted, {
      coverage: { colors: { opacities: [50] } },
    });
    const compiled = await compileFixtureCss(themeCss, []);

    expect(compiled).toContain(".ring-primary\\/50");
    const ring = declsOf(compiled, ".ring-primary\\/50").get("--tw-ring-color");
    expect(ring).toContain("var(--sg-color-primary)");
    expect(ring).toContain("50%");
    expect(
      declsOf(compiled, ".outline-primary").get("outline-color"),
    ).toContain("var(--sg-color-primary)");
    expect(declsOf(compiled, ".divide-primary").get("border-color")).toContain(
      "var(--sg-color-primary)",
    );
    expect(declsOf(compiled, ".placeholder-muted").get("color")).toContain(
      "var(--sg-color-muted)",
    );
  });

  it("negative control: coverage.colors.prefixes [bg] builds no ring/outline/divide/placeholder class", async () => {
    const { css: themeCss } = generate(theme, {
      coverage: { colors: { prefixes: ["bg"] } },
    });
    const compiled = await compileFixtureCss(themeCss, []);

    for (const cls of [
      ".ring-primary",
      ".outline-primary",
      ".divide-primary",
      ".placeholder-primary",
    ]) {
      expect(compiled).not.toContain(cls);
    }
  });

  // Tripwire: `--border-width-*` is an undocumented Tailwind theme namespace
  // (see `borderWidthCategory`). If a Tailwind release stops resolving
  // border widths from it, this fails instead of the classes silently
  // vanishing from consumers' CSS.
  it("borderWidth keys resolve through Tailwind's --border-width-* namespace for border, logical-side and divide utilities", async () => {
    const { css: themeCss } = generate(theme);
    const compiled = await compileFixtureCss(themeCss, [
      "border-thin",
      "border-s-thin",
      "divide-x-thin",
    ]);

    const border = declsOf(compiled, ".border-thin");
    expect(border.get("border-width")).toBe("var(--sg-border-width-thin)");
    // Tailwind's own rule shape: the style comes from its variable (see the
    // "Border-width utilities" section of the 4.x → 5.0 migration guide).
    expect(border.get("border-style")).toBe("var(--tw-border-style)");
    expect(
      declsOf(compiled, ".border-s-thin").get("border-inline-start-width"),
    ).toBe("var(--sg-border-width-thin)");
    const divide = new Map<string, string>();
    postcss.parse(compiled).walkRules((rule) => {
      if (!rule.selector.includes(".divide-x-thin")) return;
      rule.walkDecls((decl) => {
        divide.set(decl.prop, decl.value);
      });
    });
    expect(divide.get("border-inline-start-width")).toMatch(
      /^calc\(var\(--sg-border-width-thin\) \* /,
    );
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
    // Nothing but the imported file's `@source inline` can produce these
    // classes: the candidate list passed to build() is empty.
    const { css: themeCss } = generate(theme);

    const compiled = await compileFixtureCss('@import "./theme.css";', [], {
      imports: { "theme.css": themeCss },
    });

    expect(declsOf(compiled, ".bg-primary").get("background-color")).toBe(
      "var(--sg-color-primary)",
    );
    expect(compiled).toContain(".sp-p");
  });
});
