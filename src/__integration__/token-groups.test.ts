import { describe, it, expect } from "vitest";
import postcss from "postcss";

import { generate } from "../core/generate";
import type { ThemeConfig } from "../core/themeSchema";

import { compileFixtureCss, selectorTargetsClass } from "./compileFixtureCss";

/**
 * Declarations of every rule that targets `selector`, as `prop → value`.
 * @param {string} css - Compiled CSS
 * @param {string} selector - An escaped `.class` or a plain selector
 * @returns {Map<string, string>} Declarations found under that selector
 */
const declsOf = (css: string, selector: string): Map<string, string> => {
  const decls = new Map<string, string>();
  postcss.parse(css).walkRules((rule) => {
    if (
      rule.selector !== selector &&
      !rule.selectors.some((s) => selectorTargetsClass(s.trim(), selector))
    )
      return;
    rule.walkDecls((decl) => {
      decls.set(decl.prop, decl.value);
    });
  });
  return decls;
};

const theme = {
  colors: { primary: "#000000" },
  motionDuration: { fast: "150ms", slow: "0.4s" },
  motionEasing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    emphasized: "ease-out",
  },
  controlHeight: { sm: "32px", md: "2.5rem" },
  iconSize: { sm: "16px", md: "1.25rem" },
  opacity: { disabled: 0.4, muted: 0.64 },
  zIndex: { overlay: 40, modal: 50 },
} as const satisfies ThemeConfig;

/** Class → the declaration it must compile to, for both keys of each group. */
const EXPECTED: readonly [string, string, string][] = [
  ["duration-fast", "transition-duration", "var(--sg-duration-fast)"],
  ["duration-slow", "transition-duration", "var(--sg-duration-slow)"],
  ["ease-standard", "transition-timing-function", "var(--sg-ease-standard)"],
  [
    "ease-emphasized",
    "transition-timing-function",
    "var(--sg-ease-emphasized)",
  ],
  ["h-control-sm", "height", "var(--sg-control-sm)"],
  ["h-control-md", "height", "var(--sg-control-md)"],
  ["size-icon-sm", "width", "var(--sg-icon-sm)"],
  ["size-icon-md", "height", "var(--sg-icon-md)"],
  ["opacity-disabled", "opacity", "var(--sg-opacity-disabled)"],
  ["opacity-muted", "opacity", "var(--sg-opacity-muted)"],
  ["z-overlay", "z-index", "var(--sg-z-overlay)"],
  ["z-modal", "z-index", "var(--sg-z-modal)"],
];

/** Every `@source inline` line of the generated CSS. */
const SOURCE_INLINE_LINE = /^@source inline\(.*\);$/gm;

describe("integration: scale token groups through Tailwind v4", () => {
  const { css: themeCss } = generate(theme, { spacing: { enabled: false } });

  it.each(EXPECTED)(
    "%s compiles from @source inline alone",
    async (cls, prop, value) => {
      const compiled = await compileFixtureCss(themeCss, []);
      expect(declsOf(compiled, `.${cls}`).get(prop)).toBe(value);
    },
  );

  it("keeps every --sg-* variable in :root", async () => {
    const root = declsOf(await compileFixtureCss(themeCss, []), ":root");
    expect(root.get("--sg-duration-slow")).toBe("0.4s");
    expect(root.get("--sg-ease-standard")).toBe("cubic-bezier(0.2, 0, 0, 1)");
    expect(root.get("--sg-control-md")).toBe("2.5rem");
    expect(root.get("--sg-icon-sm")).toBe("16px");
    expect(root.get("--sg-opacity-muted")).toBe("0.64");
    expect(root.get("--sg-z-modal")).toBe("50");
  });

  it("emits none of the classes without the @source inline lines", async () => {
    const withoutSources = themeCss.replace(SOURCE_INLINE_LINE, "");
    expect(withoutSources).not.toContain("@source inline");
    const compiled = await compileFixtureCss(withoutSources, []);
    for (const [cls] of EXPECTED) {
      expect(declsOf(compiled, `.${cls}`).size, cls).toBe(0);
    }
  });

  it("feeds min-h-* and max-h-* from the controlHeight namespace too", async () => {
    const compiled = await compileFixtureCss(themeCss, [
      "min-h-control-md",
      "max-h-control-sm",
    ]);
    expect(declsOf(compiled, ".min-h-control-md").get("min-height")).toBe(
      "var(--sg-control-md)",
    );
    expect(declsOf(compiled, ".max-h-control-sm").get("max-height")).toBe(
      "var(--sg-control-sm)",
    );
  });

  it("leaves the numeric colour modifiers at their percentage", async () => {
    const compiled = await compileFixtureCss(themeCss, ["bg-primary/40"]);
    expect(declsOf(compiled, ".bg-primary\\/40").get("background-color")).toBe(
      "color-mix(in oklab, var(--sg-color-primary) 40%, transparent)",
    );
  });

  it("yields no class from the --duration-* and --z-* namespaces", async () => {
    const compiled = await compileFixtureCss(
      "@theme inline { --duration-x: 1ms; --z-x: 1; }",
      ["duration-x", "z-x"],
    );
    expect(declsOf(compiled, ".duration-x").size).toBe(0);
    expect(declsOf(compiled, ".z-x").size).toBe(0);
  });
});
