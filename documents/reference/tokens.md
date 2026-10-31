# Design tokens (./tokens)

Browser-safe typed token keys built from a theme, plus the constants the generator shares with components; it does not import Zod.

## `createDesignTokens`

<!-- signature: createDesignTokens -->

```ts
export declare function createDesignTokens<const TTheme extends ThemeConfig>(
  config: TTheme,
): DesignTokensResult<TTheme>;
export declare function createDesignTokens<
  const TTheme extends ThemeConfig,
  const O extends StyleGeneratorOptions = StyleGeneratorOptions,
>(
  config: TTheme,
  options: ExactOptions<O> | undefined,
): DesignTokensResult<TTheme, O>;
```

Creates a structured design tokens object from the theme configuration.
Useful for sharing token data with consumer applications (e.g., for CVA variant maps).
With `options`, `const O` keeps literal `breakpoints`, `screens` keys and
`spacing.properties` keys in the result's types; options typed as
`StyleGeneratorOptions` — or an explicit `<typeof theme>` type argument,
which leaves `O` at its default — widen them to `string`. Without
`options` the result carries the library defaults.

<!-- /signature -->

`generate()` returns them as `tokens`, the `{ Web }` object; you can also build the same object standalone (browser-safe) with `createDesignTokens`, which returns it as `DesignTokens`:

```ts
import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import theme from "./theme.json";

const { DesignTokens } = createDesignTokens(theme, {
  breakpoints: ["md", "lg"],
});
```

**`DesignTokens.Web`:**

| Token               | Description                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `colors`            | All color keys (flat, camelCase)                                                                                                           |
| `typography`        | Keys of `typography`                                                                                                                       |
| `shadows`           | Keys of `shadows`                                                                                                                          |
| `backDropBlurs`     | Keys of `backDropBlurs`                                                                                                                    |
| `fontFamily`        | Keys of `fontFamily`                                                                                                                       |
| `borderWidth`       | Keys of `borderWidth` (falls back to `0, 1, 2, 4` when omitted or empty)                                                                   |
| `borderRadius`      | Keys of `borderRadius` (falls back to `DEFAULT_ROUNDED_VALUES` when omitted or empty)                                                      |
| `spacingProperties` | List of spacing props — the keys of `options.spacing.properties`, or the defaults                                                          |
| `breakpoints`       | Active breakpoints — defaults to `["md", "lg"]`                                                                                            |
| `screens`           | Breakpoint → width map: the default screens plus the keys of `options.screens`                                                             |
| `aliasedColors`     | The `colors` keys whose value is a `"$<key>"` alias in the base record or any `themeAxes` override (what `coverage.keys: "aliased"` keeps) |

Each array is named after its `ThemeConfig` field (`DesignTokens.Web.colors` holds the keys of `theme.colors`); `spacingProperties`, `breakpoints` and `screens` come from the options. Every array is `readonly`, and the options are inferred as literals (`generate`, `createDesignTokens` and `defineOptions` take `const O`): `createDesignTokens(theme, { breakpoints: ["md", "xl"] }).DesignTokens.Web.breakpoints` is `readonly ("md" | "xl")[]`. Options annotated as `StyleGeneratorOptions` widen those to `readonly string[]`, and so does an explicit type argument for the theme only (`createDesignTokens<typeof theme>(theme, { breakpoints: ["xl"] })`): drop the type argument to keep the literals. Without `options` the defaults apply (`readonly ("md" | "lg")[]`). `aliasedColors` is computed at runtime from the base record and every override; its type keeps each key whose value is a `$…` literal or a plain `string`. The types are `DesignTokensWeb<TTheme, O>` and `DesignTokensResult<TTheme, O>`.

**One options module.** The bundler plugin, `createDesignTokens` and the recipe types must see the same options, or the `@source inline` coverage and the token arrays drift apart. Keep them in a dependency-free module, typed with `as const satisfies` and a type-only import (`defineOptions` lives in the root entry, which pulls Zod into a browser bundle):

```ts
// style-gen.options.ts
import type { StyleGeneratorOptions } from "@duydpdev/style-generator/types";

export const options = {
  breakpoints: ["md", "lg"],
} as const satisfies StyleGeneratorOptions;
```

Import it in `vite.config.ts` / `next.config.ts` ([Vite](./vite.md), [Next](./next.md)) and in `createDesignTokens(theme, options)`; `style-gen.config.json` must repeat the same values if you also use the CLI. See [`examples/design-system`](../../examples/design-system/README.md).

## `Breakpoint`, `defaultScreens`

<!-- signature: Breakpoint -->

```ts
export declare const Breakpoint: {
  readonly SM: "sm";
  readonly MD: "md";
  readonly LG: "lg";
  readonly XL: "xl";
  readonly XXL: "2xl";
};
export declare type Breakpoint = (typeof Breakpoint)[keyof typeof Breakpoint];
```

Tailwind's default breakpoint keys. A const object (not an enum) so the
runtime values and the string-literal type are one structural thing:
`Breakpoint.MD` is `"md"`, and `const b: Breakpoint = "md"` compiles.

<!-- /signature -->

<!-- signature: defaultScreens -->

```ts
export declare const defaultScreens: Record<Breakpoint, string>;
```

Tailwind's default screen width per `Breakpoint` (`sm` 640px … `2xl` 1536px). `options.screens` is merged over it.

<!-- /signature -->

The Tailwind breakpoint keys as a const object, and their default widths (`sm` 640px … `2xl` 1536px); `options.screens` is merged over them.

## `COLOR_STATES`

<!-- signature: COLOR_STATES -->

```ts
export declare const COLOR_STATES: readonly ["hover", "active"];
```

Interactive state suffixes a flat color token can opt into by declaring a
sibling key (`primary` + `primaryHover` -> `hover:bg-primary-hover`).

Single source of truth for BOTH sides of the contract: the registry's
`colorsCategory.states` (which drives the `@source inline` state lines) and
consumers passing `{ states: COLOR_STATES }` to `createVariantMapper`.
Kept in its own dependency-free module so the browser-safe `./tokens` and
`./cva` subpaths can re-export it without pulling Zod or the registry.

<!-- /signature -->

The interactive state suffixes (`hover`, `active`) a color token can opt into; see [CVA helpers](./cva.md).

## `DEFAULT_BORDER_VALUES`, `DEFAULT_ROUNDED_VALUES`

<!-- signature: DEFAULT_BORDER_VALUES -->

```ts
export declare const DEFAULT_BORDER_VALUES: readonly [0, 1, 2, 4];
```

Default border width values, used when `theme.borderWidth` is omitted.

<!-- /signature -->

<!-- signature: DEFAULT_ROUNDED_VALUES -->

```ts
export declare const DEFAULT_ROUNDED_VALUES: readonly [
  "none",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "full",
];
```

Default border radius values, used when `theme.borderRadius` is omitted.

<!-- /signature -->

The border widths and radius keys used when the theme omits `borderWidth` or `borderRadius`.

## `borderProperties`, `roundedProperties`

<!-- signature: borderProperties -->

```ts
export declare const borderProperties: (typeof BORDER_PREFIXES)[number][];
```

Border class prefixes (`border`, `border-x` … `divide-y`) as a mutable array, typed so it passes `createVariantMapper(borderProperties, keys)` as is.

<!-- /signature -->

<!-- signature: roundedProperties -->

```ts
export declare const roundedProperties: (typeof ROUNDED_PREFIXES)[number][];
```

Mutable copies of the prefix lists, typed with the literal unions so they
pass `createVariantMapper(borderProperties, keys)` as they are.

<!-- /signature -->

The class prefixes (`border`, `border-x` … `divide-y`; `rounded`, `rounded-t` …) as mutable arrays that pass straight to `createVariantMapper`.
