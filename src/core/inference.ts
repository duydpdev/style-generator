import type {
  DefaultBorderValue,
  DefaultRoundedValue,
  DefaultSpacingKey,
  DefaultZIndexValue,
} from "../shared/defaultOption";

import type { StyleModule } from "./Options";
import type { ThemeConfig } from "./ThemeConfig";

// ---- Basic utilities ----

export type CamelCase<S extends string> = S extends `${infer P1}-${infer P2}`
  ? `${Uncapitalize<P1>}${Capitalize<CamelCase<P2>>}`
  : S extends `${infer P1}_${infer P2}`
    ? `${Uncapitalize<P1>}${Capitalize<CamelCase<P2>>}`
    : Uncapitalize<S>;

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

// Converts camelCase to kebab-case.
// Adds a dash at uppercase-letter boundaries AND at letter→digit transitions
// so that e.g. "blue500" → "blue-500" and "2xl" → "2xl" (digit-prefix untouched).
export type KebabCase<S extends string> = S extends `${infer T}${infer U}`
  ? U extends `${Digit}${string}`
    ? T extends Digit
      ? `${T}${KebabCase<U>}` // digit→digit: no dash (e.g. "500" stays "500")
      : `${Uncapitalize<T>}-${KebabCase<U>}` // letter→digit: add dash (e.g. "blue5" → "blue-5")
    : U extends Uncapitalize<U>
      ? `${Uncapitalize<T>}${KebabCase<U>}` // same case: no dash
      : `${Uncapitalize<T>}-${KebabCase<U>}` // camelCase boundary: add dash
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
  TTheme["typography"]
>;

export type InferShadowKeys<TTheme extends ThemeConfig> = StringKeysOf<
  NonNullable<TTheme["shadows"]>
>;

export type InferBackdropBlurKeys<TTheme extends ThemeConfig> = StringKeysOf<
  NonNullable<TTheme["backDropBlurs"]>
>;

// ---- Tokens từ defaults + theme ----

export type InferBorderOptions<TTheme extends ThemeConfig> = TTheme extends {
  border: infer B;
}
  ? Extract<keyof NonNullable<B>, string>
  : `${DefaultBorderValue}`;

export type InferRoundedOptions<TTheme extends ThemeConfig> = TTheme extends {
  borderRadius: infer R;
}
  ? Extract<keyof NonNullable<R>, string>
  : DefaultRoundedValue;

export type InferZIndexOptions<TTheme extends ThemeConfig> = TTheme extends {
  zIndex: infer Z;
}
  ? Extract<keyof NonNullable<Z>, string>
  : `${DefaultZIndexValue}`;

export type InferSpacingKeys = DefaultSpacingKey;

// ---- Responsive options inference ----

type DefaultBreakpointKey = "md" | "lg";

type InferBreakpointKeys<TOptions> = TOptions extends {
  breakpoints?: (infer B)[];
}
  ? B extends string
    ? B
    : never
  : DefaultBreakpointKey;

type InferResponsiveModules<TOptions> = TOptions extends {
  responsiveModules?: (infer M)[];
}
  ? M extends StyleModule
    ? M
    : never
  : "layout" | "rounded";

type IsResponsiveEnabled<TOptions> = TOptions extends {
  enableResponsive?: false;
}
  ? false
  : true;

type ResponsivePrefixForModule<TOptions, M extends StyleModule> =
  IsResponsiveEnabled<TOptions> extends true
    ? M extends InferResponsiveModules<TOptions>
      ? `${InferBreakpointKeys<TOptions>}:`
      : never
    : never;

type WithResponsive<TOptions, M extends StyleModule, C extends string> =
  | C
  | `${ResponsivePrefixForModule<TOptions, M>}${C}`;

// ---- Safelist classes inferred from theme + options ----

type ColorClasses<TTheme extends ThemeConfig> =
  | `text-${KebabCase<InferColorKeys<TTheme>>}`
  | `bg-${KebabCase<InferColorKeys<TTheme>>}`
  | `border-${KebabCase<InferColorKeys<TTheme>>}`;

type TypographyClasses<TTheme extends ThemeConfig> = KebabCase<
  Extract<keyof TTheme["typography"], string>
>;

type ShadowClasses<TTheme extends ThemeConfig> =
  `shadow-${KebabCase<InferShadowKeys<TTheme>>}`;

type BackdropClasses<TTheme extends ThemeConfig> =
  `backdrop-blur-${KebabCase<InferBackdropBlurKeys<TTheme>>}`;

type ThemeDerivedClasses<TTheme extends ThemeConfig> =
  | ColorClasses<TTheme>
  | TypographyClasses<TTheme>
  | ShadowClasses<TTheme>
  | BackdropClasses<TTheme>;

type ThemeDerivedResponsiveClasses<TTheme extends ThemeConfig, TOptions> =
  | WithResponsive<TOptions, "colors", ColorClasses<TTheme>>
  | WithResponsive<TOptions, "typography", TypographyClasses<TTheme>>
  | WithResponsive<TOptions, "shadows", ShadowClasses<TTheme>>
  | WithResponsive<TOptions, "backdrop", BackdropClasses<TTheme>>;

type DynamicSafelistClass = string & { __type?: "DynamicSafelistClass" };

/**
 * Inferred safelist classes dựa trên ThemeConfig + StyleGeneratorOptions.
 * Phần bắt nguồn từ theme được typed chi tiết, phần còn lại dùng branded string
 * cho các class hoàn toàn động (dynamicClasses, layout cố định, ...).
 */
export type InferSafelistClasses<TTheme extends ThemeConfig, TOptions> =
  | ThemeDerivedClasses<TTheme>
  | ThemeDerivedResponsiveClasses<TTheme, TOptions>
  | DynamicSafelistClass;

// ---- DesignTokens result types ----

export interface DesignTokensWeb<TTheme extends ThemeConfig> {
  variantText: CamelCase<Extract<keyof TTheme["typography"], string>>[];
  variantColor: InferColorKeys<TTheme>[];
  variantShadow: CamelCase<
    Extract<keyof NonNullable<TTheme["shadows"]>, string>
  >[];
  variantBackdropBlur: CamelCase<
    Extract<keyof NonNullable<TTheme["backDropBlurs"]>, string>
  >[];
  borderOption: CamelCase<InferBorderOptions<TTheme>>[];
  roundedOption: CamelCase<InferRoundedOptions<TTheme>>[];
  zIndexOption: InferZIndexOptions<TTheme>[];
  spacingProperties: InferSpacingKeys[];
  breakpoints: string[];
  screens: Record<string, string>;
}

export interface DesignTokensResult<TTheme extends ThemeConfig> {
  DesignTokens: {
    Web: DesignTokensWeb<TTheme>;
  };
}
