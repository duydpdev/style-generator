import type {
  CamelCase,
  InferColorKeys,
  InferBorderWidthOptions,
  InferRoundedOptions,
} from "./inference";
import type { ThemeConfig } from "./themeSchema";

/**
 * Mapped type exposing the derived design-token key unions for a theme.
 * Distinct from `DesignTokensWeb` in `./inference` which describes the runtime
 * token arrays returned by `createDesignTokens()`. Consumers can pluck individual
 * variant unions via the semantic aliases below instead of writing
 * `(typeof DesignTokens.Web.X)[number]` everywhere.
 * @template T - ThemeConfig type (typically `typeof themeJson`)
 */
export interface DesignTokenKeys<T extends ThemeConfig> {
  colorKey: InferColorKeys<T>;
  textKey: CamelCase<Extract<keyof NonNullable<T["typography"]>, string>>;
  shadowKey: CamelCase<Extract<keyof NonNullable<T["shadows"]>, string>>;
  backdropBlurKey: CamelCase<
    Extract<keyof NonNullable<T["backDropBlurs"]>, string>
  >;
  fontFamilyKey: CamelCase<Extract<keyof NonNullable<T["fontFamily"]>, string>>;
  borderWidthKey: CamelCase<InferBorderWidthOptions<T>>;
  roundedKey: CamelCase<InferRoundedOptions<T>>;
}

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
