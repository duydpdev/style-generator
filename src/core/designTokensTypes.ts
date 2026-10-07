import type { BuiltInCategory } from "../features/registry/builtInCategories";

import type { CategoryTokenKey } from "./inference";
import type { ThemeConfig } from "./themeSchema";

/** One key union per built-in category, named by the descriptor's `tokenKeyName`. */
type CategoryTokenKeyMap<T extends ThemeConfig> = {
  [C in BuiltInCategory as C["tokenKeyName"]]: CategoryTokenKey<T, C["key"]>;
};

/**
 * The derived design-token key unions for a theme, one per built-in category
 * (`colorKey`, `textKey`, `roundedKey`, …).
 * Distinct from `DesignTokensWeb` in `./inference` which describes the runtime
 * token arrays returned by `createDesignTokens()`. Consumers can pluck individual
 * variant unions via the semantic aliases below instead of writing
 * `(typeof DesignTokens.Web.X)[number]` everywhere.
 * Kept an interface (as in 4.1) so consumers can still augment it.
 * @template T - ThemeConfig type (typically `typeof themeJson`)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- an interface (not an alias) keeps 4.1 declaration merging
export interface DesignTokenKeys<
  T extends ThemeConfig,
> extends CategoryTokenKeyMap<T> {}

/** Color variant union derived from theme.colors keys (camelCased). */
export type ColorVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["colorKey"];

/** Typography variant union derived from theme.typography keys. */
export type TextVariant<T extends ThemeConfig> = DesignTokenKeys<T>["textKey"];

/** Shadow variant union derived from theme.shadows keys. */
export type ShadowVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["shadowKey"];

/** Backdrop-blur variant union derived from theme.backDropBlurs keys. */
export type BackdropBlurVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["backdropBlurKey"];

/** Font-family variant union derived from theme.fontFamily keys. */
export type FontFamilyVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["fontFamilyKey"];

/** Border-width variant union derived from theme.borderWidth keys (falls back to defaults). */
export type BorderWidthVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["borderWidthKey"];

/** Rounded variant union derived from theme.borderRadius keys (falls back to defaults). */
export type RoundedVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["roundedKey"];
