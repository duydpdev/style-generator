# UI kit (./ui)

The styleless kit for building components over your theme: recipes from plain class tables, a `cn` that knows your theme's classes, and the splitters that turn layout and spacing props into classes and inline style. It renders nothing and ships no CSS. The subpath is not re-exported from `.` and names no React type (React's `Polymorphic` lives in [`./ui-react`](./ui-react.md)), so Vue apps use it too.

`./ui` imports three packages at runtime; they are optional peer dependencies, so install them in the app that imports `./ui`:

```bash
yarn add class-variance-authority@^0.7.0 clsx@^2.1.1 tailwind-merge@^3.0.0
```

Supported ranges: `class-variance-authority` `^0.7.0`, `clsx` `^1.2.0 || ^2.0.0`, `tailwind-merge` `^3.0.0`; `./ui-react` needs `@types/react` `^18.0.0 || ^19.0.0`.

```ts
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  createCn,
  mergeStyle,
  recipeFromTables,
  splitLayout,
} from "@duydpdev/style-generator/ui";

// `tokens` = createDesignTokens(theme, options).DesignTokens.Web
import { tokens } from "./tokens";

// 1. One `cn` per theme: a later `rounded-pill` replaces `rounded-md`.
export const cn = createCn(tokens);

// 2. A recipe from plain class tables (cva underneath).
const box = recipeFromTables({
  base: "flex",
  variants: { rounded: createVariantMapper("rounded", tokens.borderRadius) },
});

// 3. Layout props → recipe classes, size style and `.sp-*` spacing; the rest passes through.
//    A numeric size becomes px (`320` → `"320px"`, `0` → `"0"`); a string is kept.
const props = {
  rounded: "pill",
  p: 4,
  width: 320,
  id: "card",
};
const split = splitLayout(
  props,
  box,
  tokens.spacingProperties,
  ["rounded"],
  ["width", "height"],
);
export const element = {
  ...split.rest,
  className: cn(split.className, "shadow-md"),
  style: mergeStyle(split.style),
};
```

The harness components in [`examples/react-v4/src/ui/`](../../examples/react-v4/src/ui/Box.tsx) and the recipe factories in [`examples/design-system`](../../examples/design-system/README.md) are built on this kit; [Components](../components.md) walks through one.

## `recipeFromTables`, `RecipeTables`, `VariantTable`, `RecipeProps`, `RecipeFn`

<!-- signature: recipeFromTables -->

```ts
export declare const recipeFromTables: (tables: RecipeTables) => RecipeFn;
```

cva over a recipe's tables. Compound and default entries are loose
records, so they are cast here once instead of in every recipe.

<!-- /signature -->

<!-- signature: RecipeTables -->

```ts
export declare interface RecipeTables {
  readonly base: ClassValue;
  readonly variants: VariantTable;
  readonly compoundVariants?:
    | readonly Readonly<Record<string, ClassValue>>[]
    | undefined;
  readonly defaultVariants?:
    | Readonly<Record<string, string | boolean | undefined>>
    | undefined;
}
```

A recipe as plain data: the cva input.

<!-- /signature -->

<!-- signature: VariantTable -->

```ts
export declare type VariantTable = Record<string, Record<string, ClassValue>>;
```

Variant name → option → classes (the `variants` of a cva config).

<!-- /signature -->

<!-- signature: RecipeProps -->

```ts
export declare type RecipeProps = Readonly<
  Record<string, string | boolean | null | undefined>
>;
```

Recipe call props: variant name → option (`true`/`false` for boolean variants).

<!-- /signature -->

<!-- signature: RecipeFn -->

```ts
export declare type RecipeFn = (props?: RecipeProps) => string;
```

A recipe built from tables: props in, one class string out; components type the exact props.

<!-- /signature -->

- A recipe is data (`base`, `variants`, optional `compoundVariants` and `defaultVariants`); `recipeFromTables` turns it into a function with `class-variance-authority`.

## `RecipeTokens`

<!-- signature: RecipeTokens -->

```ts
export declare interface RecipeTokens {
  readonly colors: readonly string[];
  readonly typography: readonly string[];
  readonly shadows: readonly string[];
  readonly backDropBlurs: readonly string[];
  readonly borderRadius: readonly string[];
  readonly borderWidth: readonly string[];
  readonly spacingProperties: readonly string[];
  readonly breakpoints: readonly string[];
}
```

The token arrays a recipe factory reads: a structural subset of
`DesignTokens.Web`, so `generate().tokens.Web` and
`createDesignTokens().DesignTokens.Web` are assignable to it.

<!-- /signature -->

- `generate().tokens.Web` and `createDesignTokens().DesignTokens.Web` are assignable to it.

## `pick`, `contrastText`

<!-- signature: pick -->

```ts
export declare const pick: (map: object, key: string) => string;
```

`map[key]`, or a thrown error naming the missing token, so a renamed
theme token fails loudly instead of rendering no class.

<!-- /signature -->

<!-- signature: contrastText -->

```ts
export declare const contrastText: (
  colors: readonly string[],
  intent: string,
  fallback: string,
) => string;
```

`text-on-<intent>` when the theme declares the `on<Intent>` sibling
color, else `text-<fallback>`.

<!-- /signature -->

- `pick` throws, naming the token, instead of returning `undefined`, so a renamed theme token fails at the first render.

## `createCn`, `Cn`

<!-- signature: createCn -->

```ts
export declare const createCn: (tokens: TailwindMergeTokens) => Cn;
```

One `cn` per theme. `clsx` joins the inputs; a `tailwind-merge`
extended with `createTailwindMergeExtension(tokens)` then keeps the
last class of each group, including the theme's own classes
(`text-16-medium`, `shadow-md`, `rounded-pill`, `border-thin`), which
the default `tailwind-merge` does not know.

<!-- /signature -->

<!-- signature: Cn -->

```ts
export declare type Cn = (...inputs: ClassValue[]) => string;
```

clsx + a tailwind-merge that knows one theme's custom utilities.

<!-- /signature -->

- `createCn(tokens)` = `clsx` + `tailwind-merge` extended with [`createTailwindMergeExtension`](./recipes.md#createtailwindmergeextension-tailwindmergeextension-tailwindmergetokens).

## `splitSpacing`, `splitLayout`, `Split`

<!-- signature: splitSpacing -->

```ts
export declare const splitSpacing: (
  props: object,
  keys: readonly string[],
) => Split;
```

Spacing props → `.sp-*` classes + `--sg-sp-*` style (the library's
`splitSpacingProps`); the rest passes through.

<!-- /signature -->

<!-- signature: splitLayout -->

```ts
export declare const splitLayout: (
  props: object,
  box: RecipeFn,
  spacingKeys: readonly string[],
  variantKeys: readonly string[],
  sizeKeys: readonly string[],
  extra?: Readonly<Record<string, string | boolean>>,
) => Split;
```

Layout props → box-recipe classes, size style and spacing; the rest
passes through. A key in `variantKeys` is a recipe variant (a
non-string value becomes `undefined`); a key in `sizeKeys` is an
inline size: a string is kept, a finite number `n` becomes `"<n>px"`
(`0` becomes `"0"`), anything else is dropped. `extra` variants win
over props.

<!-- /signature -->

<!-- signature: Split -->

```ts
export declare interface Split {
  readonly className: string;
  readonly style: StyleRecord;
  readonly variants: Readonly<Record<string, string | boolean | undefined>>;
  readonly rest: Readonly<Record<string, unknown>>;
}
```

The result of `splitSpacing`/`splitLayout`: classes, inline style, the variant props found, and the props left for the element.

<!-- /signature -->

- `splitLayout(props, box, spacingKeys, variantKeys, sizeKeys, extra)`: `variantKeys` are the prop names that are recipe variants, `sizeKeys` the prop names that are inline sizes; the component's own variants (`extra`) win over props.
- A size value is turned into a CSS length: a string is kept as is, a finite number `n` becomes `"<n>px"`, `0` becomes `"0"` (what React renders for the same numbers, so a React component's CSS does not change); any other value is dropped.

## `ThemeSpacingProps`

<!-- signature: ThemeSpacingProps -->

```ts
export declare type ThemeSpacingProps<W extends RecipeTokens> = SpacingProps<
  W["breakpoints"][number],
  W["spacingProperties"][number]
>;
```

Every `tokens.spacingProperties` key, camelCased: a number or
`{ base, <bp> }` over `tokens.breakpoints`.

<!-- /signature -->

- Narrows every spacing prop to your theme's `spacingProperties` and `breakpoints`, so a renamed token is a type error at the call site. Layout props such as `rounded` or `backgroundColor` are typed by the app (the harness declares its own `LayoutProps`), because the kit knows no recipe.

## `mergeStyle`, `StyleRecord`

<!-- signature: mergeStyle -->

```ts
export declare const mergeStyle: <S extends object = StyleRecord>(
  ...parts: readonly (S | StyleRecord | undefined)[]
) => S | undefined;
```

The parts merged left to right; `undefined` when empty, so React
renders no `style=""`.

<!-- /signature -->

<!-- signature: StyleRecord -->

```ts
export declare type StyleRecord = Readonly<Record<string, string | number>>;
```

An inline style object: property (or `--custom-property`) → value. React accepts it as `style`.

<!-- /signature -->

- `mergeStyle` returns `undefined` for an empty result, so React renders no `style=""`. Its type parameter is the caller's style type: with a `CSSProperties` part it returns `CSSProperties`, with `StyleRecord` parts it returns `StyleRecord`.
