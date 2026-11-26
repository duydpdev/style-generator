import type {
  BreakpointKeys,
  CategoryTokenKey,
  DesignTokensResult,
  OpacitySteps,
  SpacingKeys,
} from "../../core/inference";
import type { ExactOptions, StyleGeneratorOptions } from "../../core/Options";
import { resolveTokenOptions } from "../../core/resolveTokenOptions";
import type { ResolvedTokenOptions } from "../../core/resolveTokenOptions";
import type { ThemeConfig } from "../../core/themeSchema";
import { toCamelCase } from "../../shared/helpers";
import {
  categoryTokenMeta,
  defaultKeysOf,
} from "../registry/categoryTokenMeta";

// Declared keys (camelCased), else the defaults; an empty record counts as absent,
// as in `generateSourceInline`, so the token arrays match the `@source inline` coverage.
const categoryTokenKeys = (
  record: Readonly<Record<string, unknown>> | undefined,
  defaults?: readonly unknown[],
): string[] => {
  const declared = Object.keys(record ?? {});
  return declared.length > 0
    ? declared.map(toCamelCase)
    : defaultKeysOf(defaults);
};

type ColorRecord = Readonly<Record<string, unknown>> | undefined;

interface ColorSource {
  readonly colors?: ColorRecord;
  readonly themeAxes?:
    Readonly<Record<string, Readonly<Record<string, ColorSource>>>> | undefined;
}

// CamelCased color keys holding a `$` alias in the base or any axis override (the
// `coverage.keys: "aliased"` holders); tolerates an unvalidated theme.
const aliasedColorKeys = (theme: ColorSource): string[] =>
  Object.keys(theme.colors ?? {})
    .filter((key) =>
      [
        theme.colors,
        ...Object.values(theme.themeAxes ?? {}).flatMap((variants) =>
          Object.values(variants).map((override) => override.colors),
        ),
      ].some((record) => String(record?.[key]).startsWith("$")),
    )
    .map(toCamelCase);

/**
 * Builds the design tokens from resolved options; `O` only shapes the return type.
 * @template TTheme
 * @template O
 * @param {ThemeConfig} config - Theme configuration
 * @param {ResolvedTokenOptions} options - Resolved token options
 * @returns {DesignTokensResult<ThemeConfig, O>} Design tokens object inferred from theme and options
 */
// Rationale: documents/architecture.md#builddesigntokens-why-a-literal-and-not-a-descriptor-loop
export const buildDesignTokens = <
  TTheme extends ThemeConfig,
  // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- `{}` is the "no extra options" default of the options type parameter
  O = Record<never, never>,
>(
  config: TTheme,
  options: ResolvedTokenOptions,
): DesignTokensResult<TTheme, O> => ({
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
      backdropBlurs: categoryTokenKeys(
        config.backdropBlurs,
      ) as CategoryTokenKey<TTheme, "backdropBlurs">[],
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
      motionDuration: categoryTokenKeys(
        config.motionDuration,
      ) as CategoryTokenKey<TTheme, "motionDuration">[],
      motionEasing: categoryTokenKeys(config.motionEasing) as CategoryTokenKey<
        TTheme,
        "motionEasing"
      >[],
      controlHeight: categoryTokenKeys(
        config.controlHeight,
      ) as CategoryTokenKey<TTheme, "controlHeight">[],
      iconSize: categoryTokenKeys(config.iconSize) as CategoryTokenKey<
        TTheme,
        "iconSize"
      >[],
      opacity: categoryTokenKeys(config.opacity) as CategoryTokenKey<
        TTheme,
        "opacity"
      >[],
      zIndex: categoryTokenKeys(config.zIndex) as CategoryTokenKey<
        TTheme,
        "zIndex"
      >[],
      spacingProperties: Object.keys(
        options.spacing.properties,
      ) as SpacingKeys<O>[],
      breakpoints: [...options.breakpoints] as BreakpointKeys<O>[],
      screens: { ...options.screens } as DesignTokensResult<
        TTheme,
        O
      >["DesignTokens"]["Web"]["screens"],
      // Runtime key set; the type is the superset `AliasedColorKey`.
      aliasedColors: aliasedColorKeys(config) as unknown as DesignTokensResult<
        TTheme,
        O
      >["DesignTokens"]["Web"]["aliasedColors"],
      opacities: [...options.opacities] as OpacitySteps<O>[],
    },
  },
});

/**
 * Creates the typed design tokens from a theme. Literal `breakpoints`, `screens` and
 * `spacing.properties` keys of `options` stay in the types; `StyleGeneratorOptions` widens them.
 * @template TTheme
 * @template O
 * @param {ThemeConfig} config - Theme configuration (the optional second argument is the `StyleGeneratorOptions`)
 * @returns {DesignTokensResult<ThemeConfig, O>} Design tokens object inferred from theme and options
 */
export function createDesignTokens<const TTheme extends ThemeConfig>(
  config: TTheme,
): DesignTokensResult<TTheme>;
export function createDesignTokens<
  const TTheme extends ThemeConfig,
  const O extends StyleGeneratorOptions = StyleGeneratorOptions,
>(
  config: TTheme,
  options: ExactOptions<O> | undefined,
): DesignTokensResult<TTheme, O>;
export function createDesignTokens(
  config: ThemeConfig,
  options?: StyleGeneratorOptions,
): DesignTokensResult<ThemeConfig, StyleGeneratorOptions> {
  return buildDesignTokens<ThemeConfig, StyleGeneratorOptions>(
    config,
    resolveTokenOptions(options),
  );
}
