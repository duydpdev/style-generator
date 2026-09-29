import type {
  StyleGeneratorOptions,
  SpacingPropertyMap,
} from "../../core/Options";
import type { ThemeConfig } from "../../core/themeSchema";
import { DEFAULT_SPACING_PROPERTIES } from "../../shared/defaultOption";
import { toKebabCase, toPascalCase } from "../../shared/helpers";

import { builtInCategories } from "./builtInCategories";
import type { TokenCategoryDescriptor } from "./TokenCategoryDescriptor";

/** Breakpoint keys used for a `responsive: true` category when the caller doesn't configure `options.breakpoints` — matches `generateSpacingCss`'s own default. */
const DEFAULT_RESPONSIVE_BREAKPOINTS = ["md", "lg"];

/**
 * Resolve the ordered list of class-name-suffix keys a category should
 * emit `@source inline` coverage for: the theme's own declared keys
 * (kebab-cased) when present, else the descriptor's `defaultValues`
 * (already the literal class-suffix form — a number array stringified, a
 * string array used as-is, a record's own keys otherwise).
 *
 * `typography` has no `select` (it isn't a CSS-var category), so its keys
 * come straight from `theme.typography` instead.
 * @param {TokenCategoryDescriptor} descriptor - Category descriptor
 * @param {ThemeConfig} theme - Theme configuration
 * @returns {string[]} Kebab-cased keys, or the literal default-value suffixes
 */
const resolveCategoryKeys = (
  descriptor: TokenCategoryDescriptor,
  theme: ThemeConfig,
): string[] => {
  if (descriptor.key === "typography") {
    return Object.keys(theme.typography ?? {}).map(toKebabCase);
  }

  const themeRecord = descriptor.select?.(theme);
  if (themeRecord && Object.keys(themeRecord).length > 0) {
    return Object.keys(themeRecord).map(toKebabCase);
  }

  if (Array.isArray(descriptor.defaultValues)) {
    return descriptor.defaultValues.map(String);
  }
  if (descriptor.defaultValues) {
    return Object.keys(descriptor.defaultValues);
  }
  return [];
};

/**
 * Build one `@source inline("...")` directive covering every
 * `<breakpoint><prefix>-<key>` combination for a single category (or, for
 * the empty-prefix typography category, every bare `<key>`), using
 * Tailwind's shell-style sequential brace-expansion syntax. Returns
 * `undefined` when the category has nothing to emit (no class prefixes or
 * no keys).
 * @param {TokenCategoryDescriptor} descriptor - Category descriptor
 * @param {string[]} keys - Resolved keys (see `resolveCategoryKeys`)
 * @param {readonly string[]} breakpointKeys - Breakpoint keys to alternate with when `descriptor.responsive` is set
 * @returns {string | undefined} `@source inline(...)` directive, or `undefined`
 */
const buildCategoryLine = (
  descriptor: TokenCategoryDescriptor,
  keys: string[],
  breakpointKeys: readonly string[],
): string | undefined => {
  const prefixes = descriptor.classPrefixes;
  if (!prefixes || prefixes.length === 0 || keys.length === 0) {
    return undefined;
  }

  const keysPart = `{${keys.join(",")}}`;
  const isBareKeyCategory = prefixes.length === 1 && prefixes[0] === "";
  const prefixPart = isBareKeyCategory ? "" : `{${prefixes.join(",")}}-`;
  const bpPart =
    descriptor.responsive && breakpointKeys.length > 0
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
 * For a state `s`, only the RAW theme keys that have a matching sibling
 * (`key` + Pascal-cased `s`, e.g. `primary` + `primaryHover`) contribute —
 * and they contribute their OWN kebab-cased form (`primary-hover`), the
 * same class `createVariantMapper(prefix, tokens, { states })` chains onto
 * the base token. A category with no sibling for a given state emits no
 * line for it at all (never `{}` empty braces).
 * @param {TokenCategoryDescriptor} descriptor - Category descriptor
 * @param {ThemeConfig} theme - Theme configuration
 * @returns {string[]} Zero or more `@source inline(...)` directives, one per state that has at least one sibling pair
 */
const buildStateLines = (
  descriptor: TokenCategoryDescriptor,
  theme: ThemeConfig,
): string[] => {
  const states = descriptor.states;
  const prefixes = descriptor.classPrefixes;
  if (!states || states.length === 0 || !prefixes || prefixes.length === 0) {
    return [];
  }

  const record = descriptor.select?.(theme);
  const rawKeys = record ? Object.keys(record) : [];
  if (rawKeys.length === 0) return [];

  const rawKeySet = new Set(rawKeys);
  const isBareKeyCategory = prefixes.length === 1 && prefixes[0] === "";
  const prefixPart = isBareKeyCategory ? "" : `{${prefixes.join(",")}}-`;

  const lines: string[] = [];
  for (const state of states) {
    const siblingSuffix = toPascalCase(state);
    const siblingKebabKeys = rawKeys
      .filter((key) => rawKeySet.has(`${key}${siblingSuffix}`))
      .map((key) => toKebabCase(`${key}${siblingSuffix}`));

    if (siblingKebabKeys.length === 0) continue;

    lines.push(
      `@source inline("${state}:${prefixPart}{${siblingKebabKeys.join(",")}}");`,
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
 * Each category gets its OWN line (not one giant merged directive) so a
 * single category exceeding a reasonable brace-expansion size never
 * threatens the others; the `sp-*` line keeps DEV.2.5's brace-expansion
 * form rather than one directive per key.
 *
 * `extraSources` entries are assumed already validated (`generate()` runs
 * that validation before calling this) and are emitted verbatim, one
 * `@source inline("<entry>")` line each, after every other line.
 * @param {ThemeConfig} theme - Theme configuration
 * @param {StyleGeneratorOptions} [options] - Generator options
 * @returns {string} One `@source inline(...)` directive per line, empty when there is nothing to emit
 */
export const generateSourceInline = (
  theme: ThemeConfig,
  options: StyleGeneratorOptions = {},
): string => {
  const lines: string[] = [];
  const breakpointKeys = (
    options.breakpoints ?? DEFAULT_RESPONSIVE_BREAKPOINTS
  ).map((bp) => bp);

  for (const descriptor of builtInCategories) {
    const keys = resolveCategoryKeys(descriptor, theme);
    const line = buildCategoryLine(descriptor, keys, breakpointKeys);
    if (line) lines.push(line);
    lines.push(...buildStateLines(descriptor, theme));
  }

  if (options.spacing?.enabled !== false) {
    const spacingProps: SpacingPropertyMap =
      options.spacing?.properties ?? DEFAULT_SPACING_PROPERTIES;
    const spacingKeys = Object.keys(spacingProps);

    if (spacingKeys.length > 0) {
      lines.push(`@source inline("sp-{${spacingKeys.join(",")}}");`);
    }
  }

  for (const entry of options.extraSources ?? []) {
    lines.push(`@source inline("${entry}");`);
  }

  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
};
