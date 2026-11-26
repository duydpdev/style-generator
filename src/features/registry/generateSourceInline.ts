import { forEachAxisVariant } from "../../core/forEachAxisVariant";
import { resolveOptions } from "../../core/resolveOptions";
import type {
  ResolvedCoverageRule,
  ResolvedOptions,
} from "../../core/resolveOptions";
import type { ThemeConfig } from "../../core/themeSchema";
import { parseAlias } from "../../core/tokenGrammar";
import type { ColorState } from "../../shared/colorStates";
import { toCamelCase, toKebabCase } from "../../shared/helpers";

import {
  builtInCategories,
  isCssVarCategory,
  type BuiltInCategory,
} from "./builtInCategories";
import { defaultKeysOf } from "./categoryTokenMeta";

// The theme record of a category; typography holds style objects, so values are `unknown`.
const categoryRecord = (
  theme: ThemeConfig,
  descriptor: BuiltInCategory,
): Readonly<Record<string, unknown>> | undefined => theme[descriptor.key];

// Kebab-cased keys that hold a `$` alias in the base record or any axis override;
// the primitives they point to are read through `var()` and need no class.
const aliasedKeys = (
  theme: ThemeConfig,
  descriptor: BuiltInCategory,
): Set<string> => {
  const holders = new Set<string>();
  if (!isCssVarCategory(descriptor)) return holders;

  const records = [theme[descriptor.key]];
  forEachAxisVariant(theme.themeAxes, (_axis, _variant, override) => {
    records.push(override[descriptor.key]);
  });
  for (const record of records) {
    for (const [key, value] of Object.entries(record ?? {})) {
      if (typeof value === "string" && parseAlias(value) !== undefined) {
        holders.add(toKebabCase(key));
      }
    }
  }
  return holders;
};

// Declared keys surviving `coverage.keys` (all, or only alias holders for `"aliased"`).
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

// Class prefixes `coverage.prefixes` keeps, in the descriptor's order.
const coveredPrefixes = (
  descriptor: BuiltInCategory,
  rule: ResolvedCoverageRule | undefined,
): readonly string[] => {
  const kept = rule?.prefixes;
  const all: readonly string[] = descriptor.classPrefixes;
  return kept ? all.filter((prefix) => kept.includes(prefix)) : all;
};

// The `{a,b}-` prefix part; empty for a `bareClassName` category.
const prefixPartOf = (
  descriptor: BuiltInCategory,
  prefixes: readonly string[],
): string => ("bareClassName" in descriptor ? "" : `{${prefixes.join(",")}}-`);

// Declared keys (an empty `{}` counts as absent, as in `createDesignTokens`), else the
// category defaults; `keys: "aliased"` never falls back to defaults (they hold no alias).
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

// One brace-expanded `@source inline` line for a category, or `undefined` with nothing to emit.
const buildCategoryLine = (
  descriptor: BuiltInCategory,
  keys: string[],
  prefixes: readonly string[],
  breakpointKeys: readonly string[],
  modifierPart = "",
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

  return `@source inline("${bpPart}${prefixPart}${keysPart}${modifierPart}");`;
};

// One state-variant line per state that has a sibling pair.
// Rationale: documents/architecture.md#buildstatelines-one-source-line-per-state
const buildStateLines = (
  descriptor: BuiltInCategory,
  theme: ThemeConfig,
  rule: ResolvedCoverageRule | undefined,
): string[] => {
  const states: readonly ColorState[] =
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
  for (const { suffix, variant } of states) {
    const siblingKebabKeys = camelKeys
      .filter((key) => camelKeySet.has(`${key}${suffix}`))
      .map((key) => toKebabCase(`${key}${suffix}`));

    if (siblingKebabKeys.length === 0) continue;

    lines.push(
      `@source inline("${variant}:${prefixPart}{${siblingKebabKeys.join(",")}}");`,
    );
  }

  return lines;
};

// The plain-step opacity line, then one line per opacity group in declaration order.
const buildOpacityLines = (
  descriptor: BuiltInCategory,
  keys: string[],
  prefixes: readonly string[],
  breakpointKeys: readonly string[],
  rule: ResolvedCoverageRule | undefined,
): string[] =>
  [
    { steps: rule?.opacities ?? [], keys: undefined, prefixes: undefined },
    ...(rule?.opacityGroups ?? []),
  ].flatMap(({ steps, keys: own, prefixes: ownPrefixes }) => {
    if (steps.length === 0) return [];
    const line = buildCategoryLine(
      descriptor,
      own?.map(toKebabCase) ?? keys,
      ownPrefixes ?? prefixes,
      breakpointKeys,
      `/{${steps.join(",")}}`,
    );
    return line ? [line] : [];
  });

/**
 * Generates the `@source inline(...)` directives for classes Tailwind's scan
 * cannot see: one line per built-in category, its opacity and state lines,
 * then the `sp-*` line. `options.coverage` trims or extends the category lines.
 * @param {ThemeConfig} theme - Theme configuration
 * @param {ResolvedOptions} [options] - Resolved generator options
 * @returns {string} One directive per line, empty when there is nothing to emit
 */
// Rationale: documents/architecture.md#generatesourceinline-one-line-per-category
export const generateSourceInline = (
  theme: ThemeConfig,
  options: ResolvedOptions = resolveOptions(),
): string => {
  const lines: string[] = [];

  for (const descriptor of builtInCategories) {
    const rule = options.coverage[descriptor.key];
    if (rule?.enabled === false) continue;

    const keys = resolveCategoryKeys(descriptor, theme, rule);
    const prefixes = coveredPrefixes(descriptor, rule);
    const line = buildCategoryLine(
      descriptor,
      keys,
      prefixes,
      options.breakpoints,
    );
    if (line) lines.push(line);

    lines.push(
      ...buildOpacityLines(
        descriptor,
        keys,
        prefixes,
        options.breakpoints,
        rule,
      ),
    );
    lines.push(...buildStateLines(descriptor, theme, rule));
  }

  if (options.spacing.enabled) {
    const spacingKeys = Object.keys(options.spacing.properties);

    if (spacingKeys.length > 0) {
      lines.push(`@source inline("sp-{${spacingKeys.join(",")}}");`);
    }
  }

  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
};
