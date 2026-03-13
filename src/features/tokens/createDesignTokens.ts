import {
  DEFAULT_BORDER_VALUES,
  DEFAULT_ROUNDED_VALUES,
  DEFAULT_SPACING_PROPERTIES,
  DEFAULT_ZINDEX_VALUES,
} from "../../shared/defaultOption";
import {
  CamelCase,
  DesignTokensResult,
  DesignTokensWeb,
  InferColorKeys,
  InferBorderOptions,
  InferRoundedOptions,
  InferZIndexOptions,
} from "../../core/inference";
import { StyleGeneratorOptions, defaultScreens } from "../../core/Options";
import { ThemeConfig } from "../../core/ThemeConfig";
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
  const { colors, typography, shadows, backDropBlurs, borderRadius, border } =
    config;

  const variantText = Object.keys(typography).map(toCamelCase) as CamelCase<
    Extract<keyof TTheme["typography"], string>
  >[];

  const variantShadow = Object.keys(shadows ?? {}).map(
    toCamelCase,
  ) as CamelCase<Extract<keyof NonNullable<TTheme["shadows"]>, string>>[];

  const variantBackdropBlur = Object.keys(backDropBlurs ?? {}).map(
    toCamelCase,
  ) as CamelCase<Extract<keyof NonNullable<TTheme["backDropBlurs"]>, string>>[];

  const variantBorder = (
    border
      ? Object.keys(border).map(toCamelCase)
      : DEFAULT_BORDER_VALUES.map(String)
  ) as CamelCase<InferBorderOptions<TTheme>>[];

  // Helper to extract nested keys safely and convert to camelCase
  const extractKeys = (obj: Record<string, unknown> | undefined): string[] => {
    if (!obj) return [];
    const keys: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (k === "DEFAULT") {
        keys.push(""); // DEFAULT signifies drop prefix
      } else if (typeof v === "object" && v !== null) {
        const subKeys = extractKeys(v as Record<string, unknown>);
        for (const sub of subKeys) {
          keys.push(sub ? toCamelCase(`${k}-${sub}`) : toCamelCase(k));
        }
      } else {
        keys.push(toCamelCase(k));
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
  ) as DesignTokensWeb<TTheme>["variantBaseColor"];

  const variantColors = [
    ...variantBaseColor,
    ...variantTextColor,
    ...variantCommonColor,
  ]
    .filter(Boolean)
    .map((color) => toCamelCase(color)) as InferColorKeys<TTheme>[];

  const mergedScreens = {
    ...defaultScreens,
    ...options.screens,
  };

  const keysToUse = options.breakpoints ?? Object.keys(mergedScreens);
  const spacingProperties = Object.keys(
    options.spacing?.properties ?? DEFAULT_SPACING_PROPERTIES,
  );

  const roundedValues = (
    borderRadius
      ? Object.keys(borderRadius).map(toCamelCase)
      : [...DEFAULT_ROUNDED_VALUES]
  ) as CamelCase<InferRoundedOptions<TTheme>>[];

  const zIndexValues = (
    options.zIndex?.enabled === false
      ? ([] as InferZIndexOptions<TTheme>[])
      : (options.zIndex?.values ?? [...DEFAULT_ZINDEX_VALUES])
  ) as InferZIndexOptions<TTheme>[];

  return {
    DesignTokens: {
      Web: {
        variantText,
        variantBaseColor,
        variantTextColor,
        variantCommonColor,
        variantColor: variantColors,
        variantShadow,
        variantBackdropBlur,
        borderOption: variantBorder,
        roundedOption: roundedValues,
        zIndexOption: zIndexValues,
        spacingProperties,
        breakpoints: keysToUse,
        screens: mergedScreens,
      },
    },
  };
};
