import { describe, it, expect } from "vitest";

import { generate } from "../../core/generate";
import { StyleGeneratorOptionsSchema } from "../../core/optionsSchema";
import { ThemeSchema, formatZodError } from "../../core/themeSchema";
import type { ThemeConfig } from "../../core/themeSchema";

const scaleTheme = {
  colors: { primary: "#007AFF" },
  motionDuration: { fast: "150ms", slow: "0.4s" },
  motionEasing: { standard: "cubic-bezier(0.2, 0, 0, 1)", out: "ease-out" },
  controlHeight: { sm: "32px", md: "2.5rem" },
  iconSize: { sm: "16px", md: "1.25rem" },
  opacity: { disabled: 0.4, muted: 0.64 },
  zIndex: { overlay: 40, modal: 50 },
} as const satisfies ThemeConfig;

const parses = (theme: unknown): boolean =>
  ThemeSchema.safeParse(theme).success;

describe("scale categories (motion, control height, icon size, opacity, z-index)", () => {
  const { css, tokens } = generate(scaleTheme, {
    spacing: { enabled: false },
  });

  it("emits one :root variable per key", () => {
    for (const line of [
      "--sg-duration-fast: 150ms;",
      "--sg-ease-standard: cubic-bezier(0.2, 0, 0, 1);",
      "--sg-control-md: 2.5rem;",
      "--sg-icon-sm: 16px;",
      "--sg-opacity-disabled: 0.4;",
      "--sg-z-modal: 50;",
    ]) {
      expect(css).toContain(line);
    }
  });

  it("maps every key into the Tailwind namespace that yields its class", () => {
    for (const line of [
      "--transition-duration-fast: var(--sg-duration-fast);",
      "--ease-standard: var(--sg-ease-standard);",
      "--height-control-md: var(--sg-control-md);",
      "--size-icon-sm: var(--sg-icon-sm);",
      "--opacity-muted: var(--sg-opacity-muted);",
      "--z-index-modal: var(--sg-z-modal);",
    ]) {
      expect(css).toContain(line);
    }
    // `--duration-*` and `--z-*` produce no class in Tailwind v4.
    expect(css).not.toMatch(/--duration-fast:|--z-modal:/);
  });

  it("emits one @source inline line per group", () => {
    for (const line of [
      '@source inline("{duration}-{fast,slow}");',
      '@source inline("{ease}-{standard,out}");',
      '@source inline("{h-control}-{sm,md}");',
      '@source inline("{size-icon}-{sm,md}");',
      '@source inline("{opacity}-{disabled,muted}");',
      '@source inline("{z}-{overlay,modal}");',
    ]) {
      expect(css).toContain(line);
    }
  });

  it("drops a group's line with coverage false", () => {
    const off = generate(scaleTheme, {
      spacing: { enabled: false },
      coverage: { zIndex: false },
    }).css;
    expect(off).not.toContain("{z}-{overlay,modal}");
    expect(off).toContain("--z-index-modal: var(--sg-z-modal);");
  });

  it("reports prefixes and opacities of one scale rule together", () => {
    const result = StyleGeneratorOptionsSchema.safeParse({
      coverage: { zIndex: { prefixes: ["z"], opacities: [10] } },
    });
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual([
      "coverage.zIndex.prefixes",
      "coverage.zIndex.opacities",
    ]);
  });

  it("returns typed token arrays named after the theme field", () => {
    expect(tokens.Web.motionDuration).toEqual(["fast", "slow"]);
    expect(tokens.Web.motionEasing).toEqual(["standard", "out"]);
    expect(tokens.Web.controlHeight).toEqual(["sm", "md"]);
    expect(tokens.Web.iconSize).toEqual(["sm", "md"]);
    expect(tokens.Web.opacity).toEqual(["disabled", "muted"]);
    expect(tokens.Web.zIndex).toEqual(["overlay", "modal"]);
    expect(tokens.Web.opacities).toEqual([]);
  });

  it("overrides a scale key per theme axis", () => {
    const axisCss = generate(
      {
        ...scaleTheme,
        themeAxes: { motion: { reduced: { motionDuration: { fast: "0ms" } } } },
      },
      { spacing: { enabled: false } },
    ).css;
    expect(axisCss).toMatch(
      /html\[data-motion="reduced"\] \{\n {2}--sg-duration-fast: 0ms;/,
    );
  });

  it("emits nothing for an absent group", () => {
    const plain = generate(
      { colors: { primary: "#007AFF" } },
      { spacing: { enabled: false } },
    );
    expect(plain.css).not.toMatch(/sg-(duration|ease|control|icon|opacity|z)-/);
    expect(plain.tokens.Web.zIndex).toEqual([]);
  });
});

describe("scale category values", () => {
  it.each<[string, Record<string, unknown>]>([
    ["a duration in ms", { motionDuration: { a: "150ms" } }],
    ["a duration in s", { motionDuration: { a: ".2s" } }],
    ["an easing keyword", { motionEasing: { a: "ease-in-out" } }],
    [
      "a cubic-bezier",
      { motionEasing: { a: "cubic-bezier(0.3, -0.5, 1, 1.4)" } },
    ],
    ["steps with a position", { motionEasing: { a: "steps(4, jump-end)" } }],
    ["a px height", { controlHeight: { a: "40px" } }],
    ["a rem icon size", { iconSize: { a: "1.5rem" } }],
    ["opacity 0 and 1", { opacity: { a: 0, b: 1 } }],
    ["a negative z-index", { zIndex: { below: -1 } }],
  ])("accepts %s", (_title, group) => {
    expect(parses({ colors: {}, ...group })).toBe(true);
  });

  it.each<[string, Record<string, unknown>]>([
    ["a unitless duration", { motionDuration: { a: "150" } }],
    ["a duration alias", { motionDuration: { a: "$b", b: "1s" } }],
    ["an unknown easing", { motionEasing: { a: "bounce" } }],
    [
      "a cubic-bezier x out of 0–1",
      { motionEasing: { a: "cubic-bezier(2, 0, 0, 1)" } },
    ],
    [
      "a cubic-bezier with three numbers",
      { motionEasing: { a: "cubic-bezier(0, 0, 1)" } },
    ],
    ["steps(0)", { motionEasing: { a: "steps(0)" } }],
    ["a height in em", { controlHeight: { a: "2em" } }],
    ["an icon size with calc()", { iconSize: { a: "calc(1rem + 2px)" } }],
    ["opacity above 1", { opacity: { a: 1.5 } }],
    ["opacity as a string", { opacity: { a: "0.5" } }],
    ["a fractional z-index", { zIndex: { a: 1.5 } }],
    ["a z-index as a string", { zIndex: { a: "10" } }],
  ])("rejects %s", (_title, group) => {
    expect(parses({ colors: {}, ...group })).toBe(false);
  });

  it("rejects an override key the base scale does not declare", () => {
    const result = ThemeSchema.safeParse({
      colors: {},
      zIndex: { modal: 50 },
      themeAxes: { layer: { high: { zIndex: { toast: 60 } } } },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([
      "themeAxes",
      "layer",
      "high",
      "zIndex",
      "toast",
    ]);
  });

  it("rejects a digit-only opacity key, which would replace the /<n> colour modifier", () => {
    const result = ThemeSchema.safeParse({
      colors: {},
      opacity: { "50": 0.5 },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["opacity", "50"]);
    if (result.success) throw new Error("expected failure");
    expect(formatZodError(result.error)).toMatch(
      /^opacity\.50 → .*bg-primary\/50/m,
    );
    expect(
      parses({ colors: {}, opacity: { "50": 0.5 }, zIndex: { "50": 50 } }),
    ).toBe(false);
    expect(parses({ colors: {}, opacity: { o50: 0.5 } })).toBe(true);
  });

  it("rejects two scale keys that kebab-case to the same class", () => {
    expect(
      parses({ colors: {}, iconSize: { iconSm: "1rem", "icon-sm": "1rem" } }),
    ).toBe(false);
  });
});
