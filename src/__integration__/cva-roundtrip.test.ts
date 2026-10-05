import { describe, it, expect, beforeAll } from "vitest";
import { cva } from "class-variance-authority";
import postcss from "postcss";

import { generate } from "../core/generate";
import { ThemeSchema } from "../core/themeSchema";
import { builtInCategories } from "../features/registry/builtInCategories";
import { createVariantMapper } from "../features/cva/createVariantMapper";
import { toCamelCase, toKebabCase, toPascalCase } from "../shared/helpers";

import { fixtureTheme, fixtureOptions } from "./__fixtures__/fixtureTheme";
import { kebabParityCases } from "./__fixtures__/kebabParityCases";
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
  /**
   * The category's `cssVarPrefix` (see `TokenCategoryDescriptor`), or
   * `undefined` for a category with no CSS-variable representation
   * (`typography`, which `generateTypographyCss` emits as literal
   * declarations — nothing to assert a `var(...)` reference against).
   */
  cssVarPrefix: string | undefined;
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
        cases.push({
          category: descriptor.key,
          prefix,
          keys,
          key,
          cssVarPrefix: descriptor.cssVarPrefix,
        });
      }
    }
  }

  return cases;
};

/**
 * One (category, class-prefix, raw token) triple to round-trip through the
 * `{ states }` overload: `createVariantMapper(prefix, keys, { states
 * })[key]` chains `state:`-prefixed classes onto `key` for every configured
 * state that has a matching sibling (`key` + Pascal-cased state, e.g.
 * `primary` + `"hover"` -> `primaryHover`). Only built-in descriptors that
 * declare `states` (currently `colors`) contribute cases.
 */
interface StateRoundTripCase {
  category: string;
  prefix: string;
  key: string;
  keys: readonly string[];
  states: readonly string[];
  cssVarPrefix: string | undefined;
}

/**
 * Every built-in descriptor that declares `states`, crossed with every
 * class prefix and every fixture key of that category.
 * @returns {StateRoundTripCase[]} Every (category, prefix, key) triple to check
 */
const buildStateRoundTripCases = (): StateRoundTripCase[] => {
  const cases: StateRoundTripCase[] = [];

  for (const descriptor of builtInCategories) {
    const prefixes = descriptor.classPrefixes;
    const states = descriptor.states;
    if (!prefixes || prefixes.length === 0 || !states || states.length === 0)
      continue;

    // `createDesignTokens` camelCases every key before it reaches the mapper
    // (`accent-hover` -> `accentHover`); mirror that so kebab-keyed themes
    // are round-tripped the way real consumers see them.
    const record = descriptor.select?.(fixtureTheme);
    const keys = record ? Object.keys(record).map(toCamelCase) : [];
    if (keys.length === 0) continue;

    for (const prefix of prefixes) {
      for (const key of keys) {
        cases.push({
          category: descriptor.key,
          prefix,
          key,
          keys,
          states,
          cssVarPrefix: descriptor.cssVarPrefix,
        });
      }
    }
  }

  return cases;
};

describe("integration: createVariantMapper round-trip through cva + compiled Tailwind CSS", () => {
  const cases = buildRoundTripCases();
  let selectors: Set<string>;
  /**
   * Every rule's declaration text, keyed by selector — a selector can have
   * more than one rule (e.g. `.bg-none`/`.border-none` also match
   * Tailwind's own built-in static utility of the same name, which emits a
   * second, unrelated rule for the same selector). Checking every rule's
   * body, not just the first, is what makes the "references the
   * category's var" assertion below probative instead of a tautology that
   * would also pass for a theme key that merely happens to share a name
   * with a Tailwind built-in.
   */
  let ruleBodiesBySelector: Map<string, string[]>;

  beforeAll(async () => {
    const { css } = generate(fixtureTheme, fixtureOptions);
    const compiled = await compileFixtureCss(css, []);
    const root = postcss.parse(compiled);

    selectors = new Set<string>();
    ruleBodiesBySelector = new Map<string, string[]>();
    root.walkRules((rule) => {
      const body = rule.nodes.map((node) => node.toString()).join(";");
      for (const selector of rule.selectors) {
        const trimmed = selector.trim();
        selectors.add(trimmed);
        const bodies = ruleBodiesBySelector.get(trimmed) ?? [];
        bodies.push(body);
        ruleBodiesBySelector.set(trimmed, bodies);
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
    "$category: createVariantMapper($prefix, keys)[$key] resolves in compiled CSS and references its var prefix",
    ({ prefix, keys, key, cssVarPrefix }) => {
      const cls = cva("", {
        variants: { v: createVariantMapper(prefix, keys) },
      })({
        v: key,
      }).trim();
      const selector = `.${escapeClassName(cls)}`;

      expect(selectors.has(selector)).toBe(true);
      if (cssVarPrefix === undefined) return;

      const expectedVarRef = `var(--${cssVarPrefix}-${toKebabCase(key)})`;
      const bodies = ruleBodiesBySelector.get(selector) ?? [];
      expect(bodies.some((body) => body.includes(expectedVarRef))).toBe(true);
    },
  );

  it("covers at least one built-in category declaring states", () => {
    expect(buildStateRoundTripCases().length).toBeGreaterThan(0);
  });

  it.each(buildStateRoundTripCases())(
    "$category: createVariantMapper($prefix, keys, { states })[$key] — base + state: classes all resolve in compiled CSS; state classes reference the sibling's var",
    ({ prefix, key, keys, states, cssVarPrefix }) => {
      const value = createVariantMapper(prefix, keys, { states })[key];
      if (value === undefined) {
        throw new Error(`no mapped value for key ${key}`);
      }
      const classes = value.split(" ");

      const keySet = new Set(keys);
      const expectedStates = states.filter((state) =>
        keySet.has(`${key}${toPascalCase(state)}`),
      );
      expect(classes.length).toBe(1 + expectedStates.length);

      const base = classes[0];
      if (base === undefined) {
        throw new Error("empty classes array");
      }
      const baseSelector = `.${escapeClassName(base)}`;
      expect(selectors.has(baseSelector)).toBe(true);
      if (cssVarPrefix !== undefined) {
        const expectedVarRef = `var(--${cssVarPrefix}-${toKebabCase(key)})`;
        const bodies = ruleBodiesBySelector.get(baseSelector) ?? [];
        expect(bodies.some((body) => body.includes(expectedVarRef))).toBe(true);
      }

      expectedStates.forEach((state, i) => {
        const siblingKey = `${key}${toPascalCase(state)}`;
        const prefixPart = prefix === "" ? "" : `${prefix}-`;
        const expectedCls = `${state}:${prefixPart}${toKebabCase(siblingKey)}`;
        const cls = classes[1 + i];
        if (cls === undefined) {
          throw new Error(`missing state class for state ${state}`);
        }
        expect(cls).toBe(expectedCls);

        const selector = `.${escapeClassName(cls)}`;
        expect(selectors.has(selector)).toBe(true);
        if (cssVarPrefix === undefined) return;

        const expectedVarRef = `var(--${cssVarPrefix}-${toKebabCase(siblingKey)})`;
        const bodies = ruleBodiesBySelector.get(selector) ?? [];
        expect(bodies.some((body) => body.includes(expectedVarRef))).toBe(true);
      });
    },
  );
});

describe("integration: every color key the schema accepts maps to a class Tailwind emits", () => {
  // The parity table covers every casing shape toKebabCase handles; the
  // leading-uppercase keys are the ones whose camelCased token kebab-cases
  // to a different class than the registry emits.
  const candidateKeys = [
    ...kebabParityCases.map(({ key }) => key),
    "CTA",
    "ABtn",
    "primaryCTA",
    "Blue",
  ];
  const accepted = candidateKeys.filter(
    (key) => ThemeSchema.safeParse({ colors: { [key]: "#123456" } }).success,
  );

  it("rejects exactly the keys that would not round-trip", () => {
    expect(candidateKeys.filter((key) => !accepted.includes(key))).toEqual([
      "HTMLParser",
      "a_B",
      "CTA",
      "ABtn",
    ]);
  });

  it("every mapped bg-* class of an accepted key exists in the compiled CSS", async () => {
    const theme = {
      colors: Object.fromEntries(accepted.map((key) => [key, "#123456"])),
    };
    const { css, tokens } = generate(theme);
    const mapped = Object.values(
      createVariantMapper("bg", tokens.Web.variantColor),
    );
    const compiled = await compileFixtureCss(css, []);
    const selectors = new Set<string>();
    postcss.parse(compiled).walkRules((rule) => {
      for (const selector of rule.selectors) selectors.add(selector.trim());
    });

    expect(mapped).toHaveLength(accepted.length);
    for (const cls of mapped) {
      expect(selectors, cls).toContain(`.${escapeClassName(cls)}`);
    }
  });
});
