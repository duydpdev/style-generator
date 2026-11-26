// Rationale: documents/architecture.md#typests-why-breakpoint-is-not-re-exported
/** Subpath `@duydpdev/style-generator/types`: type-only re-exports. */
export type {
  ThemeConfig,
  ThemeOverride,
  TypographyConfig,
} from "../core/themeSchema";
export type {
  CoverageRule,
  ExactOptions,
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
  OpacitySteps,
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
