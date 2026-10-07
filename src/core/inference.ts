import type {
  BuiltInCategory,
  CategoryKey,
} from "../features/registry/builtInCategories";
import type { categoryTokenMeta } from "../features/registry/categoryTokenMeta";
import type { SpacingKey } from "../shared/defaultOption";

import type { ThemeConfig } from "./themeSchema";

// ---- Basic utilities ----

export type CamelCase<S extends string> = S extends `${infer P1}-${infer P2}`
  ? `${Uncapitalize<P1>}${Capitalize<CamelCase<P2>>}`
  : S extends `${infer P1}_${infer P2}`
    ? `${Uncapitalize<P1>}${Capitalize<CamelCase<P2>>}`
    : Uncapitalize<S>;

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type IsLetter<C extends string> =
  Lowercase<C> extends Uppercase<C> ? false : true;
type IsLower<C extends string> =
  IsLetter<C> extends true ? (C extends Lowercase<C> ? true : false) : false;
type IsUpper<C extends string> =
  IsLetter<C> extends true ? (C extends Uppercase<C> ? true : false) : false;

// Dash inserted between adjacent characters `T` then `N`. Mirrors the three
// `toKebabCase` regexes in `shared/helpers.ts` exactly:
//   ([a-z])([A-Z]) → dash   (lower→upper; NOT upper→upper, so "primaryFG" → "primary-fg")
//   (\d)([A-Z])    → dash   (digit→upper)
//   ([A-Za-z])(\d) → dash   (letter→digit; digit→digit and digit→lower get none)
type KebabBoundary<T extends string, N extends string> = N extends Digit
  ? IsLetter<T> extends true
    ? "-"
    : ""
  : IsUpper<N> extends true
    ? T extends Digit
      ? "-"
      : IsLower<T> extends true
        ? "-"
        : ""
    : "";

// Type-level twin of the runtime `toKebabCase`: "blue500" → "blue-500",
// "2xl" → "2xl", "text12Mono" → "text-12-mono", "primaryFG" → "primary-fg".
export type KebabCase<S extends string> = S extends `${infer T}${infer U}`
  ? U extends `${infer N}${string}`
    ? `${Lowercase<T>}${KebabBoundary<T, N>}${KebabCase<U>}`
    : Lowercase<S>
  : S;

// ---- Theme-based token keys ----

/**
 * Literal class-suffix keys a category falls back to when the theme omits
 * it (or declares it as an empty record): the descriptor's `defaultValues`
 * (`DefaultRoundedValue`, `DefaultBorderValue`), stringified. `never` for a
 * category without defaults.
 */
type CategoryDefaultKey<K extends CategoryKey> =
  K extends keyof typeof categoryTokenMeta
    ? `${(typeof categoryTokenMeta)[K]["defaultValues"][number]}`
    : never;

/**
 * The keys the theme declares for category `K`. A category with defaults
 * only counts when the theme type declares it as a required property (an
 * optional or missing one resolves to the defaults, as at runtime).
 */
type DeclaredCategoryKey<TTheme extends ThemeConfig, K extends CategoryKey> = [
  CategoryDefaultKey<K>,
] extends [never]
  ? Extract<keyof NonNullable<TTheme[K]>, string>
  : TTheme extends Record<K, infer R>
    ? Extract<keyof NonNullable<R>, string>
    : never;

/**
 * Un-cased token keys of category `K`: the declared keys, or the category's
 * defaults when none are declared. `keyof {}` is `never`, so an empty record
 * falls back to the defaults at the type level exactly like
 * `createDesignTokens` does at runtime. Distributes over a union theme, so
 * each member contributes its own declared keys or the defaults.
 */
type RawCategoryKey<
  TTheme extends ThemeConfig,
  K extends CategoryKey,
> = TTheme extends unknown
  ? [DeclaredCategoryKey<TTheme, K>] extends [never]
    ? CategoryDefaultKey<K>
    : DeclaredCategoryKey<TTheme, K>
  : never;

/**
 * The camelCased token-key union of one built-in category — what the
 * matching `DesignTokens.Web` array holds and the matching `DesignTokenKeys`
 * alias exposes. Normalises kebab/snake keys → `"sidebarForeground"`.
 */
export type CategoryTokenKey<
  TTheme extends ThemeConfig,
  K extends CategoryKey,
> = CamelCase<RawCategoryKey<TTheme, K>>;

// ---- Tokens từ defaults + theme ----

export type InferBorderWidthOptions<TTheme extends ThemeConfig> =
  RawCategoryKey<TTheme, "borderWidth">;

export type InferRoundedOptions<TTheme extends ThemeConfig> = RawCategoryKey<
  TTheme,
  "borderRadius"
>;

export type InferSpacingKeys = SpacingKey;

// ---- DesignTokens result types ----

/**
 * One token-key array per built-in category, named by the category key
 * (`colors`, `typography`, `borderRadius`, …) — the same names as the
 * `ThemeConfig` fields.
 */
type CategoryTokenArrays<TTheme extends ThemeConfig> = {
  [C in BuiltInCategory as C["key"]]: CategoryTokenKey<TTheme, C["key"]>[];
};

export interface DesignTokensWeb<
  TTheme extends ThemeConfig,
> extends CategoryTokenArrays<TTheme> {
  spacingProperties: InferSpacingKeys[];
  breakpoints: string[];
  screens: Record<string, string>;
}

export interface DesignTokensResult<TTheme extends ThemeConfig> {
  DesignTokens: {
    Web: DesignTokensWeb<TTheme>;
  };
}
