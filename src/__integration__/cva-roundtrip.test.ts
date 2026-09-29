import { describe, it, expect, beforeAll } from "vitest";
import { cva } from "class-variance-authority";
import postcss from "postcss";

import { generate } from "../core/generate";
import { builtInCategories } from "../features/registry/builtInCategories";
import { createVariantMapper } from "../features/cva/createVariantMapper";

import { fixtureTheme, fixtureOptions } from "./__fixtures__/fixtureTheme";
import { compileFixtureCss } from "./compileFixtureCss";

/**
 * CSS.escape-like escaping for a bare class-name segment used inside a
 * `.<class>` selector. `toKebabCase` (shared by `createVariantMapper` and
 * every registry pipeline) only ever produces `[a-z0-9-]`, so in practice
 * every class this test builds already matches the plain `.<class>` form
 * Tailwind emits (verified against the real compiler — see
 * `tailwind-compile.test.ts`'s `.md\:rounded-2xl`, which shows Tailwind
 * itself backslash-escapes a `:` the same way `CSS.escape` does). This
 * still handles the two cases `CSS.escape` treats specially so the
 * lookup stays correct if a future category ever produces a bare
 * (empty-prefix) class starting with a digit, or a variant-prefixed
 * class containing `:`:
 *   - a leading digit (or a leading `-` immediately followed by a digit)
 *     is escaped as its codepoint plus a trailing space (`2xl` -> `\32 xl`);
 *   - any other character outside `[A-Za-z0-9_-]` gets a single backslash.
 * @param {string} cls - Bare class name (no leading `.`)
 * @returns {string} Escaped selector text, without the leading `.`
 */
const escapeClassName = (cls: string): string => {
  let out = "";
  for (let i = 0; i < cls.length; i++) {
    const ch = cls.charAt(i);
    const isLeadingDigit =
      /\d/.test(ch) && (i === 0 || (i === 1 && cls.startsWith("-")));

    if (isLeadingDigit) {
      out += `\\${(ch.codePointAt(0) ?? 0).toString(16)} `;
    } else if (/[A-Za-z0-9_-]/.test(ch)) {
      out += ch;
    } else {
      out += `\\${ch}`;
    }
  }
  return out;
};

/**
 * One (category, class-prefix, token-key) triple to round-trip: the class
 * `createVariantMapper` maps `key` to under `prefix` must have a matching
 * selector in the real compiled CSS.
 */
interface RoundTripCase {
  category: string;
  prefix: string;
  keys: readonly string[];
  key: string;
}

/**
 * Every built-in descriptor with a non-empty `classPrefixes`, crossed with
 * every fixture key of that category — mirrors how `generateSourceInline`
 * resolves per-category keys (`select`, or `theme.typography` directly for
 * the one descriptor with no `select`), except the raw (non-kebab) theme
 * key is kept since `createVariantMapper` does its own kebab-casing.
 * @returns {RoundTripCase[]} Every (category, prefix, key) triple to check
 */
const buildRoundTripCases = (): RoundTripCase[] => {
  const cases: RoundTripCase[] = [];

  for (const descriptor of builtInCategories) {
    const prefixes = descriptor.classPrefixes;
    if (!prefixes || prefixes.length === 0) continue;

    const record =
      descriptor.key === "typography"
        ? fixtureTheme.typography
        : descriptor.select?.(fixtureTheme);
    const keys = record ? Object.keys(record) : [];
    if (keys.length === 0) continue;

    for (const prefix of prefixes) {
      for (const key of keys) {
        cases.push({ category: descriptor.key, prefix, keys, key });
      }
    }
  }

  return cases;
};

describe("integration: createVariantMapper round-trip through cva + compiled Tailwind CSS", () => {
  const cases = buildRoundTripCases();
  let selectors: Set<string>;

  beforeAll(async () => {
    const { css } = generate(fixtureTheme, fixtureOptions);
    const compiled = await compileFixtureCss(css, []);
    const root = postcss.parse(compiled);

    selectors = new Set<string>();
    root.walkRules((rule) => {
      for (const selector of rule.selectors) {
        selectors.add(selector.trim());
      }
    });
  });

  it("covers every built-in category with a class prefix", () => {
    const categoriesWithPrefixes = builtInCategories.filter(
      (d) => d.classPrefixes && d.classPrefixes.length > 0,
    );
    const coveredCategories = new Set(cases.map((c) => c.category));

    for (const descriptor of categoriesWithPrefixes) {
      expect(coveredCategories.has(descriptor.key)).toBe(true);
    }
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases)(
    "$category: createVariantMapper($prefix, keys)[$key] resolves in compiled CSS",
    ({ prefix, keys, key }) => {
      const cls = cva("", {
        variants: { v: createVariantMapper(prefix, keys) },
      })({
        v: key,
      }).trim();

      expect(selectors.has(`.${escapeClassName(cls)}`)).toBe(true);
    },
  );
});
