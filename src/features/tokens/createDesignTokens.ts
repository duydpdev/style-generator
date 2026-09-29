import {
  DEFAULT_BORDER_VALUES,
  DEFAULT_BREAKPOINTS,
  DEFAULT_ROUNDED_VALUES,
  DEFAULT_SPACING_PROPERTIES,
  type SpacingKey,
} from "../../shared/defaultOption";
import type {
  CamelCase,
  DesignTokensResult,
  InferColorKeys,
  InferBorderWidthOptions,
  InferRoundedOptions,
} from "../../core/inference";
import type { StyleGeneratorOptions } from "../../core/Options";
import { defaultScreens } from "../../core/Options";
import type { ThemeConfig } from "../../core/themeSchema";
import { toCamelCase } from "../../shared/helpers";

/**
 * Creates a structured design tokens object from the theme configuration.
 * Useful for sharing token data with consumer applications (e.g., for CVA variant maps).
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} options - Generator options
 * @returns {DesignTokensResult<ThemeConfig>} Design tokens object inferred from theme
 */
export const createDesignTokens = <TTheme extends ThemeConfig>(
  config: TTheme,
  options: StyleGeneratorOptions = {},
): DesignTokensResult<TTheme> => {
  const {
    colors,
    typography,
    shadows,
    backDropBlurs,
    borderRadius,
    borderWidth,
    fontFamily,
  } = config;

  const variantText = Object.keys(typography ?? {}).map(
    toCamelCase,
  ) as CamelCase<Extract<keyof NonNullable<TTheme["typography"]>, string>>[];

  const variantShadow = Object.keys(shadows ?? {}).map(
    toCamelCase,
  ) as CamelCase<Extract<keyof NonNullable<TTheme["shadows"]>, string>>[];

  const variantBackdropBlur = Object.keys(backDropBlurs ?? {}).map(
    toCamelCase,
  ) as CamelCase<Extract<keyof NonNullable<TTheme["backDropBlurs"]>, string>>[];

  const variantFontFamily = Object.keys(fontFamily ?? {}).map(
    toCamelCase,
  ) as CamelCase<Extract<keyof NonNullable<TTheme["fontFamily"]>, string>>[];

  const variantBorderWidth = (
    borderWidth
      ? Object.keys(borderWidth).map(toCamelCase)
      : DEFAULT_BORDER_VALUES.map(String)
  ) as CamelCase<InferBorderWidthOptions<TTheme>>[];

  const variantColor = Object.keys(colors).map(
    toCamelCase,
  ) as InferColorKeys<TTheme>[];

  const mergedScreens = {
    ...defaultScreens,
    ...options.screens,
  };

  const keysToUse = options.breakpoints ?? [...DEFAULT_BREAKPOINTS];
  const spacingProperties = Object.keys(
    options.spacing?.properties ?? DEFAULT_SPACING_PROPERTIES,
  ) as SpacingKey[];

  const roundedValues = (
    borderRadius
      ? Object.keys(borderRadius).map(toCamelCase)
      : [...DEFAULT_ROUNDED_VALUES]
  ) as CamelCase<InferRoundedOptions<TTheme>>[];

  return {
    DesignTokens: {
      Web: {
        variantText,
        variantColor,
        variantShadow,
        variantBackdropBlur,
        variantFontFamily,
        borderWidthOption: variantBorderWidth,
        roundedOption: roundedValues,
        spacingProperties,
        breakpoints: keysToUse,
        screens: mergedScreens,
      },
    },
  };
};
