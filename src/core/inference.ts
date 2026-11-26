import type {
  BuiltInCategory,
  CategoryKey,
} from "../features/registry/builtInCategories";
import type { categoryTokenMeta } from "../features/registry/categoryTokenMeta";
import type { DefaultBreakpointKeys } from "../features/spacing/spacingHelpers";
import type { SpacingKey } from "../shared/defaultOption";

import type { Breakpoint } from "./Options";
import type { ThemeConfig } from "./themeSchema";

/** Type-level camelCase of a kebab- or snake-case string: `"blue-500"` → `"blue500"`, `"text_sm"` → `"textSm"`. */
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

// Dash between `T` and `N`, mirroring `toKebabCase` in `shared/helpers.ts`:
// lower→upper, digit→upper and letter→digit only ("primaryFG" → "primary-fg").
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

/** Type-level twin of the runtime `toKebabCase`: `"blue500"` → `"blue-500"`, `"2xl"` → `"2xl"`, `"text12Mono"` → `"text-12-mono"`, `"primaryFG"` → `"primary-fg"`. */
export type KebabCase<S extends string> = S extends `${infer T}${infer U}`
  ? U extends `${infer N}${string}`
    ? `${Lowercase<T>}${KebabBoundary<T, N>}${KebabCase<U>}`
    : Lowercase<S>
  : S;

// Default keys a category falls back to when the theme omits it or leaves it empty.
type CategoryDefaultKey<K extends CategoryKey> =
  K extends keyof typeof categoryTokenMeta
    ? `${(typeof categoryTokenMeta)[K]["defaultValues"][number]}`
    : never;

// Declared keys of `K`; with defaults, an optional property widens to `string`
// and an absent one is `never`.
// Rationale: documents/architecture.md#declaredcategorykey-why-an-optional-category-widens-to-string
type DeclaredCategoryKey<TTheme extends ThemeConfig, K extends CategoryKey> = [
  CategoryDefaultKey<K>,
] extends [never]
  ? `${Extract<keyof NonNullable<TTheme[K]>, string | number>}`
  : TTheme extends Record<K, infer R>
    ? `${Extract<keyof NonNullable<R>, string | number>}`
    : K extends keyof TTheme
      ? string
      : never;

// Declared keys, else the defaults (an empty record too, like the runtime).
type RawCategoryKey<
  TTheme extends ThemeConfig,
  K extends CategoryKey,
> = TTheme extends unknown
  ? [DeclaredCategoryKey<TTheme, K>] extends [never]
    ? CategoryDefaultKey<K>
    : DeclaredCategoryKey<TTheme, K>
  : never;

/** The camelCased token-key union of one category; a `string` key set stays `string`. */
export type CategoryTokenKey<
  TTheme extends ThemeConfig,
  K extends CategoryKey,
> =
  RawCategoryKey<TTheme, K> extends infer R extends string
    ? [string] extends [R]
      ? string
      : CamelCase<R>
    : never;

/** The `borderWidth` keys as written, or the defaults. */
export type InferBorderWidthOptions<TTheme extends ThemeConfig> =
  RawCategoryKey<TTheme, "borderWidth">;

/** The `borderRadius` keys as written, or the defaults. */
export type InferRoundedOptions<TTheme extends ThemeConfig> = RawCategoryKey<
  TTheme,
  "borderRadius"
>;

/** Alias of `SpacingKey`: every default spacing property key (`"p"`, `"px"`, …). */
export type InferSpacingKeys = SpacingKey;

/** `options.breakpoints` keys: literal, `string` when only optional, else the defaults. */
export type BreakpointKeys<O> = O extends {
  readonly breakpoints: readonly (infer B extends string)[];
}
  ? B
  : "breakpoints" extends keyof O
    ? string
    : DefaultBreakpointKeys;

type OpacityStepsOf<C> = C extends {
  readonly opacities: readonly (infer E)[];
}
  ? Extract<E, number>
  : C extends object
    ? "opacities" extends keyof C
      ? number
      : never
    : never;

/** Plain `coverage.colors.opacities` steps: literal, `number` when only optional, else `never`. */
export type OpacitySteps<O> = O extends { readonly coverage?: infer V }
  ? V extends { readonly colors?: infer C }
    ? OpacityStepsOf<NonNullable<C>>
    : never
  : never;

/** `options.spacing.properties` keys: literal, `string` when only optional, else `SpacingKey`. */
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

type CategoryTokenArrays<TTheme extends ThemeConfig> = {
  readonly [C in BuiltInCategory as C["key"]]: readonly CategoryTokenKey<
    TTheme,
    C["key"]
  >[];
};

// Keys of `R` whose value may be a `$alias` (a plain `string` value may).
type AliasHolderKeys<R> = {
  [K in keyof R]: string extends R[K]
    ? `${Extract<K, string | number>}`
    : R[K] extends `$${string}`
      ? `${Extract<K, string | number>}`
      : never;
}[keyof R];

type AxisColorRecords<TTheme extends ThemeConfig> = {
  [A in keyof NonNullable<TTheme["themeAxes"]>]: {
    [V in keyof NonNullable<TTheme["themeAxes"]>[A]]: NonNullable<
      TTheme["themeAxes"]
    >[A][V] extends { colors: infer C }
      ? C
      : never;
  }[keyof NonNullable<TTheme["themeAxes"]>[A]];
}[keyof NonNullable<TTheme["themeAxes"]>];

// Color keys that may hold a `$` alias in the base or any override (the set
// `keys: "aliased"` keeps).
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

/** The typed token arrays for theme `TTheme` built with options `O`. */
export interface DesignTokensWeb<
  TTheme extends ThemeConfig,
  // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- `{}` is the "no extra options" default of the options type parameter
  O = Record<never, never>,
> extends CategoryTokenArrays<TTheme> {
  readonly spacingProperties: readonly SpacingKeys<O>[];
  readonly breakpoints: readonly BreakpointKeys<O>[];
  /** The library `defaultScreens` plus the keys `options.screens` adds. */
  readonly screens: Readonly<Record<Breakpoint | ScreenKeys<O>, string>>;
  /** Color keys holding a `$<key>` alias (base or override), in declaration order. */
  readonly aliasedColors: readonly AliasedColorKey<TTheme>[];
  /** `options.coverage.colors.opacities`, ascending; `[]` without the option. Feed it to `createVariantMapper(prefix, colors, { opacities })`. */
  readonly opacities: readonly OpacitySteps<O>[];
}

/** Return type of `createDesignTokens(theme, options)`: the typed token arrays under `DesignTokens.Web`. `generate()` returns the same `DesignTokens` object as `tokens`. */
export interface DesignTokensResult<
  TTheme extends ThemeConfig,
  // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- `{}` is the "no extra options" default of the options type parameter
  O = Record<never, never>,
> {
  DesignTokens: {
    Web: DesignTokensWeb<TTheme, O>;
  };
}
