import type { BuiltInCategory } from "../features/registry/builtInCategories";

import type { CategoryTokenKey } from "./inference";
import type { ThemeConfig } from "./themeSchema";

type CategoryTokenKeyMap<T extends ThemeConfig> = {
  [C in BuiltInCategory as C["tokenKeyName"]]: CategoryTokenKey<T, C["key"]>;
};

/**
 * The token key unions of a theme, one per category (`colorKey`, `textKey`, …);
 * an interface so consumers can augment it.
 * @template T - ThemeConfig type (typically `typeof themeJson`)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- an interface (not an alias) keeps declaration merging
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

/** Backdrop-blur variant union derived from theme.backdropBlurs keys. */
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

/** Axis names of `theme.themeAxes`; `never` without it. */
export type ThemeAxisName<T extends ThemeConfig> = T extends unknown
  ? Extract<keyof NonNullable<T["themeAxes"]>, string>
  : never;

/** Variant names of one `themeAxes` axis. */
export type ThemeAxisVariant<
  T extends ThemeConfig,
  A extends ThemeAxisName<T>,
> = T extends unknown
  ? A extends keyof NonNullable<T["themeAxes"]>
    ? Extract<keyof NonNullable<T["themeAxes"]>[A], string>
    : never
  : never;

/** The active variant per axis, or the reserved `"base"` for no override. */
export type ThemeAxesState<T extends ThemeConfig> = {
  readonly [A in ThemeAxisName<T>]?: ThemeAxisVariant<T, A> | "base";
};
