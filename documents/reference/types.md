# Types (./types)

Type-only exports; importing this subpath adds no runtime code.

## `ThemeConfig`, `ThemeOverride`, `TypographyConfig`

<!-- signature: ThemeConfig -->

```ts
export declare type ThemeConfig = z.infer<typeof ThemeSchema>;
```

Theme configuration; only `colors` is required.

<!-- /signature -->

<!-- signature: ThemeOverride -->

```ts
export declare type ThemeOverride = z.infer<typeof ThemeOverrideSchema>;
```

One `themeAxes` variant override.

<!-- /signature -->

<!-- signature: TypographyConfig -->

```ts
export declare type TypographyConfig = z.infer<typeof TypographyStyleSchema>;
```

A single typography variant.

<!-- /signature -->

The theme shape inferred from the Zod schema; only `colors` is required.

## `StyleGeneratorOptions`, `ExactOptions`, `CoverageRule`

<!-- signature: StyleGeneratorOptions -->

```ts
export declare interface StyleGeneratorOptions {
  breakpoints?: readonly (Breakpoint | (string & {}))[];
  screens?: Record<string, string>;
  enableResponsive?: boolean;
  typography?: {
    cssVarDriven?: boolean;
  };
  spacing?: {
    enabled?: boolean;
    properties?: SpacingPropertyMap;
  };
  coverage?: {
    [K in CategoryKey]?: boolean | CategoryCoverageRule<K>;
  };
  resetTailwindDefaults?: readonly ("colors" | "radius" | "shadow")[];
}
```

Options of `generate()` and `createDesignTokens()`; `defineOptions`, `style-gen.config.json` and the Vite/Next plugins take the same shape. Unknown keys are rejected.

<!-- /signature -->

<!-- signature: ExactOptions -->

```ts
export declare type ExactOptions<O> = O &
  Readonly<Record<Exclude<keyof O, keyof StyleGeneratorOptions>, never>>;
```

`O` with `never` for unknown keys: restores the excess-property check a `const O` parameter skips.

<!-- /signature -->

<!-- signature: CoverageRule -->

```ts
export declare interface CoverageRule<P extends string = RegistryPrefix> {
  prefixes?: readonly [P, ...P[]];
  keys?: "aliased" | "all";
}
```

How much of one token category's `@source inline` coverage to emit; it
never changes the `@theme inline` mapping or the `@utility` blocks.

<!-- /signature -->

The options of `generate()`, the helper that rejects misspelled option keys, and the per-category `coverage` rule.

## Semantic aliases: `ColorVariant`, `TextVariant`, `ShadowVariant`, `BackdropBlurVariant`, `RoundedVariant`, `BorderWidthVariant`, `FontFamilyVariant`

<!-- signature: ColorVariant -->

```ts
export declare type ColorVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["colorKey"];
```

Color variant union derived from theme.colors keys (camelCased).

<!-- /signature -->

<!-- signature: TextVariant -->

```ts
export declare type TextVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["textKey"];
```

Typography variant union derived from theme.typography keys.

<!-- /signature -->

<!-- signature: ShadowVariant -->

```ts
export declare type ShadowVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["shadowKey"];
```

Shadow variant union derived from theme.shadows keys.

<!-- /signature -->

<!-- signature: BackdropBlurVariant -->

```ts
export declare type BackdropBlurVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["backdropBlurKey"];
```

Backdrop-blur variant union derived from theme.backdropBlurs keys.

<!-- /signature -->

<!-- signature: RoundedVariant -->

```ts
export declare type RoundedVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["roundedKey"];
```

Rounded variant union derived from theme.borderRadius keys (falls back to defaults).

<!-- /signature -->

<!-- signature: BorderWidthVariant -->

```ts
export declare type BorderWidthVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["borderWidthKey"];
```

Border-width variant union derived from theme.borderWidth keys (falls back to defaults).

<!-- /signature -->

<!-- signature: FontFamilyVariant -->

```ts
export declare type FontFamilyVariant<T extends ThemeConfig> =
  DesignTokenKeys<T>["fontFamilyKey"];
```

Font-family variant union derived from theme.fontFamily keys.

<!-- /signature -->

Key unions derived from a theme, one per category.

Skip the `(typeof DesignTokens.Web.X)[number]` boilerplate:

```ts
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";
import themeJson from "./theme.json";

type Theme = typeof themeJson;

interface BoxProps {
  backgroundColor?: ColorVariant<Theme>;
}
interface TextProps {
  type?: TextVariant<Theme>;
  color?: ColorVariant<Theme>;
}
```

Aliases: `ColorVariant`, `TextVariant`, `ShadowVariant`, `BackdropBlurVariant`, `FontFamilyVariant`, `BorderWidthVariant`, `RoundedVariant`, plus the mapped type `DesignTokenKeys<T>`.

Theme axes: `ThemeAxisName<T>` (`"theme" | "palette"`), `ThemeAxisVariant<T, A>` (`"dark" | "light"`) and `ThemeAxesState<T>` (every axis optional, each `"base"` or a declared variant) type the `data-<axis>` attributes you set at runtime. Their keys and values are the raw theme keys, while the generated attribute and selector are kebab-cased: the variant `high-contrast` of the axis `colorMode` is `html[data-color-mode="high-contrast"]`, so map the state to `toKebabCase(axis)` / `toKebabCase(variant)` when you set it. `BreakpointKeys<O>` and `SpacingKeys<O>` give the literal keys of an options object, e.g. for `ResponsiveValueStrict<number, BreakpointKeys<typeof options>>`.

## `ThemeAxesState`, `ThemeAxisName`, `ThemeAxisVariant`

<!-- signature: ThemeAxesState -->

```ts
export declare type ThemeAxesState<T extends ThemeConfig> = {
  readonly [A in ThemeAxisName<T>]?: ThemeAxisVariant<T, A> | "base";
};
```

The active variant per axis, or the reserved `"base"` for no override.

<!-- /signature -->

<!-- signature: ThemeAxisName -->

```ts
export declare type ThemeAxisName<T extends ThemeConfig> = T extends unknown
  ? Extract<keyof NonNullable<T["themeAxes"]>, string>
  : never;
```

Axis names of `theme.themeAxes`; `never` without it.

<!-- /signature -->

<!-- signature: ThemeAxisVariant -->

```ts
export declare type ThemeAxisVariant<
  T extends ThemeConfig,
  A extends ThemeAxisName<T>,
> = T extends unknown
  ? A extends keyof NonNullable<T["themeAxes"]>
    ? Extract<keyof NonNullable<T["themeAxes"]>[A], string>
    : never
  : never;
```

Variant names of one `themeAxes` axis.

<!-- /signature -->

The active variant per `themeAxes` axis, and the axis and variant name unions.

## Breakpoints: `BreakpointKeys`, `DefaultBreakpointKeys`, `ScreenKeys`, `ResponsiveValueStrict`

<!-- signature: BreakpointKeys -->

```ts
export declare type BreakpointKeys<O> = O extends {
  readonly breakpoints: readonly (infer B extends string)[];
}
  ? B
  : "breakpoints" extends keyof O
    ? string
    : DefaultBreakpointKeys;
```

`options.breakpoints` keys: literal, `string` when only optional, else the defaults.

<!-- /signature -->

<!-- signature: DefaultBreakpointKeys -->

```ts
export declare type DefaultBreakpointKeys =
  (typeof DEFAULT_BREAKPOINTS)[number];
```

Breakpoint keys the spacing CSS covers by default (`md`/`lg`).

<!-- /signature -->

<!-- signature: ScreenKeys -->

```ts
export declare type ScreenKeys<O> = O extends {
  readonly screens: infer S;
}
  ? `${Extract<keyof S, string | number>}`
  : "screens" extends keyof O
    ? string
    : never;
```

The custom screen keys `options.screens` adds to the default screens.

<!-- /signature -->

<!-- signature: ResponsiveValueStrict -->

```ts
export declare type ResponsiveValueStrict<
  T,
  BKeys extends string = DefaultBreakpointKeys,
> = T | Partial<Record<BKeys | "base", T | undefined>>;
```

A plain value or a per-breakpoint object (`{ base: 4, md: 8 }`). `base` is
always accepted; any other key must be in `BKeys`, so a typo is a type error.

<!-- /signature -->

The breakpoint keys `options.breakpoints` names, the default pair, the custom screen keys, and the responsive value type.

```ts
import type { ResponsiveValueStrict } from "@duydpdev/style-generator/types";

// "base" is always allowed; every other key must be declared in `options.breakpoints`
// and exist in `screens` (or `defaultScreens`), or it has no CSS behind it.
type AppBreakpoints = "mobile" | "tablet" | "laptop" | "desktop";
export type ResponsiveValue<T> = ResponsiveValueStrict<T, AppBreakpoints>;
```

## Opacity steps: `OpacitySteps`

<!-- signature: OpacitySteps -->

```ts
export declare type OpacitySteps<O> = O extends {
  readonly coverage?: infer V;
}
  ? V extends {
      readonly colors?: infer C;
    }
    ? OpacityStepsOf<NonNullable<C>>
    : never
  : never;
```

Plain `coverage.colors.opacities` steps: literal, `number` when only optional, else `never`.

<!-- /signature -->

## `SpacingKey`, `SpacingKeys`, `SpacingPropertyMap`, `InferSpacingKeys`

<!-- signature: SpacingKey -->

```ts
export declare type SpacingKey = keyof typeof DEFAULT_SPACING_PROPERTIES;
```

Literal union of the default spacing keys (`"p" | "px" | … | "left"`), the spacing-key type used repo-wide.

<!-- /signature -->

<!-- signature: SpacingKeys -->

```ts
export declare type SpacingKeys<O> = O extends {
  readonly spacing: {
    readonly properties: infer P;
  };
}
  ? `${Extract<keyof P, string | number>}`
  : O extends {
        readonly spacing?: infer S;
      }
    ? "properties" extends keyof NonNullable<S>
      ? string
      : SpacingKey
    : SpacingKey;
```

`options.spacing.properties` keys: literal, `string` when only optional, else `SpacingKey`.

<!-- /signature -->

<!-- signature: SpacingPropertyMap -->

```ts
export declare type SpacingPropertyMap = Readonly<
  Record<string, readonly string[]>
>;
```

Spacing key → the CSS properties its `sp-<key>` utility sets (`p: ["padding"]`).

<!-- /signature -->

<!-- signature: InferSpacingKeys -->

```ts
export declare type InferSpacingKeys = SpacingKey;
```

Alias of `SpacingKey`: every default spacing property key (`"p"`, `"px"`, …).

<!-- /signature -->

The default spacing key union, the keys `options.spacing.properties` names, and the property map type.

## `DesignTokensResult`, `DesignTokensWeb`, `DesignTokenKeys`, `CategoryKey`, `CategoryTokenKey`

<!-- signature: DesignTokensResult -->

```ts
export declare interface DesignTokensResult<
  TTheme extends ThemeConfig,
  O = Record<never, never>,
> {
  DesignTokens: {
    Web: DesignTokensWeb<TTheme, O>;
  };
}
```

Return type of `createDesignTokens(theme, options)`: the typed token arrays under `DesignTokens.Web`. `generate()` returns the same `DesignTokens` object as `tokens`.

<!-- /signature -->

<!-- signature: DesignTokensWeb -->

```ts
export declare interface DesignTokensWeb<
  TTheme extends ThemeConfig,
  O = Record<never, never>,
> extends CategoryTokenArrays<TTheme> {
  readonly spacingProperties: readonly SpacingKeys<O>[];
  readonly breakpoints: readonly BreakpointKeys<O>[];
  readonly screens: Readonly<Record<Breakpoint | ScreenKeys<O>, string>>;
  readonly aliasedColors: readonly AliasedColorKey<TTheme>[];
  readonly opacities: readonly OpacitySteps<O>[];
}
```

The typed token arrays for theme `TTheme` built with options `O`.

<!-- /signature -->

<!-- signature: DesignTokenKeys -->

```ts
export declare interface DesignTokenKeys<
  T extends ThemeConfig,
> extends CategoryTokenKeyMap<T> {}
```

The token key unions of a theme, one per category (`colorKey`, `textKey`, …);
an interface so consumers can augment it.

<!-- /signature -->

<!-- signature: CategoryKey -->

```ts
export declare type CategoryKey = BuiltInCategory["key"];
```

Every built-in category key — the `ThemeConfig` field of each descriptor.

<!-- /signature -->

<!-- signature: CategoryTokenKey -->

```ts
export declare type CategoryTokenKey<
  TTheme extends ThemeConfig,
  K extends CategoryKey,
> =
  RawCategoryKey<TTheme, K> extends infer R extends string
    ? [string] extends [R]
      ? string
      : CamelCase<R>
    : never;
```

The camelCased token-key union of one category; a `string` key set stays `string`.

<!-- /signature -->

The typed token arrays under `DesignTokens.Web`, the derived key unions, and the category key unions.

## `DefaultBorderValue`, `DefaultRoundedValue`, `InferBorderWidthOptions`, `InferRoundedOptions`

<!-- signature: DefaultBorderValue -->

```ts
export declare type DefaultBorderValue = (typeof DEFAULT_BORDER_VALUES)[number];
```

One of `DEFAULT_BORDER_VALUES` (`0 | 1 | 2 | 4`), the widths used when `theme.borderWidth` is omitted.

<!-- /signature -->

<!-- signature: DefaultRoundedValue -->

```ts
export declare type DefaultRoundedValue =
  (typeof DEFAULT_ROUNDED_VALUES)[number];
```

One of `DEFAULT_ROUNDED_VALUES`, the radius keys used when `theme.borderRadius` is omitted.

<!-- /signature -->

<!-- signature: InferBorderWidthOptions -->

```ts
export declare type InferBorderWidthOptions<TTheme extends ThemeConfig> =
  RawCategoryKey<TTheme, "borderWidth">;
```

The `borderWidth` keys as written, or the defaults.

<!-- /signature -->

<!-- signature: InferRoundedOptions -->

```ts
export declare type InferRoundedOptions<TTheme extends ThemeConfig> =
  RawCategoryKey<TTheme, "borderRadius">;
```

The `borderRadius` keys as written, or the defaults.

<!-- /signature -->

The default border and radius keys, and the key types read from a theme.

## `CamelCase`, `KebabCase`

<!-- signature: CamelCase -->

```ts
export declare type CamelCase<S extends string> =
  S extends `${infer P1}-${infer P2}`
    ? `${Uncapitalize<P1>}${Capitalize<CamelCase<P2>>}`
    : S extends `${infer P1}_${infer P2}`
      ? `${Uncapitalize<P1>}${Capitalize<CamelCase<P2>>}`
      : Uncapitalize<S>;
```

Type-level camelCase of a kebab- or snake-case string: `"blue-500"` → `"blue500"`, `"text_sm"` → `"textSm"`.

<!-- /signature -->

<!-- signature: KebabCase -->

```ts
export declare type KebabCase<S extends string> =
  S extends `${infer T}${infer U}`
    ? U extends `${infer N}${string}`
      ? `${Lowercase<T>}${KebabBoundary<T, N>}${KebabCase<U>}`
      : Lowercase<S>
    : S;
```

Type-level twin of the runtime `toKebabCase`: `"blue500"` → `"blue-500"`, `"2xl"` → `"2xl"`, `"text12Mono"` → `"text-12-mono"`, `"primaryFG"` → `"primary-fg"`.

<!-- /signature -->

Type-level twins of the runtime key conversions.
