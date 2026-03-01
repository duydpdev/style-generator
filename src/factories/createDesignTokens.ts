import {
  DEFAULT_BORDER_VALUES,
  DEFAULT_SPACING_PROPERTIES,
} from "../constants";
import { StyleGeneratorOptions, defaultScreens, ThemeConfig } from "../types";
import { toKebabCase } from "../utils";

/**
 * Creates a structured design tokens object from the theme configuration.
 * Useful for sharing token data with consumer applications (e.g., for CVA variant maps).
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} options - Generator options
 * @returns {Record<string, unknown>} Design tokens object
 */
export const createDesignTokens = (
  config: ThemeConfig,
  options: StyleGeneratorOptions = {},
) => {
  const { colors, typography, shadows, backDropBlurs, borderRadius, border } =
    config;

  const variantText = Object.keys(typography);
  const variantShadow = Object.keys(shadows ?? {});
  const variantBackdropBlur = Object.keys(backDropBlurs ?? {});
  const variantBorder = Object.keys(border ?? DEFAULT_BORDER_VALUES);
  const variantTextColor = Object.keys(colors.text);
  const variantColor = Object.keys(colors.base);
  const variantColors = [...variantColor, ...variantTextColor];

  const mergedScreens = {
    ...defaultScreens,
    ...options.screens,
  };

  const keysToUse = options.breakpoints ?? Object.keys(mergedScreens);
  const spacingProperties = Object.keys(
    options.spacing?.properties ?? DEFAULT_SPACING_PROPERTIES,
  );

  const roundedValues = Object.keys(borderRadius ?? {});

  return {
    DesignTokens: {
      Web: {
        variantText,
        variantTextColor,
        variantColor: variantColors.map(toKebabCase),
        variantShadow,
        variantBackdropBlur,
        borderOption: variantBorder,
        roundedOption: roundedValues,
        /** Available spacing property keys (used via CSS custom properties, not safelist). */
        spacingProperties,
        breakpoints: keysToUse,
        screens: mergedScreens,
      },
    },
  };
};
