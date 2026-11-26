<!-- source: documents/reference/types.md sha256: bcc9ce709602 -->

# Kiểu (./types)

Các export chỉ chứa type (type-only); việc import subpath này không thêm bất kỳ code runtime nào.

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

Cấu trúc của theme được suy luận từ Zod schema; chỉ `colors` là bắt buộc.

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

Các tùy chọn của `generate()`, helper từ chối các key tùy chọn viết sai chính tả, và quy tắc `coverage` theo từng nhóm token.

## Alias ngữ nghĩa: `ColorVariant`, `TextVariant`, `ShadowVariant`, `BackdropBlurVariant`, `RoundedVariant`, `BorderWidthVariant`, `FontFamilyVariant`

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

Các union key được rút ra từ một theme, mỗi nhóm token một union.

Bỏ qua đoạn boilerplate `(typeof DesignTokens.Web.X)[number]`:

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

Các alias: `ColorVariant`, `TextVariant`, `ShadowVariant`, `BackdropBlurVariant`, `FontFamilyVariant`, `BorderWidthVariant`, `RoundedVariant`, cùng với mapped type `DesignTokenKeys<T>`.

Các trục theme: `ThemeAxisName<T>` (`"theme" | "palette"`), `ThemeAxisVariant<T, A>` (`"dark" | "light"`) và `ThemeAxesState<T>` (mỗi trục đều là tùy chọn, mỗi trục nhận `"base"` hoặc một variant đã khai báo) định kiểu cho các thuộc tính `data-<axis>` mà bạn thiết lập ở runtime. Các key và giá trị của chúng là các key theme thô, trong khi thuộc tính và selector được sinh ra lại ở dạng kebab-case: variant `high-contrast` của trục `colorMode` là `html[data-color-mode="high-contrast"]`, do đó hãy map state sang `toKebabCase(axis)` / `toKebabCase(variant)` khi bạn thiết lập nó. `BreakpointKeys<O>` và `SpacingKeys<O>` cung cấp các key dạng literal của một đối tượng options, ví dụ cho `ResponsiveValueStrict<number, BreakpointKeys<typeof options>>`.

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

Variant đang hoạt động theo từng trục `themeAxes`, cùng các union tên trục và tên variant.

## Breakpoint: `BreakpointKeys`, `DefaultBreakpointKeys`, `ScreenKeys`, `ResponsiveValueStrict`

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

Breakpoint keys the spacing CSS covers by default (`DEFAULT_BREAKPOINTS`,
`md`/`lg`). A project that sets `options.breakpoints` passes its own keys
as `BKeys`, e.g. `ResponsiveValueStrict<number, "sm" | "md" | "xl">`.

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

Responsive value type: simple value or per-breakpoint object.
The generic `BKeys` lets a project customize the breakpoints when wrapping the type.
`base` is always available by default, independent of `BKeys`. A typo in a
breakpoint key is a type error — there is no `(string & {})` fallback.

<!-- /signature -->

Các key breakpoint mà `options.breakpoints` đặt tên, cặp mặc định, các key screen tùy biến, và kiểu giá trị responsive.

```ts
import type { ResponsiveValueStrict } from "@duydpdev/style-generator/types";

// "base" is always allowed; every other key must be declared in `options.breakpoints`
// and exist in `screens` (or `defaultScreens`), or it has no CSS behind it.
type AppBreakpoints = "mobile" | "tablet" | "laptop" | "desktop";
export type ResponsiveValue<T> = ResponsiveValueStrict<T, AppBreakpoints>;
```

## Bước độ mờ: `OpacitySteps`

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

Union key spacing mặc định, các key mà `options.spacing.properties` đặt tên, và kiểu map thuộc tính.

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

Các mảng token có kiểu dưới `DesignTokens.Web`, các union key được rút ra, và các union key của nhóm token.

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

Các key border và radius mặc định, và các kiểu key được đọc từ một theme.

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

Các bản sao ở cấp độ type của các hàm chuyển đổi key ở runtime.
