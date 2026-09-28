import type { AtRule, Declaration, Rule } from "postcss";
import postcss from "postcss";
import { describe, it, expect } from "vitest";

import { generateTypographyCss } from "./generateTypographyCss";

const typography = {
  text12Mono: {
    fontSize: "12px",
    lineHeight: "150%",
    fontWeight: 400,
    letterSpacing: "0px",
  },
};

/**
 * Reconstruct `{ "text-12-mono": {...} }` from `@utility` blocks.
 * @param {string} css - Generated typography CSS
 * @returns {Record<string, Record<string, string>>} Utility name → declaration map
 */
const parseUtilities = (
  css: string,
): Record<string, Record<string, string>> => {
  const root = postcss.parse(css);
  const result: Record<string, Record<string, string>> = {};
  for (const node of root.nodes) {
    if (node.type !== "atrule" || node.name !== "utility") continue;
    const decls: Record<string, string> = {};
    for (const child of node.nodes ?? []) {
      if (child.type === "decl") decls[child.prop] = child.value;
    }
    result[node.params] = decls;
  }
  return result;
};

describe("generateTypographyCss", () => {
  it("returns an empty string when there is no typography config", () => {
    expect(generateTypographyCss(undefined)).toBe("");
    expect(generateTypographyCss({})).toBe("");
  });

  it("emits @utility <kebab-key> with literal declarations, matching the old addUtilities(addDot(typography)) output", () => {
    const css = generateTypographyCss(typography);
    expect(parseUtilities(css)).toEqual({
      "text-12-mono": {
        "font-size": "12px",
        "line-height": "150%",
        "font-weight": "400",
        "letter-spacing": "0px",
      },
    });
  });

  it("never emits a bare top-level .class{} rule", () => {
    const css = generateTypographyCss(typography);
    expect(css).not.toMatch(/^\.[A-Za-z]/m);
  });

  it("skips optional fields passed as explicit undefined in both modes", () => {
    const withUndefined = {
      heading: {
        fontSize: "24px",
        lineHeight: "1.2",
        fontWeight: 700,
        letterSpacing: "0",
        fontFamily: undefined,
      },
    };
    expect(generateTypographyCss(withUndefined)).not.toMatch(/undefined/);
    expect(
      generateTypographyCss(withUndefined, {
        typography: { cssVarDriven: true },
      }),
    ).not.toMatch(/undefined|font-family/);
  });

  it("cssVarDriven: injects --typography-<key>-<prop> vars into :root under @layer base and references them from @utility", () => {
    const css = generateTypographyCss(typography, {
      typography: { cssVarDriven: true },
    });

    const root = postcss.parse(css);
    const baseLayer = root.nodes.find(
      (n): n is AtRule =>
        n.type === "atrule" && n.name === "layer" && n.params === "base",
    );
    expect(baseLayer).toBeDefined();
    const rootRule = (baseLayer?.nodes ?? []).find(
      (n): n is Rule => n.type === "rule" && n.selector === ":root",
    );
    expect(rootRule).toBeDefined();
    const rootDecls = Object.fromEntries(
      (rootRule?.nodes ?? [])
        .filter((n): n is Declaration => n.type === "decl")
        .map((n) => [n.prop, n.value]),
    );
    expect(rootDecls).toEqual({
      "--typography-text-12-mono-font-size": "12px",
      "--typography-text-12-mono-line-height": "150%",
      "--typography-text-12-mono-font-weight": "400",
      "--typography-text-12-mono-letter-spacing": "0px",
    });

    expect(parseUtilities(css)).toEqual({
      "text-12-mono": {
        "font-size": "var(--typography-text-12-mono-font-size)",
        "line-height": "var(--typography-text-12-mono-line-height)",
        "font-weight": "var(--typography-text-12-mono-font-weight)",
        "letter-spacing": "var(--typography-text-12-mono-letter-spacing)",
      },
    });
  });

  it("throws a clear error for a typography key whose kebab-case form starts with a digit", () => {
    expect(() =>
      generateTypographyCss({
        "2xl": {
          fontSize: "1px",
          lineHeight: "1",
          fontWeight: 400,
          letterSpacing: "0",
        },
      }),
    ).toThrowError(/Invalid typography utility name "@utility 2xl"/);
  });

  it("throws a clear error for a typography key whose kebab-case form starts with a dash", () => {
    expect(() =>
      generateTypographyCss({
        "-lead": {
          fontSize: "1px",
          lineHeight: "1",
          fontWeight: 400,
          letterSpacing: "0",
        },
      }),
    ).toThrowError(/Invalid typography utility name "@utility -lead"/);
  });
});
