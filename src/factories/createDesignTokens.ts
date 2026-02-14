import {
  roundedOptionBase,
  borderOption,
  spacingOption,
  opacityOption,
  zIndexOption,
} from "../constants";
import { StyleGeneratorOptions, defaultScreens, ThemeConfig } from "../types";

/**
 * Creates a structured design tokens object from the theme configuration.
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} options - Generator options
 * @returns {Record<string, unknown>} Design tokens object
 */
export const createDesignTokens = (
  config: ThemeConfig,
  options: StyleGeneratorOptions = {},
) => {
  const { colors, typography, shadows, backDropBlurs, borderRadius } = config;

  const roundedOption = Array.from(
    new Set([...roundedOptionBase, ...(Object.keys(borderRadius ?? {}) as [])]),
  );

  const variantText = Object.keys(typography);
  const variantShadow = Object.keys(shadows ?? {});
  const variantBackdropBlur = Object.keys(backDropBlurs ?? {});
  const variantTextColor = Object.keys(colors.text);
  const variantColor = Object.keys(colors.base);
  const variantColors = [...variantColor, ...variantTextColor];

  const mergedScreens = {
    ...defaultScreens,
    ...options.screens,
  };

  const keysToUse = options.breakpoints ?? Object.keys(mergedScreens);
  // Usually for tokens we might want all screens, but let's stick to the options logic.

  return {
    DesignTokens: {
      Web: {
        variantText,
        variantTextColor,
        variantColor: variantColors,
        spacingOption,
        borderOption,
        roundedOption,
        variantShadow,
        variantBackdropBlur,
        opacityOption,
        zIndexOption,
        breakpoints: keysToUse,
        screens: mergedScreens,
      },
    },
  };
};
