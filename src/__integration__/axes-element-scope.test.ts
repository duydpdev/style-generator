import { describe, it, expect } from "vitest";

import { generate } from "../core/generate";
import type { ThemeConfig } from "../core/themeSchema";

import { compileFixtureCss } from "./compileFixtureCss";

const theme: ThemeConfig = {
  colors: { primary: "#007AFF", accent: "$primary", surface: "#FFFFFF" },
  themeAxes: {
    theme: {
      // `accent` is re-declared, so it follows `primary` inside the element.
      dark: { colors: { primary: "#0A84FF", accent: "$primary" } },
    },
    palette: { forest: { colors: { surface: "#020" } } },
  },
};

/**
 * `axes.attribute` + `axes.scope: "element"` through the real Tailwind v4
 * compiler: the generated `[data-mode="dark"]` block survives compilation
 * with its custom properties, anchored to no element, and the default axis
 * keeps its `data-<axis>` name.
 */
describe('integration: axes.scope "element" with an attribute map', () => {
  const options = {
    axes: { scope: "element", attribute: { theme: "data-mode" } },
  } as const;

  it("compiles the un-anchored [data-mode] block and the renamed default axis", async () => {
    const compiled = await compileFixtureCss(generate(theme, options).css, []);

    const block = /(^|\n)\[data-mode="dark"\]\s*\{([^}]*)\}/.exec(compiled);
    expect(block).not.toBeNull();
    expect(block?.[2]).toMatch(/--sg-color-primary:\s*#0A84FF/i);
    expect(block?.[2]).toMatch(
      /--sg-color-accent:\s*var\(--sg-color-primary\)/,
    );
    expect(compiled).toMatch(/(^|\n)\[data-palette="forest"\]\s*\{/);
    expect(compiled).not.toContain("html[data-");
    expect(compiled).not.toContain('data-theme="dark"');
  });

  it("emits the html-anchored selector under the default scope", async () => {
    const compiled = await compileFixtureCss(
      generate(theme, { axes: { attribute: { theme: "data-mode" } } }).css,
      [],
    );
    expect(compiled).toContain('html[data-mode="dark"]');
  });

  it("maps the utilities to the same --sg-* variables in both scopes", async () => {
    const element = await compileFixtureCss(generate(theme, options).css, [
      "bg-accent",
    ]);
    const root = await compileFixtureCss(generate(theme).css, ["bg-accent"]);
    expect(element).toMatch(/\.bg-accent\s*\{[^}]*var\(--sg-color-accent\)/);
    expect(root).toMatch(/\.bg-accent\s*\{[^}]*var\(--sg-color-accent\)/);
  });
});
