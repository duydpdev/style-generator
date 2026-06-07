import type {
  CamelCase,
  InferColorKeys,
  InferBorderOptions,
  InferRoundedOptions,
} from "./inference";
import type { ThemeConfig } from "./ThemeConfig";

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
  borderKey: CamelCase<InferBorderOptions<T>>;
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

/** Border variant union derived from theme.border keys (falls back to defaults). */
export type BorderVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["borderKey"];

/** Rounded variant union derived from theme.borderRadius keys (falls back to defaults). */
export type RoundedVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["roundedKey"];
