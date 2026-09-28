import type { AtRule, Rule } from "postcss";
import postcss from "postcss";
import { describe, it, expect } from "vitest";

import { fixtureOptions } from "../../__integration__/__fixtures__/fixtureTheme";
import { DEFAULT_SPACING_PROPERTIES } from "../../shared/defaultOption";

import { generateSpacingCss } from "./generateSpacingCss";
import { resolveSpacing } from "./spacingHelpers";

/**
 * Extract a flat `{ prop: value }` map from a rule/at-rule's direct
 * declaration children (spacing blocks never nest declarations deeper
 * than one `@media` level).
 * @param {Rule | AtRule} container - Parsed rule or at-rule node
 * @returns {Record<string, string>} CSS property → value map
 */
const declarationsOf = (container: Rule | AtRule): Record<string, string> => {
  const decls: Record<string, string> = {};
  for (const node of container.nodes ?? []) {
    if (node.type === "decl") decls[node.prop] = node.value;
  }
  return decls;
};

interface ParsedUtility {
  base: Record<string, string>;
  media: Record<string, Record<string, string>>;
}

/**
 * Reconstruct `{ "sp-p": { base: {...}, media: { "(width >= 768px)": {...} } } }`
 * from `@utility sp-*` blocks, splitting each block's own declarations from
 * its nested `@media` declarations.
 * @param {string} css - Generated spacing CSS
 * @returns {Record<string, ParsedUtility>} Utility name → base/media declaration map
 */
const parseUtilities = (css: string): Record<string, ParsedUtility> => {
  const root = postcss.parse(css);
  const result: Record<string, ParsedUtility> = {};
  for (const node of root.nodes) {
    if (node.type === "atrule" && node.name === "utility") {
      const media: Record<string, Record<string, string>> = {};
      for (const child of node.nodes ?? []) {
        if (child.type === "atrule" && child.name === "media") {
          media[child.params] = declarationsOf(child);
        }
      }
      result[node.params] = { base: declarationsOf(node), media };
    }
  }
  return result;
};

/**
 * Reconstruct `{ "--sg-sp-p": {...}, "--sg-sp-p-md": {...} }` from
 * `@property` blocks.
 * @param {string} css - Generated spacing CSS
 * @returns {Record<string, Record<string, string>>} Property name → declaration map
 */
const parseProperties = (
  css: string,
): Record<string, Record<string, string>> => {
  const root = postcss.parse(css);
  const result: Record<string, Record<string, string>> = {};
  for (const node of root.nodes) {
    if (node.type === "atrule" && node.name === "property") {
      result[node.params] = declarationsOf(node);
    }
  }
  return result;
};

describe("generateSpacingCss", () => {
  it("contains no `*` selector and no @layer base (D8 fix)", () => {
    const css = generateSpacingCss(fixtureOptions);
    expect(css).not.toMatch(/(^|[\s,{}])\*\s*[,{]/);
    expect(css).not.toMatch(/@layer base/);
  });

  it("emits @utility (not a bare .class{}) for every spacing key", () => {
    const css = generateSpacingCss(fixtureOptions);
    expect(css).toMatch(/@utility sp-p \{/);
    expect(css).not.toMatch(/^\.sp-p\s*\{/m);
  });

  it("nests the accumulated --sg-sp-* fallback chain inside @utility sp-p per declared breakpoint", () => {
    const css = generateSpacingCss(fixtureOptions);
    const { "sp-p": spP } = parseUtilities(css);
    expect(spP.base).toEqual({ padding: "var(--sg-sp-p)" });
    expect(spP.media).toEqual({
      "(width >= 768px)": { padding: "var(--sg-sp-p-md, var(--sg-sp-p))" },
      "(width >= 1024px)": {
        padding: "var(--sg-sp-p-lg, var(--sg-sp-p-md, var(--sg-sp-p)))",
      },
    });
  });

  it("multi-property keys (px) repeat the same chain across all their CSS properties", () => {
    const css = generateSpacingCss(fixtureOptions);
    const { "sp-px": spPx } = parseUtilities(css);
    expect(spPx.base).toEqual({
      "padding-left": "var(--sg-sp-px)",
      "padding-right": "var(--sg-sp-px)",
    });
    expect(spPx.media["(width >= 768px)"]).toEqual({
      "padding-left": "var(--sg-sp-px-md, var(--sg-sp-px))",
      "padding-right": "var(--sg-sp-px-md, var(--sg-sp-px))",
    });
  });

  it("registers @property --sg-sp-p[-md|-lg] with syntax:*, inherits:false, no initial-value", () => {
    const css = generateSpacingCss(fixtureOptions);
    const props = parseProperties(css);
    for (const name of ["--sg-sp-p", "--sg-sp-p-md", "--sg-sp-p-lg"]) {
      expect(props[name]).toEqual({ syntax: '"*"', inherits: "false" });
    }
    expect(css).not.toMatch(/initial-value/);
  });

  it("registers @property for every spacing key × declared breakpoint (base + md + lg each)", () => {
    const css = generateSpacingCss(fixtureOptions);
    const props = parseProperties(css);
    const expectedKeys = Object.keys(DEFAULT_SPACING_PROPERTIES);
    expect(Object.keys(props)).toHaveLength(expectedKeys.length * 3);
    for (const key of expectedKeys) {
      expect(props[`--sg-sp-${key}`]).toBeDefined();
      expect(props[`--sg-sp-${key}-md`]).toBeDefined();
      expect(props[`--sg-sp-${key}-lg`]).toBeDefined();
    }
  });

  it("uses direct var(--sg-sp-<key>) with no @media/@property breakpoint variant when enableResponsive is false", () => {
    const css = generateSpacingCss({ enableResponsive: false });
    expect(css).not.toMatch(/@layer base/);
    expect(css).not.toMatch(/@media/);
    expect(css).toMatch(/@utility sp-p \{\n\s*padding: var\(--sg-sp-p\);\n\}/);
    const props = parseProperties(css);
    expect(props["--sg-sp-p"]).toEqual({ syntax: '"*"', inherits: "false" });
    expect(props["--sg-sp-p-md"]).toBeUndefined();
  });

  it("returns an empty string when spacing.enabled is false", () => {
    expect(generateSpacingCss({ spacing: { enabled: false } })).toBe("");
  });
});

describe("resolveSpacing", () => {
  it("sets sg-sp-<prop>[-<bp>] vars, not the old sp-* namespace", () => {
    const { className, style } = resolveSpacing("p", { base: 2, md: 8 });
    expect(className).toBe("sp-p");
    expect(style).toEqual({ "--sg-sp-p": "0.5rem", "--sg-sp-p-md": "2rem" });
  });
});
