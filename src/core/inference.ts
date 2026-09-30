import type {
  DefaultBorderValue,
  DefaultRoundedValue,
  SpacingKey,
} from "../shared/defaultOption";

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

type KeysOf<T> = T extends object ? keyof T : never;

type StringKeysOf<T> = Extract<KeysOf<T>, string>;

// ---- Theme-based token keys ----

// Colors are flat keys only (e.g. "primary", "sidebar-foreground").
// CamelCase normalises kebab/snake keys → "sidebarForeground".
export type InferColorKeys<TTheme extends ThemeConfig> = CamelCase<
  Extract<keyof TTheme["colors"], string>
>;

export type InferTypographyKeys<TTheme extends ThemeConfig> = StringKeysOf<
  NonNullable<TTheme["typography"]>
>;

export type InferShadowKeys<TTheme extends ThemeConfig> = StringKeysOf<
  NonNullable<TTheme["shadows"]>
>;

export type InferBackdropBlurKeys<TTheme extends ThemeConfig> = StringKeysOf<
  NonNullable<TTheme["backDropBlurs"]>
>;

export type InferFontFamilyKeys<TTheme extends ThemeConfig> = StringKeysOf<
  NonNullable<TTheme["fontFamily"]>
>;

// ---- Tokens từ defaults + theme ----

export type InferBorderWidthOptions<TTheme extends ThemeConfig> =
  TTheme extends { borderWidth: infer B }
    ? Extract<keyof NonNullable<B>, string>
    : `${DefaultBorderValue}`;

export type InferRoundedOptions<TTheme extends ThemeConfig> = TTheme extends {
  borderRadius: infer R;
}
  ? Extract<keyof NonNullable<R>, string>
  : DefaultRoundedValue;

export type InferSpacingKeys = SpacingKey;

// ---- DesignTokens result types ----

export interface DesignTokensWeb<TTheme extends ThemeConfig> {
  variantText: CamelCase<
    Extract<keyof NonNullable<TTheme["typography"]>, string>
  >[];
  variantColor: InferColorKeys<TTheme>[];
  variantShadow: CamelCase<
    Extract<keyof NonNullable<TTheme["shadows"]>, string>
  >[];
  variantBackdropBlur: CamelCase<
    Extract<keyof NonNullable<TTheme["backDropBlurs"]>, string>
  >[];
  variantFontFamily: CamelCase<
    Extract<keyof NonNullable<TTheme["fontFamily"]>, string>
  >[];
  borderWidthOption: CamelCase<InferBorderWidthOptions<TTheme>>[];
  roundedOption: CamelCase<InferRoundedOptions<TTheme>>[];
  spacingProperties: InferSpacingKeys[];
  breakpoints: string[];
  screens: Record<string, string>;
}

export interface DesignTokensResult<TTheme extends ThemeConfig> {
  DesignTokens: {
    Web: DesignTokensWeb<TTheme>;
  };
}
