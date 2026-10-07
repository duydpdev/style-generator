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
export type { CoverageRule, StyleGeneratorOptions } from "../core/Options";
export type { CategoryTokenKey, DesignTokensResult } from "../core/inference";
export type { CategoryKey } from "../features/registry/builtInCategories";
export type {
  DesignTokenKeys,
  ColorVariant,
  TextVariant,
  ShadowVariant,
  BackdropBlurVariant,
  FontFamilyVariant,
  BorderWidthVariant,
  RoundedVariant,
} from "../core/designTokensTypes";
export type { ResponsiveValueStrict } from "../features/spacing/spacingHelpers";
export type { VariantMapperStatesOptions } from "../features/cva/createVariantMapper";
