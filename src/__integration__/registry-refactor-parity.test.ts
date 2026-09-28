import { readFileSync } from "node:fs";

import { compile } from "@tailwindcss/node";
import postcss, { ChildNode, Container, Root } from "postcss";
import { describe, it, expect, beforeAll } from "vitest";

import { generate } from "../core/generate";
import { generateSafelist } from "../features/safelist/generateSafelist";

import {
  fixtureTheme,
  fixtureOptions,
  fixtureExtraCandidates,
  FIXTURE_TYPOGRAPHY_CLASS,
  FIXTURE_COLOR_REFERENCE_CSS,
} from "./__fixtures__/fixtureTheme";

/**
 * One compiled CSS declaration, tagged with its full ancestor context:
 * every enclosing `@layer <name>` it lives under (there can be more than
 * one, e.g. `@layer properties` wrapping a `\@supports` block), and every
 * enclosing selector/at-rule prelude below that (rules, `@media`,
 * `\@supports`, `@property`, pseudo-selector nesting, ...).
 */
interface LeafRecord {
  layers: string;
  selectors: string;
  prop: string;
  value: string;
}

/**
 * Recursively flatten a compiled Tailwind v4 CSS string into an
 * order-independent list of leaf declaration records, so two compiles of
 * the same logical CSS can be diffed regardless of top-to-bottom rule
 * ordering. `@layer <name> { ... }` blocks contribute to `layers` only;
 * every other rule/at-rule (selectors, `@media`, `\@supports`, `@property`,
 * `&:hover`, ...) contributes to `selectors`. Bodyless at-rule statements
 * (`@layer properties;`) are recorded as their own leaf; comments are
 * ignored.
 * @param {string} css - Compiled CSS to flatten
 * @returns {LeafRecord[]} Flat list of declaration records
 */
const flattenCss = (css: string): LeafRecord[] => {
  const records: LeafRecord[] = [];

  const visitChildren = (
    parent: Root | Container,
    layerStack: string[],
    selectorStack: string[],
  ): void => {
    for (const node of parent.nodes ?? []) {
      visit(node, layerStack, selectorStack);
    }
  };

  const norm = (s: string): string => s.replace(/\s+/g, " ").trim();

  const visit = (
    node: ChildNode,
    layerStack: string[],
    selectorStack: string[],
  ): void => {
    if (node.type === "decl") {
      const value = norm(`${node.value}${node.important ? " !important" : ""}`);
      records.push({
        layers: layerStack.join(">") || "(root)",
        selectors: selectorStack.join(" ") || "(root)",
        prop: node.prop,
        value,
      });
      return;
    }

    if (node.type === "rule") {
      visitChildren(node, layerStack, [...selectorStack, norm(node.selector)]);
      return;
    }

    if (node.type !== "atrule") return; // comment — no leaf content

    if (node.nodes === undefined) {
      // Bodyless statement, e.g. `@layer properties;`
      records.push({
        layers: layerStack.join(">") || "(root)",
        selectors: selectorStack.join(" ") || "(root)",
        prop: `@${node.name}`,
        value: norm(node.params),
      });
      return;
    }

    if (node.name === "layer") {
      visitChildren(node, [...layerStack, norm(node.params)], selectorStack);
      return;
    }

    visitChildren(node, layerStack, [
      ...selectorStack,
      norm(`@${node.name} ${node.params}`),
    ]);
  };

  visitChildren(postcss.parse(css), [], []);
  return records;
};

const RECORD_SEPARATOR = String.fromCharCode(1);

const canonical = (r: LeafRecord): string =>
  [r.layers, r.selectors, r.prop, r.value].join(RECORD_SEPARATOR);

/**
 * Multiset diff of two sorted string arrays via a two-pointer merge —
 * returns entries present in `a` but not `b` and vice versa, respecting
 * duplicate counts (e.g. a value appearing twice in `a` but once in `b`
 * yields one leftover "only in a" entry).
 * @param {string[]} sortedA - First array, already sorted ascending
 * @param {string[]} sortedB - Second array, already sorted ascending
 * @returns {{ onlyInA: string[]; onlyInB: string[] }} Entries unique to each side
 */
const diffSorted = (
  sortedA: string[],
  sortedB: string[],
): { onlyInA: string[]; onlyInB: string[] } => {
  const onlyInA: string[] = [];
  const onlyInB: string[] = [];
  let i = 0;
  let j = 0;
  while (i < sortedA.length && j < sortedB.length) {
    if (sortedA[i] === sortedB[j]) {
      i++;
      j++;
    } else if (sortedA[i] < sortedB[j]) {
      onlyInA.push(sortedA[i]);
      i++;
    } else {
      onlyInB.push(sortedB[j]);
      j++;
    }
  }
  while (i < sortedA.length) onlyInA.push(sortedA[i++]);
  while (j < sortedB.length) onlyInB.push(sortedB[j++]);
  return { onlyInA, onlyInB };
};

// ---- Declared parity exemptions (see docs/plans/2026-09-28/03-v4-registry-core.md Task 4) ----

/**
 * (a) Spacing var chain: DEV.2 keeps the pre-registry `--tw-sp-*` bug
 * verbatim (verified byte-for-byte separately in generateSpacingCss.test.ts
 * against the same dev1 fixture) — excluded here as a declared exemption,
 * not because a real diff is expected.
 * @param {LeafRecord} r - Flattened declaration record
 * @returns {boolean} Whether the record belongs to the spacing var chain
 */
const isSpacingVarChain = (r: LeafRecord): boolean =>
  r.prop.startsWith("--tw-sp-");

/**
 * (c) The old JS-plugin's `buildCssVars`/`buildPluginHandler` duplicated
 * every color/shadow/backdrop-blur/radius value directly (bypassing the
 * `--sg-*` indirection) into a second `:root`/`html[data-theme='...']`
 * block under `@layer base`. `generate()` never runs that mechanism at
 * all — `--color-*` (and friends) are declared solely through `@theme
 * inline` (`--color-primary: var(--sg-primary)`), so this whole
 * old-baseline-only block is expected to disappear.
 * @param {LeafRecord} r - Flattened declaration record
 * @returns {boolean} Whether the record belongs to the old duplicate block
 */
const isOldJsPluginDuplicateBlock = (r: LeafRecord): boolean => {
  const isRootLikeSelector =
    r.selectors === ":root" || r.selectors.startsWith("html[data-theme=");
  return (
    r.layers === "base" &&
    isRootLikeSelector &&
    /^--(color|shadow|backdrop-blur|radius)-/.test(r.prop)
  );
};

// (b) Safelist literals: both compiles call `.build(candidates)` with the
// exact same candidate array (see `candidates` below) — generate() never
// injects its own safelist, so there is nothing to filter here in practice;
// documented per the plan as a declared (dormant) exemption.

// (c) applies to the DEV.1 baseline only: if generate() ever emitted that
// duplicate block, the new side must show it as a diff.
const isExemptOld = (r: LeafRecord): boolean =>
  isSpacingVarChain(r) || isOldJsPluginDuplicateBlock(r);
const isExemptNew = (r: LeafRecord): boolean => isSpacingVarChain(r);

let oldCss: string;
let newCss: string;

beforeAll(async () => {
  oldCss = readFileSync(
    new URL("./__fixtures__/dev1-baseline-compiled.css", import.meta.url),
    "utf8",
  );

  const candidates = [
    ...generateSafelist(fixtureTheme, fixtureOptions),
    ...fixtureExtraCandidates,
  ];

  const { css: generatedCss } = generate(fixtureTheme, fixtureOptions);
  const input = `@import "tailwindcss";\n${generatedCss}\n${FIXTURE_COLOR_REFERENCE_CSS}\n`;
  const result = await compile(input, {
    base: process.cwd(),
    onDependency: () => undefined,
  });
  newCss = result.build(candidates);
});

describe("registry-refactor-parity: DEV.1 baseline vs generate() (Tailwind v4 @tailwindcss/node compile)", () => {
  it("has no unexplained diff beyond the declared exemptions", () => {
    const byLocale = (a: string, b: string): number => a.localeCompare(b);

    const oldCanonical = flattenCss(oldCss)
      .filter((r) => !isExemptOld(r))
      .map(canonical)
      .sort(byLocale);
    const newCanonical = flattenCss(newCss)
      .filter((r) => !isExemptNew(r))
      .map(canonical)
      .sort(byLocale);

    const { onlyInA: onlyInOld, onlyInB: onlyInNew } = diffSorted(
      oldCanonical,
      newCanonical,
    );

    const readable = (rows: string[]): string[] =>
      rows.map((r) => r.split(RECORD_SEPARATOR).join(" | "));

    expect(readable(onlyInOld), "records only in the DEV.1 baseline").toEqual(
      [],
    );
    expect(readable(onlyInNew), "records only in generate() output").toEqual(
      [],
    );
  });

  it("declares --color-primary (exemption c must not lose the var)", () => {
    expect(newCss).toMatch(/--color-primary:\s*var\(--sg-primary\)/);
  });

  it(`.${FIXTURE_TYPOGRAPHY_CLASS} and .sp-p live inside @layer utilities`, () => {
    const records = flattenCss(newCss);
    const typo = records.find(
      (r) =>
        r.layers === "utilities" &&
        r.selectors === `.${FIXTURE_TYPOGRAPHY_CLASS}`,
    );
    const spacing = records.find(
      (r) => r.layers === "utilities" && r.selectors === ".sp-p",
    );
    expect(
      typo,
      "expected .text-12-mono inside @layer utilities",
    ).toBeDefined();
    expect(spacing, "expected .sp-p inside @layer utilities").toBeDefined();
  });

  it(`hover:${FIXTURE_TYPOGRAPHY_CLASS} and md:${FIXTURE_TYPOGRAPHY_CLASS} are present`, () => {
    expect(newCss).toMatch(
      new RegExp(`\\.hover\\\\:${FIXTURE_TYPOGRAPHY_CLASS}\\s*\\{`),
    );
    expect(newCss).toMatch(
      new RegExp(`\\.md\\\\:${FIXTURE_TYPOGRAPHY_CLASS}\\s*\\{`),
    );
  });

  it("backdrop-blur-<key> resolves to the theme value", () => {
    expect(newCss).toMatch(
      /\.backdrop-blur-sm\s*\{\s*--tw-backdrop-blur:\s*blur\(var\(--sg-backdrop-blur-sm\)\)/,
    );
  });
});
