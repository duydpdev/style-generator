import { ALIAS_VALUE_RE } from "../../core/tokenGrammar";
import { toKebabCase } from "../../shared/helpers";

import type { TokenCategoryDescriptor } from "./TokenCategoryDescriptor";

/**
 * Flatten a theme category's flat key-value data into intermediate CSS
 * variable declarations, using the category descriptor's `cssVarPrefix`.
 * One registry-driven `--${prefix}-${kebabKey}` computation shared by every
 * category.
 *
 * A value matching `$<TokenKey>` (see `ALIAS_VALUE_RE`) is resolved to
 * `var(--<cssVarPrefix>-<kebab-target>)` instead of being emitted
 * literally — `ThemeSchema`'s alias refinement has already proven the
 * reference exists (within the same category) and is acyclic, so this
 * function trusts it without re-validating.
 *
 * Categories without a `cssVarPrefix` (e.g. `typography`, which has no
 * CSS variable at all) flatten to `{}`.
 * @param {TokenCategoryDescriptor} descriptor - Category descriptor
 * @param {Record<string, string> | undefined} data - Flat key-value theme data for this category
 * @returns {Record<string, string>} CSS variable map, e.g. `{ "--sg-color-primary": "#fff" }`
 */
export const flattenByCategory = (
  descriptor: TokenCategoryDescriptor,
  data: Record<string, string> | undefined,
): Record<string, string> => {
  if (!data || !descriptor.cssVarPrefix) return {};

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    const aliasTarget = ALIAS_VALUE_RE.exec(value)?.[1];
    const resolvedValue =
      aliasTarget === undefined
        ? value
        : `var(--${descriptor.cssVarPrefix}-${toKebabCase(aliasTarget)})`;
    result[`--${descriptor.cssVarPrefix}-${toKebabCase(key)}`] = resolvedValue;
  }
  return result;
};
