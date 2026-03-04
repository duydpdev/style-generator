import {
  DEFAULT_BORDER_VALUES,
  DEFAULT_ROUNDED_VALUES,
  DEFAULT_SPACING_PROPERTIES,
} from "../constants";
import {
  DesignTokensResult,
  InferColorKeys,
  InferBorderOptions,
  InferRoundedOptions,
  StyleGeneratorOptions,
  defaultScreens,
  ThemeConfig,
} from "../types";
import { toKebabCase } from "../utils";

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
  const { colors, typography, shadows, backDropBlurs, borderRadius, border } =
    config;

  const variantText = Object.keys(typography) as Extract<
    keyof TTheme["typography"],
    string
  >[];

  const variantShadow = Object.keys(shadows ?? {}) as Extract<
    keyof NonNullable<TTheme["shadows"]>,
    string
  >[];

  const variantBackdropBlur = Object.keys(backDropBlurs ?? {}) as Extract<
    keyof NonNullable<TTheme["backDropBlurs"]>,
    string
  >[];

  const variantBorder = (
    border ? Object.keys(border) : DEFAULT_BORDER_VALUES.map(String)
  ) as InferBorderOptions<TTheme>[];

  const variantTextColor = Object.keys(colors.text) as Extract<
    keyof TTheme["colors"]["text"],
    string
  >[];

  const variantBaseColor = Object.keys(colors.base) as Extract<
    keyof TTheme["colors"]["base"],
    string
  >[];

  const variantColors = [...variantBaseColor, ...variantTextColor].map(
    (color) => toKebabCase(color),
  ) as InferColorKeys<TTheme>[];

  const mergedScreens = {
    ...defaultScreens,
    ...options.screens,
  };

  const keysToUse = options.breakpoints ?? Object.keys(mergedScreens);
  const spacingProperties = Object.keys(
    options.spacing?.properties ?? DEFAULT_SPACING_PROPERTIES,
  );

  const roundedValues = (
    borderRadius ? Object.keys(borderRadius) : [...DEFAULT_ROUNDED_VALUES]
  ) as InferRoundedOptions<TTheme>[];

  return {
    DesignTokens: {
      Web: {
        variantText,
        variantTextColor,
        variantColor: variantColors,
        variantShadow,
        variantBackdropBlur,
        borderOption: variantBorder,
        roundedOption: roundedValues,
        spacingProperties,
        breakpoints: keysToUse,
        screens: mergedScreens,
      },
    },
  };
};
