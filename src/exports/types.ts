/**
 * Subpath: `@duydpdev/style-generator/types`
 *
 * Pure type re-exports. Zero runtime cost (erased at build). `Breakpoint` is
 * not re-exported here: it is also a runtime const (`./tokens`, `.`), and the
 * declaration rollup would turn a type-only re-export into a declared value
 * this entry never ships.
 */
export type {
  ThemeConfig,
  ThemeOverride,
  TypographyConfig,
} from "../core/themeSchema";
export type {
  CoverageRule,
  SpacingPropertyMap,
  StyleGeneratorOptions,
} from "../core/Options";
export type {
  BreakpointKeys,
  CamelCase,
  CategoryTokenKey,
  DesignTokensResult,
  DesignTokensWeb,
  InferBorderWidthOptions,
  InferRoundedOptions,
  InferSpacingKeys,
  KebabCase,
  ScreenKeys,
  SpacingKeys,
} from "../core/inference";
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
  ThemeAxisName,
  ThemeAxisVariant,
  ThemeAxesState,
} from "../core/designTokensTypes";
export type {
  DefaultBreakpointKeys,
  ResponsiveValueStrict,
} from "../features/spacing/spacingHelpers";
export type {
  DefaultBorderValue,
  DefaultRoundedValue,
  SpacingKey,
} from "../shared/defaultOption";
