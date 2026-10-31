import type {
  BreakpointKeys,
  CategoryTokenKey,
  DesignTokensResult,
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

type ColorRecord = Readonly<Record<string, unknown>> | undefined;

interface ColorSource {
  readonly colors?: ColorRecord;
  readonly themeAxes?:
    | Readonly<Record<string, Readonly<Record<string, ColorSource>>>>
    | undefined;
}

/**
 * The camelCased color keys whose value is a `$<key>` alias, in the base
 * record or in any `themeAxes` override — the same holders
 * `coverage.keys: "aliased"` keeps — in declaration order. An override may
 * only redefine a declared key (the schema rejects the rest), so walking the
 * base keys finds every holder once. Tolerates an unvalidated theme (no
 * `colors`, non-string values).
 * @param {ColorSource} theme - The theme (only `colors` and `themeAxes` are read)
 * @returns {string[]} CamelCased alias-holder keys
 */
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
 * Build the design tokens from already-resolved options. `generate()` calls
 * this with the options it resolved once; {@link createDesignTokens} wraps it
 * for callers holding raw options. Kept a literal, not a descriptor loop
 * (that would pull the descriptors into the `./tokens` budget): property
 * names are compiler-checked against each descriptor's `key`
 * (`CategoryTokenArrays`), and `cva-roundtrip.test.ts` pins every array's
 * keys and defaults to the `@source inline` keys of its descriptor.
 *
 * `O` is the type of the caller's raw options: it only shapes the return type
 * (`breakpoints`, `spacingProperties`, `screens`); every runtime value comes
 * from `options`.
 * @template TTheme
 * @template O
 * @param {ThemeConfig} config - Theme configuration
 * @param {ResolvedTokenOptions} options - Resolved token options (`breakpoints`, `screens`, `spacing`)
 * @returns {DesignTokensResult<ThemeConfig, O>} Design tokens object inferred from theme and options
 */
export const buildDesignTokens = <
  TTheme extends ThemeConfig,
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
      ) as SpacingKeys<O>[],
      breakpoints: [...options.breakpoints] as BreakpointKeys<O>[],
      screens: { ...options.screens } as DesignTokensResult<
        TTheme,
        O
      >["DesignTokens"]["Web"]["screens"],
      // The key set is only known at runtime; the type is the superset
      // `AliasedColorKey` (see inference.ts).
      aliasedColors: aliasedColorKeys(config) as unknown as DesignTokensResult<
        TTheme,
        O
      >["DesignTokens"]["Web"]["aliasedColors"],
    },
  },
});

/**
 * Creates a structured design tokens object from the theme configuration.
 * Useful for sharing token data with consumer applications (e.g., for CVA variant maps).
 * With `options`, `const O` keeps literal `breakpoints`, `screens` keys and
 * `spacing.properties` keys in the result's types; options typed as
 * `StyleGeneratorOptions` — or an explicit `<typeof theme>` type argument,
 * which leaves `O` at its default — widen them to `string`. Without
 * `options` the result carries the library defaults.
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
