import {
  DEFAULT_BORDER_VALUES,
  DEFAULT_ROUNDED_VALUES,
} from "../../shared/defaultOption";

import type { TokenCategoryDescriptor } from "./TokenCategoryDescriptor";

/**
 * The part of the category descriptors the typed tokens
 * (`createDesignTokens`) read at runtime: the built-in categories that fall
 * back to default values when the theme omits them, by `ThemeConfig` key
 * (every other category has none). A module of its own, free of the CSS half
 * of the descriptors (class prefixes, states, `--sg-*` naming), so the
 * browser-safe `./tokens` entry stays small. The built-in descriptors spread
 * these objects, so a category's defaults are still declared exactly once.
 */
export const categoryTokenMeta = {
  borderRadius: { defaultValues: DEFAULT_ROUNDED_VALUES },
  borderWidth: { defaultValues: DEFAULT_BORDER_VALUES },
} as const satisfies Record<
  string,
  Pick<TokenCategoryDescriptor, "defaultValues">
>;

/**
 * The literal class-suffix keys a category falls back to when the theme
 * omits it or declares it as an empty record: its `defaultValues` (a
 * number/string array stringified, a record's own keys otherwise). Empty for
 * a category without defaults. Shared by the CSS (`generateSourceInline`) and
 * the typed tokens (`createDesignTokens`) so both fall back to exactly the
 * same keys.
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
