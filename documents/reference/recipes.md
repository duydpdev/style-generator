# Recipes (./recipes)

Browser-safe component-side helpers: a `tailwind-merge` extension for your tokens, typed spacing props and the theme-axis DOM attributes. The subpath is not re-exported from `.`.

`@duydpdev/style-generator/recipes` is browser-safe and not re-exported from `.`. It imports nothing from `tailwind-merge`; use `tailwind-merge` 3.x as your app's own dependency (the extension hard-codes the v3 group ids and the `radius` theme key).

```tsx
import { extendTailwindMerge } from "tailwind-merge";
import {
  createTailwindMergeExtension,
  splitSpacingProps,
  themeAxisAttributes,
  type SpacingProps,
} from "@duydpdev/style-generator/recipes";
import type { BreakpointKeys } from "@duydpdev/style-generator/types";

// `theme` is your theme JSON, `options` the const object shared with the bundler
// plugin, `tokens` = createDesignTokens(theme, options).DesignTokens.Web
import { options } from "./style-gen.options";
import { theme, tokens } from "./tokens";

// 1. `twMerge` that knows your custom tokens (`border-thin` is a width, not a color)
export const twMerge = extendTailwindMerge(
  createTailwindMergeExtension(tokens),
);

// 2. Typed spacing props → `sp-*` class + inline `--sg-sp-*` style
type BoxProps = SpacingProps<BreakpointKeys<typeof options>> & { id?: string };
export const Box = (props: BoxProps) => {
  const { spacing, rest } = splitSpacingProps(props, tokens.spacingProperties);
  return <div {...rest} className={spacing.className} style={spacing.style} />;
};

// 3. DOM attributes of the active theme axes (pass `{ attribute }` as the second
//    argument when `options.axes.attribute` renames them)
export const Root = () => (
  <html {...themeAxisAttributes<typeof theme>({ theme: "dark" })} />
);
```

A complete, tested version (`cn`, `axisAttributes`, eight headless recipes, shared CSS) lives in [`examples/design-system`](../../examples/design-system/README.md). [Components](../components.md) shows how `ui-react` builds components on these recipes; [`guide.md`](../guide.md#build-components) walks through it step by step.

## `createTailwindMergeExtension`, `TailwindMergeExtension`, `TailwindMergeTokens`

<!-- signature: createTailwindMergeExtension -->

```ts
export declare const createTailwindMergeExtension: (
  tokens: TailwindMergeTokens,
) => TailwindMergeExtension;
```

Build the `tailwind-merge` v3 config extension for a theme's custom
tokens, so `twMerge` stops treating `border-thin` as a border colour,
`rounded-pill` / `shadow-card` as unknown classes, or `text-10-light` as a
text colour:

```ts
import { extendTailwindMerge } from "tailwind-merge";
const twMerge = extendTailwindMerge(createTailwindMergeExtension(tokens));
```

- `shadows`, `backDropBlurs` and `borderWidth` (incl. side, logical and
  `divide-*` prefixes) extend the matching `tailwind-merge` groups; the
  group ids are `tailwind-merge`'s own (`border-w`, `border-w-x`, …).
- `borderRadius` extends `tailwind-merge`'s `radius` theme scale, which
  every `rounded-*` group reads, so `rounded-pill` merges with
  `rounded-lg`, and `rounded-tl-pill`/`rounded-s-pill` with their own
  side and corner siblings.
- `typography` keys are whole class names (`text-10-light`) and form the
  group `sg-typography`. A later `sg-typography` class removes earlier
  `font-size`/`font-weight`/`leading`/`tracking` classes; a later
  single-property utility refines it (both are kept).
- `colors` and `fontFamily` are deliberately absent: the default `color`
  and `font-family` groups already accept any value.

Variants (`hover:`, `md:`) are stripped by `tailwind-merge` before group
lookup, so only bare class parts are listed. Empty token lists emit no
group.

<!-- /signature -->

<!-- signature: TailwindMergeExtension -->

```ts
export declare interface TailwindMergeExtension {
  readonly extend: {
    readonly classGroups: Readonly<
      Record<
        string,
        readonly (string | Readonly<Record<string, readonly string[]>>)[]
      >
    >;
    readonly conflictingClassGroups: Readonly<
      Record<string, readonly string[]>
    >;
    readonly theme: Readonly<Record<string, readonly string[]>>;
  };
}
```

Structural shape of a `tailwind-merge` v3 `extendTailwindMerge(...)`
argument. Declared here, not imported, so `dist/recipes.d.ts` never names
`tailwind-merge` (it is the app's dependency, not this package's).

<!-- /signature -->

<!-- signature: TailwindMergeTokens -->

```ts
export declare interface TailwindMergeTokens {
  readonly typography: readonly string[];
  readonly shadows: readonly string[];
  readonly backDropBlurs: readonly string[];
  readonly borderRadius: readonly string[];
  readonly borderWidth: readonly string[];
}
```

The slice of the design tokens the extension reads. `generate().tokens.Web`
and `createDesignTokens().DesignTokens.Web` are assignable to it; `colors`
and `fontFamily` are not needed (see {@link createTailwindMergeExtension}).

<!-- /signature -->

- `createTailwindMergeExtension` covers `typography`, `shadows`, `backDropBlurs`, `borderRadius` and `borderWidth` tokens; colors and font families already match tailwind-merge's default `color`/`font-family` groups. `borderRadius` extends tailwind-merge's `radius` theme scale, so side, logical and corner utilities (`rounded-tl-pill`, `rounded-s-pill`) merge with their `rounded-*` siblings. A later typography class removes earlier `font-size`/`font-weight`/`leading`/`tracking` classes; a later single-property utility refines it.

## `splitSpacingProps`, `SpacingProps`

<!-- signature: splitSpacingProps -->

```ts
export declare const splitSpacingProps: <
  K extends string,
  P extends object & SpacingProps<BKeys, K>,
  BKeys extends string = DefaultBreakpointKeys,
>(
  props: P,
  keys: readonly K[],
  unit?: number,
) => {
  spacing: {
    className: string;
    style: Record<string, string>;
  };
  rest: Omit<P, CamelCase<SpacingPropKeys<K>>>;
};
```

Split a component's props into its spacing props (resolved to the
`sp-*` class and inline `--sg-sp-*` style) and everything else. Every
camelCased key of `keys` is removed from `rest`, even when its value is
`undefined`, so `p={undefined}` never reaches the DOM.

`props` is checked against `SpacingProps<BKeys, K>`, so a literal such as
`{ p: "4" }` or `{ p: { tablet: 4 } }` is a type error. `BKeys` is not
inferred (it defaults to `md | lg`): props typed with
`SpacingProps<BKeys>` are accepted as they are, since extra breakpoint
keys are structurally compatible, but an object literal mixing a known
and an unknown breakpoint (`{ md: 4, tablet: 4 }`) is not caught. Pass all
three type arguments (`splitSpacingProps<K, Props, BKeys>(...)`, `BKeys`
from `BreakpointKeys<typeof options>`) to check a literal against the
configured breakpoints.

<!-- /signature -->

<!-- signature: SpacingProps -->

```ts
export declare type SpacingProps<
  BKeys extends string = DefaultBreakpointKeys,
  K extends string = SpacingKey,
> = {
  readonly [P in SpacingPropKeys<K> as CamelCase<P>]?:
    | ResponsiveValueStrict<number, BKeys>
    | undefined;
};
```

Component props for the spacing utilities: every key of `K` camelCased
(`gap-x` → `gapX`), each optional and responsive. `K` defaults to the
built-in properties; pass `tokens.spacingProperties` elements when
`options.spacing.properties` adds or removes some, and `BKeys` (e.g.
`BreakpointKeys<typeof options>`) when `options.breakpoints` adds
breakpoints. A widened `K` (`string`) means the built-in properties;
explicit literal keys give the narrowest result.

<!-- /signature -->

- `splitSpacingProps` type-checks `props` against `SpacingProps<BKeys, K>`: `{ p: "4" }` and `{ p: { tablet: 4 } }` are errors. `BKeys` defaults to `md | lg` and is not inferred; props typed with `SpacingProps<BreakpointKeys<typeof options>>` are accepted as they are, and `splitSpacingProps<K, Props, BKeys>(…)` also checks object literals against your own breakpoints. It removes every spacing key from `rest` (even an `undefined` one), so `p={undefined}` never reaches the DOM.

## `themeAxisAttributes`

<!-- signature: themeAxisAttributes -->

```ts
export declare const themeAxisAttributes: <T extends ThemeConfig>(
  state: ThemeAxesState<T>,
  options?: {
    readonly attribute?: Readonly<Record<string, string>> | undefined;
  },
) => Readonly<Record<string, string>>;
```

The DOM attributes that activate a theme's axis variants, mirroring the
`html[data-<axis>="<variant>"]` selectors `generate()` emits. Spread the
result on the element the selectors target (`<html>` by default):

```tsx
<html {...themeAxisAttributes({ theme: "dark", palette: "base" })}>
// → data-theme="dark" (palette emits nothing)
```

An axis that is `"base"` or `undefined` produces **no** attribute, so no
override block matches and the `:root` values apply. React removes a prop
that disappears between renders; an imperative caller must
`removeAttribute(...)` for an axis it omits.

<!-- /signature -->

- `themeAxisAttributes` emits no attribute for an axis that is `"base"` or `undefined`. React removes a prop that disappears between renders; an imperative caller must `removeAttribute` for an omitted axis.
