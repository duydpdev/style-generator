import type {
  BuiltInCategory,
  CategoryKey,
} from "../features/registry/builtInCategories";
import type { categoryTokenMeta } from "../features/registry/categoryTokenMeta";
import type { DefaultBreakpointKeys } from "../features/spacing/spacingHelpers";
import type { SpacingKey } from "../shared/defaultOption";

import type { Breakpoint } from "./Options";
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
 * The keys the theme declares for category `K`. For a category with
 * defaults the property's optionality decides: a required property yields
 * its declared keys; an optional one (e.g. a `ThemeConfig`-annotated theme
 * whose `borderRadius?` a `JSON.parse` may or may not fill) yields `string`,
 * because either the declared keys or the defaults may apply at runtime; an
 * absent one yields `never`, so the caller falls back to the defaults.
 */
type DeclaredCategoryKey<TTheme extends ThemeConfig, K extends CategoryKey> = [
  CategoryDefaultKey<K>,
] extends [never]
  ? `${Extract<keyof NonNullable<TTheme[K]>, string | number>}`
  : TTheme extends Record<K, infer R>
    ? `${Extract<keyof NonNullable<R>, string | number>}`
    : K extends keyof TTheme
      ? string
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
 * alias exposes. Normalises kebab/snake keys → `"sidebarForeground"`. A
 * `string` key set (an annotated `ThemeConfig`) stays `string`: `CamelCase`
 * would turn it into the distinct `Uncapitalize<string>`.
 */
export type CategoryTokenKey<
  TTheme extends ThemeConfig,
  K extends CategoryKey,
> =
  RawCategoryKey<TTheme, K> extends infer R extends string
    ? [string] extends [R]
      ? string
      : CamelCase<R>
    : never;

// ---- Tokens from defaults + theme ----

export type InferBorderWidthOptions<TTheme extends ThemeConfig> =
  RawCategoryKey<TTheme, "borderWidth">;

export type InferRoundedOptions<TTheme extends ThemeConfig> = RawCategoryKey<
  TTheme,
  "borderRadius"
>;

export type InferSpacingKeys = SpacingKey;

// ---- Options-derived key types ----

/**
 * The breakpoint keys `options.breakpoints` names. Literal when `O` carries a
 * literal list (`defineOptions`/`generate` infer `const O`); `string` when
 * `O` only declares the field optionally (an annotated
 * `StyleGeneratorOptions`); the library default (`md`/`lg`) when it is
 * absent.
 */
export type BreakpointKeys<O> = O extends {
  readonly breakpoints: readonly (infer B extends string)[];
}
  ? B
  : "breakpoints" extends keyof O
    ? string
    : DefaultBreakpointKeys;

/**
 * The spacing keys `options.spacing.properties` names; `string` when `O`
 * only declares them optionally, the default `SpacingKey` union when absent.
 */
export type SpacingKeys<O> = O extends {
  readonly spacing: { readonly properties: infer P };
}
  ? `${Extract<keyof P, string | number>}`
  : O extends { readonly spacing?: infer S }
    ? "properties" extends keyof NonNullable<S>
      ? string
      : SpacingKey
    : SpacingKey;

/** The custom screen keys `options.screens` adds to the default screens. */
export type ScreenKeys<O> = O extends { readonly screens: infer S }
  ? `${Extract<keyof S, string | number>}`
  : "screens" extends keyof O
    ? string
    : never;

// ---- DesignTokens result types ----

/**
 * One readonly token-key array per built-in category, named by the category
 * key (`colors`, `typography`, `borderRadius`, …) — the same names as the
 * `ThemeConfig` fields.
 */
type CategoryTokenArrays<TTheme extends ThemeConfig> = {
  readonly [C in BuiltInCategory as C["key"]]: readonly CategoryTokenKey<
    TTheme,
    C["key"]
  >[];
};

// ---- aliased colors ----

/** Keys of record `R` whose value may be a `$alias` (a plain `string` value may). */
type AliasHolderKeys<R> = {
  [K in keyof R]: string extends R[K]
    ? `${Extract<K, string | number>}`
    : R[K] extends `$${string}`
      ? `${Extract<K, string | number>}`
      : never;
}[keyof R];

/** The `colors` records of every `themeAxes` variant override of `TTheme`. */
type AxisColorRecords<TTheme extends ThemeConfig> = {
  [A in keyof NonNullable<TTheme["themeAxes"]>]: {
    [V in keyof NonNullable<TTheme["themeAxes"]>[A]]: NonNullable<
      TTheme["themeAxes"]
    >[A][V] extends { colors: infer C }
      ? C
      : never;
  }[keyof NonNullable<TTheme["themeAxes"]>[A]];
}[keyof NonNullable<TTheme["themeAxes"]>];

/**
 * The camelCased color keys that may hold a `"$<key>"` alias: in the base
 * `colors` record or in any `themeAxes` variant override (the same set
 * `coverage.keys: "aliased"` keeps). A key counts when its literal value
 * starts with `$`; a `string`-typed value (JSON import, `ThemeConfig`
 * annotation) may be an alias, so its key stays.
 */
type AliasedColorKey<TTheme extends ThemeConfig> =
  | AliasHolderKeys<TTheme["colors"]>
  | (AxisColorRecords<TTheme> extends infer C
      ? C extends unknown
        ? AliasHolderKeys<C>
        : never
      : never) extends infer K extends string
  ? [string] extends [K]
    ? string
    : CamelCase<K>
  : never;

/**
 * The typed token arrays. `O` is the options type the tokens were built
 * with (`generate`/`createDesignTokens` infer it from their `options`
 * argument); omitted, it is the no-options default.
 */
export interface DesignTokensWeb<
  TTheme extends ThemeConfig,
  O = Record<never, never>,
> extends CategoryTokenArrays<TTheme> {
  readonly spacingProperties: readonly SpacingKeys<O>[];
  readonly breakpoints: readonly BreakpointKeys<O>[];
  /** The library `defaultScreens` plus the keys `options.screens` adds. */
  readonly screens: Readonly<Record<Breakpoint | ScreenKeys<O>, string>>;
  /**
   * Color keys (camelCased) whose value is a `$<key>` alias in the base
   * record or in any `themeAxes` override, in declaration order. Runtime
   * holds exactly those; the type keeps every key that may be one.
   */
  readonly aliasedColors: readonly AliasedColorKey<TTheme>[];
}

export interface DesignTokensResult<
  TTheme extends ThemeConfig,
  O = Record<never, never>,
> {
  DesignTokens: {
    Web: DesignTokensWeb<TTheme, O>;
  };
}
