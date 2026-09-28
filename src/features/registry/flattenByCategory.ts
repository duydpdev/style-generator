import { toKebabCase } from "../../shared/helpers";

import { TokenCategoryDescriptor } from "./TokenCategoryDescriptor";

/**
 * Flatten a theme category's flat key-value data into intermediate CSS
 * variable declarations, using the category descriptor's `cssVarPrefix`.
 * Replaces the old duplicated `buildCssVars` (plugin) /
 * `buildIntermediateVars` (theme-css) — both did the exact same
 * `--${prefix}-${kebabKey}` computation per category.
 *
 * Categories without a `cssVarPrefix` (e.g. `border`, whose widths map to
 * Tailwind's built-in scale rather than a CSS variable) flatten to `{}`.
 * @param {TokenCategoryDescriptor} descriptor - Category descriptor
 * @param {Record<string, string> | undefined} data - Flat key-value theme data for this category
 * @returns {Record<string, string>} CSS variable map, e.g. `{ "--sg-primary": "#fff" }`
 */
export const flattenByCategory = (
  descriptor: TokenCategoryDescriptor,
  data: Record<string, string> | undefined,
): Record<string, string> => {
  if (!data || !descriptor.cssVarPrefix) return {};

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    result[`--${descriptor.cssVarPrefix}-${toKebabCase(key)}`] = value;
  }
  return result;
};
