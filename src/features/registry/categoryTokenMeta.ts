import {
  DEFAULT_BORDER_VALUES,
  DEFAULT_ROUNDED_VALUES,
} from "../../shared/defaultOption";

import type { TokenCategoryDescriptor } from "./TokenCategoryDescriptor";

/** Default values of the built-in categories that have them, by `ThemeConfig` key; the descriptors spread these. */
// Rationale: documents/architecture.md#categorytokenmeta-why-defaults-live-apart-from-the-descriptors
export const categoryTokenMeta = {
  borderRadius: { defaultValues: DEFAULT_ROUNDED_VALUES },
  borderWidth: { defaultValues: DEFAULT_BORDER_VALUES },
} as const satisfies Record<
  string,
  Pick<TokenCategoryDescriptor, "defaultValues">
>;

/**
 * Class-suffix keys a category falls back to when the theme omits it or
 * leaves it empty; shared by the CSS and the typed tokens so both agree.
 * @param {TokenCategoryDescriptor["defaultValues"]} defaults - The category's `defaultValues`, if any
 * @returns {string[]} Default keys, or `[]` when the category has none
 */
export const defaultKeysOf = (
  defaults: TokenCategoryDescriptor["defaultValues"],
): string[] => {
  if (Array.isArray(defaults)) {
    return defaults.map(String);
  }
  return defaults === undefined ? [] : Object.keys(defaults);
};
