/**
 * Subpath: `@duydpdev/style-generator/types`
 *
 * Pure type re-exports. Zero runtime cost (erased at build).
 */
export type {
  ThemeConfig,
  ThemeOverride,
  TypographyConfig,
} from "../core/themeSchema";
export type { StyleGeneratorOptions, StyleModule } from "../core/Options";
export type {
  InferColorKeys,
  InferTypographyKeys,
  InferShadowKeys,
  InferBackdropBlurKeys,
  InferSafelistClasses,
  DesignTokensResult,
} from "../core/inference";
export type {
  DesignTokenKeys,
  ColorVariant,
  TextVariant,
  ShadowVariant,
  BackdropBlurVariant,
  BorderVariant,
  RoundedVariant,
} from "../core/designTokensTypes";
export type { ResponsiveValueStrict } from "../features/spacing/spacingHelpers";
