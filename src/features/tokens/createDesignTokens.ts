import {
  DEFAULT_BORDER_VALUES,
  DEFAULT_ROUNDED_VALUES,
  DEFAULT_SPACING_PROPERTIES,
} from "../../shared/defaultOption";
import {
  DesignTokensResult,
  DesignTokensWeb,
  InferColorKeys,
  InferBorderOptions,
  InferRoundedOptions,
} from "../../core/inference";
import { StyleGeneratorOptions, defaultScreens } from "../../core/Options";
import { ThemeConfig } from "../../core/ThemeConfig";
import { toKebabCase } from "../../shared/helpers";

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

  // Helper to extract nested keys safely
  const extractKeys = (obj: Record<string, unknown> | undefined): string[] => {
    if (!obj) return [];
    const keys: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (k === "DEFAULT") {
        keys.push(""); // DEFAULT signifies drop prefix
      } else if (typeof v === "object" && v !== null) {
        const subKeys = extractKeys(v as Record<string, unknown>);
        for (const sub of subKeys) {
          keys.push(sub ? `${k}-${sub}` : k);
        }
      } else {
        keys.push(k);
      }
    }
    return keys;
  };

  const variantTextColor = extractKeys(
    colors.text as Record<string, unknown> | undefined,
  ) as DesignTokensWeb<TTheme>["variantTextColor"];

  const variantCommonColor = extractKeys(
    colors.common as Record<string, unknown> | undefined,
  ) as DesignTokensWeb<TTheme>["variantCommonColor"];

  const variantBaseColor = extractKeys(
    colors.base as Record<string, unknown> | undefined,
  ) as Extract<keyof TTheme["colors"]["base"], string>[];

  const variantColors = [
    ...variantBaseColor,
    ...variantTextColor,
    ...variantCommonColor,
  ]
    .filter(Boolean)
    .map((color) => toKebabCase(color)) as InferColorKeys<TTheme>[];

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
        variantCommonColor,
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
