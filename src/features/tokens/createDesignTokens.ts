import type {
  CategoryTokenKey,
  DesignTokensResult,
} from "../../core/inference";
import type { StyleGeneratorOptions } from "../../core/Options";
import { resolveTokenOptions } from "../../core/resolveTokenOptions";
import type { ResolvedTokenOptions } from "../../core/resolveTokenOptions";
import type { ThemeConfig } from "../../core/themeSchema";
import type { SpacingKey } from "../../shared/defaultOption";
import { toCamelCase } from "../../shared/helpers";
import {
  categoryTokenMeta,
  defaultKeysOf,
} from "../registry/categoryTokenMeta";

/**
 * The typed-token keys of one category: the theme's declared keys
 * (camelCased), else the category's defaults. A category that is absent OR
 * declared as an empty record counts as not declared — the same rule
 * `generateSourceInline` applies, so the token arrays always match the
 * `@source inline` coverage.
 * @param {Readonly<Record<string, unknown>> | undefined} record - The theme's record for the category
 * @param {readonly unknown[]} [defaults] - The category's `defaultValues` (none when omitted)
 * @returns {string[]} CamelCased declared keys, or the literal default suffixes
 */
const categoryTokenKeys = (
  record: Readonly<Record<string, unknown>> | undefined,
  defaults?: readonly unknown[],
): string[] => {
  const declared = Object.keys(record ?? {});
  return declared.length > 0
    ? declared.map(toCamelCase)
    : defaultKeysOf(defaults);
};

/**
 * Build the design tokens from already-resolved options. `generate()` calls
 * this with the options it resolved once; {@link createDesignTokens} wraps it
 * for callers holding raw options. Kept a literal, not a descriptor loop
 * (that would pull the descriptors into the `./tokens` budget): property
 * names are compiler-checked against each descriptor's `key`
 * (`CategoryTokenArrays`), and `cva-roundtrip.test.ts` pins every array's
 * keys and defaults to the `@source inline` keys of its descriptor.
 * @param {ThemeConfig} config - Theme configuration
 * @param {ResolvedTokenOptions} options - Resolved token options (`breakpoints`, `screens`, `spacing`)
 * @returns {DesignTokensResult<ThemeConfig>} Design tokens object inferred from theme
 */
export const buildDesignTokens = <TTheme extends ThemeConfig>(
  config: TTheme,
  options: ResolvedTokenOptions,
): DesignTokensResult<TTheme> => ({
  DesignTokens: {
    Web: {
      typography: categoryTokenKeys(config.typography) as CategoryTokenKey<
        TTheme,
        "typography"
      >[],
      colors: categoryTokenKeys(config.colors) as CategoryTokenKey<
        TTheme,
        "colors"
      >[],
      shadows: categoryTokenKeys(config.shadows) as CategoryTokenKey<
        TTheme,
        "shadows"
      >[],
      backDropBlurs: categoryTokenKeys(
        config.backDropBlurs,
      ) as CategoryTokenKey<TTheme, "backDropBlurs">[],
      fontFamily: categoryTokenKeys(config.fontFamily) as CategoryTokenKey<
        TTheme,
        "fontFamily"
      >[],
      borderWidth: categoryTokenKeys(
        config.borderWidth,
        categoryTokenMeta.borderWidth.defaultValues,
      ) as CategoryTokenKey<TTheme, "borderWidth">[],
      borderRadius: categoryTokenKeys(
        config.borderRadius,
        categoryTokenMeta.borderRadius.defaultValues,
      ) as CategoryTokenKey<TTheme, "borderRadius">[],
      spacingProperties: Object.keys(
        options.spacing.properties,
      ) as SpacingKey[],
      breakpoints: [...options.breakpoints],
      screens: { ...options.screens },
    },
  },
});

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
): DesignTokensResult<TTheme> =>
  buildDesignTokens(config, resolveTokenOptions(options));
