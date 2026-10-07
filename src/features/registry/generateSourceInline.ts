import { resolveOptions } from "../../core/resolveOptions";
import type {
  ResolvedCoverageRule,
  ResolvedOptions,
} from "../../core/resolveOptions";
import type { ThemeConfig } from "../../core/themeSchema";
import { ALIAS_VALUE_RE } from "../../core/tokenGrammar";
import { toCamelCase, toKebabCase, toPascalCase } from "../../shared/helpers";

import {
  builtInCategories,
  isCssVarCategory,
  type BuiltInCategory,
} from "./builtInCategories";
import { defaultKeysOf } from "./categoryTokenMeta";

/**
 * The theme's flat token record for a category (the descriptor's `key` is
 * its `ThemeConfig` field). Typography's records hold style objects, so
 * values are `unknown`.
 * @param {ThemeConfig} theme - Theme configuration
 * @param {BuiltInCategory} descriptor - Category descriptor
 * @returns {Readonly<Record<string, unknown>> | undefined} The record, when declared
 */
const categoryRecord = (
  theme: ThemeConfig,
  descriptor: BuiltInCategory,
): Readonly<Record<string, unknown>> | undefined => theme[descriptor.key];

/**
 * Kebab-cased keys of `descriptor`'s category that HOLD a `$<key>` alias
 * value (the semantic tokens, e.g. `primary: "$blue600"`) — in the base
 * record or in any `themeAxes.<axis>.<variant>` override of the same
 * category. The primitives they point to are consumed through
 * `var(--sg-<target>)` and need no class, so they are not included. Walks
 * the records (no JSON stringification). Typography has no alias support,
 * so it never has any.
 * @param {ThemeConfig} theme - Theme configuration
 * @param {BuiltInCategory} descriptor - Category descriptor
 * @returns {Set<string>} Kebab-cased alias holder keys
 */
const aliasedKeys = (
  theme: ThemeConfig,
  descriptor: BuiltInCategory,
): Set<string> => {
  const holders = new Set<string>();
  if (!isCssVarCategory(descriptor)) return holders;

  const records = [
    theme[descriptor.key],
    ...Object.values(theme.themeAxes ?? {}).flatMap((variants) =>
      Object.values(variants).map((override) => override[descriptor.key]),
    ),
  ];
  for (const record of records) {
    for (const [key, value] of Object.entries(record ?? {})) {
      if (ALIAS_VALUE_RE.test(value)) holders.add(toKebabCase(key));
    }
  }
  return holders;
};

/**
 * The declared keys of a category that survive `coverage.keys`: every key
 * for `"all"` (the default), only alias holders for `"aliased"`.
 * @param {ThemeConfig} theme - Theme configuration
 * @param {BuiltInCategory} descriptor - Category descriptor
 * @param {ResolvedCoverageRule | undefined} rule - The category's coverage rule
 * @returns {string[]} Raw (un-cased) surviving keys
 */
const declaredKeys = (
  theme: ThemeConfig,
  descriptor: BuiltInCategory,
  rule: ResolvedCoverageRule | undefined,
): string[] => {
  const keys = Object.keys(categoryRecord(theme, descriptor) ?? {});
  if (rule?.keys !== "aliased") return keys;

  const aliased = aliasedKeys(theme, descriptor);
  return keys.filter((key) => aliased.has(toKebabCase(key)));
};

/**
 * The class prefixes of a category that `coverage.prefixes` keeps, in the
 * descriptor's own order.
 * @param {BuiltInCategory} descriptor - Category descriptor
 * @param {ResolvedCoverageRule | undefined} rule - The category's coverage rule
 * @returns {readonly string[]} Prefixes to emit
 */
const coveredPrefixes = (
  descriptor: BuiltInCategory,
  rule: ResolvedCoverageRule | undefined,
): readonly string[] => {
  const kept = rule?.prefixes;
  const all: readonly string[] = descriptor.classPrefixes;
  return kept ? all.filter((prefix) => kept.includes(prefix)) : all;
};

/**
 * The `{a,b}-` class-prefix part of a directive; empty for a
 * `bareClassName` category, where the key itself is the class.
 * @param {BuiltInCategory} descriptor - Category descriptor
 * @param {readonly string[]} prefixes - Prefixes being emitted
 * @returns {string} Prefix part with its trailing dash, or `""`
 */
const prefixPartOf = (
  descriptor: BuiltInCategory,
  prefixes: readonly string[],
): string => ("bareClassName" in descriptor ? "" : `{${prefixes.join(",")}}-`);

/**
 * Resolve the ordered list of class-name-suffix keys a category should
 * emit `@source inline` coverage for: the theme's own declared keys
 * (kebab-cased) when present — an empty `{}` counts as absent, exactly as
 * in `createDesignTokens` — else the descriptor's `defaultValues` (already
 * the literal class-suffix form — a number array stringified, a string
 * array used as-is, a record's own keys otherwise). With
 * `coverage.keys: "aliased"` only declared alias holders survive and the
 * defaults are never used (they cannot be aliased).
 * @param {BuiltInCategory} descriptor - Category descriptor
 * @param {ThemeConfig} theme - Theme configuration
 * @param {ResolvedCoverageRule | undefined} rule - The category's coverage rule
 * @returns {string[]} Kebab-cased keys, or the literal default-value suffixes
 */
const resolveCategoryKeys = (
  descriptor: BuiltInCategory,
  theme: ThemeConfig,
  rule: ResolvedCoverageRule | undefined,
): string[] => {
  const declared = Object.keys(categoryRecord(theme, descriptor) ?? {});
  if (declared.length > 0) {
    return declaredKeys(theme, descriptor, rule).map(toKebabCase);
  }
  if (rule?.keys === "aliased") return [];

  return defaultKeysOf(
    "defaultValues" in descriptor ? descriptor.defaultValues : undefined,
  );
};

/**
 * Build one `@source inline("...")` directive covering every
 * `<breakpoint><prefix>-<key>` combination for a single category (or, for
 * a `bareClassName` category such as typography, every bare `<key>`), using
 * Tailwind's shell-style sequential brace-expansion syntax. Returns
 * `undefined` when the category has nothing to emit (no class prefixes or
 * no keys).
 * @param {BuiltInCategory} descriptor - Category descriptor
 * @param {string[]} keys - Resolved keys (see `resolveCategoryKeys`)
 * @param {readonly string[]} prefixes - Class prefixes to emit
 * @param {readonly string[]} breakpointKeys - Breakpoint keys to alternate with when `descriptor.responsive` is set
 * @returns {string | undefined} `@source inline(...)` directive, or `undefined`
 */
const buildCategoryLine = (
  descriptor: BuiltInCategory,
  keys: string[],
  prefixes: readonly string[],
  breakpointKeys: readonly string[],
): string | undefined => {
  if (prefixes.length === 0 || keys.length === 0) {
    return undefined;
  }

  const keysPart = `{${keys.join(",")}}`;
  const prefixPart = prefixPartOf(descriptor, prefixes);
  const bpPart =
    "responsive" in descriptor && breakpointKeys.length > 0
      ? "{" + breakpointKeys.map((bp) => bp + ":").join(",") + ",}"
      : "";

  return `@source inline("${bpPart}${prefixPart}${keysPart}");`;
};

/**
 * Build one `@source inline("...")` state-variant directive PER configured
 * state (`descriptor.states`) — never a single merged directive across
 * states, since different states can have different sibling sets (e.g. a
 * token might declare `primaryHover` but not `primaryActive`). Mixing both
 * into one shell-style brace group would cross-multiply into invalid
 * pairings like `hover:bg-primary-active`.
 *
 * Siblings are detected on the CAMEL-cased keys — the exact form
 * `createDesignTokens` feeds to `createVariantMapper` (`primary-hover` and
 * `primaryHover` both become `primaryHover`). For a state `s`, a camel key
 * `k` contributes when `k` + Pascal-cased `s` (e.g. `primary` +
 * `primaryHover`) is also present, and it emits the kebab-cased sibling
 * (`primary-hover`) — the same class the mapper chains onto the base token.
 * The state itself is emitted kebab-cased (`focusVisible` → `focus-visible:`)
 * so it is a valid Tailwind variant name; the sibling lookup still uses the
 * Pascal-cased state.
 * A category with no sibling for a given state emits no line for it at all
 * (never `{}` empty braces). Keys are the ones that survive
 * `coverage.keys`, and prefixes the ones `coverage.prefixes` keeps.
 * @param {BuiltInCategory} descriptor - Category descriptor
 * @param {ThemeConfig} theme - Theme configuration
 * @param {ResolvedCoverageRule | undefined} rule - The category's coverage rule
 * @returns {string[]} Zero or more `@source inline(...)` directives, one per state that has at least one sibling pair
 */
const buildStateLines = (
  descriptor: BuiltInCategory,
  theme: ThemeConfig,
  rule: ResolvedCoverageRule | undefined,
): string[] => {
  const states: readonly string[] =
    "states" in descriptor ? descriptor.states : [];
  const prefixes = coveredPrefixes(descriptor, rule);
  if (states.length === 0 || prefixes.length === 0) {
    return [];
  }

  const rawKeys = declaredKeys(theme, descriptor, rule);
  if (rawKeys.length === 0) return [];

  const camelKeys = rawKeys.map(toCamelCase);
  const camelKeySet = new Set(camelKeys);
  const prefixPart = prefixPartOf(descriptor, prefixes);

  const lines: string[] = [];
  for (const state of states) {
    const siblingSuffix = toPascalCase(state);
    const siblingKebabKeys = camelKeys
      .filter((key) => camelKeySet.has(`${key}${siblingSuffix}`))
      .map((key) => toKebabCase(`${key}${siblingSuffix}`));

    if (siblingKebabKeys.length === 0) continue;

    lines.push(
      `@source inline("${toKebabCase(state)}:${prefixPart}{${siblingKebabKeys.join(",")}}");`,
    );
  }

  return lines;
};

/**
 * Generate the `@source inline(...)` directives that cover classes
 * Tailwind's static candidate scan can never see on its own: one line per
 * built-in category (colors, typography, shadows, backdrop blurs, border
 * radius, font family, border width) — see `buildCategoryLine` — one
 * further line per category `states` entry that has at least one sibling
 * pair (`hover:{bg,text,border}-{primary-hover}`, see `buildStateLines`) —
 * every `sp-*` utility the spacing pipeline can produce, plus any
 * caller-supplied `options.extraSources` entries (see
 * `StyleGeneratorOptions.extraSources`).
 *
 * `options.coverage` trims the per-category lines: `false` drops a
 * category's lines (state lines included), `prefixes` keeps only the listed
 * class prefixes and `keys: "aliased"` only the alias holders (keys whose
 * value is a `$` alias; the primitives they point to need no class). Absent
 * (or `true`) leaves the output unchanged.
 *
 * Each category gets its OWN line (not one giant merged directive) so a
 * single category exceeding a reasonable brace-expansion size never
 * threatens the others; the `sp-*` line keeps DEV.2.5's brace-expansion
 * form rather than one directive per key.
 *
 * `extraSources` entries are assumed already validated (`generate()` runs
 * that validation before calling this) and are emitted verbatim, one
 * `@source inline("<entry>")` line each, after every other line.
 * @param {ThemeConfig} theme - Theme configuration
 * @param {ResolvedOptions} [options] - Resolved generator options
 * @returns {string} One `@source inline(...)` directive per line, empty when there is nothing to emit
 */
export const generateSourceInline = (
  theme: ThemeConfig,
  options: ResolvedOptions = resolveOptions(),
): string => {
  const lines: string[] = [];

  for (const descriptor of builtInCategories) {
    const rule = options.coverage[descriptor.key];
    if (rule?.enabled === false) continue;

    const keys = resolveCategoryKeys(descriptor, theme, rule);
    const line = buildCategoryLine(
      descriptor,
      keys,
      coveredPrefixes(descriptor, rule),
      options.breakpoints,
    );
    if (line) lines.push(line);
    lines.push(...buildStateLines(descriptor, theme, rule));
  }

  if (options.spacing.enabled) {
    const spacingKeys = Object.keys(options.spacing.properties);

    if (spacingKeys.length > 0) {
      lines.push(`@source inline("sp-{${spacingKeys.join(",")}}");`);
    }
  }

  for (const entry of options.extraSources) {
    lines.push(`@source inline("${entry}");`);
  }

  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
};
