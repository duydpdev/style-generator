import { parseAliasRef } from "../../core/tokenGrammar";
import { toKebabCase } from "../../shared/helpers";

import type { TokenCategoryDescriptor } from "./TokenCategoryDescriptor";

/**
 * One category value as CSS: a literal, `var(…)` for `$key`, or a `color-mix(…)` for `$key/<n>`.
 * @param {string} prefix - The category's `cssVarPrefix`
 * @param {string | number} value - The theme value
 * @returns {string} The CSS value
 */
const resolveValue = (prefix: string, value: string | number): string => {
  const ref = typeof value === "string" ? parseAliasRef(value) : undefined;
  if (ref === undefined) return String(value);
  const target = `var(--${prefix}-${toKebabCase(ref.key)})`;
  if (ref.alpha === undefined) return target;
  return `color-mix(in srgb, ${target} ${String(ref.alpha)}%, transparent)`;
};

/**
 * Flattens one category's data into `--<cssVarPrefix>-<kebab-key>`
 * declarations (`{}` without a `cssVarPrefix`). Aliases are trusted:
 * `ThemeSchema` already proved they exist, are acyclic and sit in the right category.
 * @param {TokenCategoryDescriptor} descriptor - Category descriptor
 * @param {Readonly<Record<string, string | number>> | undefined} data - Flat key-value theme data for this category (numbers for `opacity`/`zIndex`)
 * @returns {Record<string, string>} CSS variable map, e.g. `{ "--sg-color-primary": "#fff" }`
 */
export const flattenByCategory = (
  descriptor: TokenCategoryDescriptor,
  data: Readonly<Record<string, string | number>> | undefined,
): Record<string, string> => {
  if (!data || !descriptor.cssVarPrefix) return {};

  const prefix = descriptor.cssVarPrefix;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    result[`--${prefix}-${toKebabCase(key)}`] = resolveValue(prefix, value);
  }
  return result;
};
