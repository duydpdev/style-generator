import postcss, { AtRule, Rule } from "postcss";
import { describe, it, expect } from "vitest";

import { fixtureOptions } from "../../__integration__/__fixtures__/fixtureTheme";

import dev1SpacingRules from "./__fixtures__/dev1-spacing-rules.json";
import { generateSpacingCss } from "./generateSpacingCss";

/**
 * Extract a flat `{ prop: value }` map from a rule/at-rule's direct
 * declaration children (spacing blocks never nest declarations deeper).
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

/**
 * Reconstruct the `{ "*": {...}, "\@media (...)": { "*": {...} }, ... }`
 * shape captured by the old mock `PluginAPI.addBase` call from the
 * `@layer base { ... }` block in generated CSS text.
 * @param {string} css - Generated spacing CSS
 * @returns {Record<string, unknown>} Reconstructed addBase-style object
 */
const parseBaseLayer = (css: string): Record<string, unknown> => {
  const root = postcss.parse(css);
  const layer = root.nodes.find(
    (n): n is AtRule => n.type === "atrule" && n.name === "layer",
  );
  if (!layer) throw new Error("no @layer base found in generated CSS");

  const result: Record<string, unknown> = {};
  for (const node of layer.nodes ?? []) {
    if (node.type === "rule" && node.selector === "*") {
      result["*"] = declarationsOf(node);
    } else if (node.type === "atrule" && node.name === "media") {
      const star = (node.nodes ?? []).find(
        (n): n is Rule => n.type === "rule" && n.selector === "*",
      );
      result[`@media ${node.params}`] = {
        "*": star ? declarationsOf(star) : {},
      };
    }
  }
  return result;
};

/**
 * Reconstruct `{ "sp-p": {...}, "sp-px": {...}, ... }` from `@utility sp-*` blocks.
 * @param {string} css - Generated spacing CSS
 * @returns {Record<string, Record<string, string>>} Utility name → declaration map
 */
const parseUtilities = (
  css: string,
): Record<string, Record<string, string>> => {
  const root = postcss.parse(css);
  const result: Record<string, Record<string, string>> = {};
  for (const node of root.nodes) {
    if (node.type === "atrule" && node.name === "utility") {
      result[node.params] = declarationsOf(node);
    }
  }
  return result;
};

/**
 * Fixture keys are dot-prefixed class names (`.sp-p`); strip the dot for `@utility sp-p` comparison.
 * @param {Record<string, Record<string, string>>} utilities - Dot-prefixed utility map from the fixture
 * @returns {Record<string, Record<string, string>>} Same map, keys without the leading dot
 */
const stripDot = (utilities: Record<string, Record<string, string>>) =>
  Object.fromEntries(
    Object.entries(utilities).map(([key, decls]) => [
      key.replace(/^\./, ""),
      decls,
    ]),
  );

describe("generateSpacingCss", () => {
  it("matches the dev1 baseline var(--sp-*)→--tw-sp-* base layer, bug included", () => {
    const css = generateSpacingCss(fixtureOptions);
    expect(parseBaseLayer(css)).toEqual(dev1SpacingRules.bases[0]);
  });

  it("matches the dev1 baseline .sp-* utility declarations", () => {
    const css = generateSpacingCss(fixtureOptions);
    expect(parseUtilities(css)).toEqual(
      stripDot(dev1SpacingRules.utilities[0]),
    );
  });

  it("emits @utility (not a bare .class{}) for every spacing key", () => {
    const css = generateSpacingCss(fixtureOptions);
    expect(css).toMatch(/@utility sp-p \{/);
    expect(css).not.toMatch(/^\.sp-p\s*\{/m);
  });

  it("uses direct var(--sp-<key>) with no --tw-sp-*/@layer base when enableResponsive is false", () => {
    const css = generateSpacingCss({ enableResponsive: false });
    expect(css).not.toMatch(/@layer base/);
    expect(css).toMatch(/@utility sp-p \{\n\s*padding: var\(--sp-p\);\n\}/);
  });

  it("returns an empty string when spacing.enabled is false", () => {
    expect(generateSpacingCss({ spacing: { enabled: false } })).toBe("");
  });
});
