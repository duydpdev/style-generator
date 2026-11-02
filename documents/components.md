# Components: examples, not an API

The six components on this page (`Box`, `Text`, `Stack`, `Flex`, `Grid` and `Button`) are sample code inside the example apps, not a package: nothing is published and nothing is versioned. Copy the files you need into your app and change them freely. The React versions are self-contained `*.tsx` files in [`examples/react-v4/src/ui/`](../examples/react-v4/src/ui/index.ts); the landing site imports the same files through `react-v4-example/ui` and binds them to its own theme. The Vue versions are single-file components with `<script setup lang="ts">` in [`examples/nuxt-v4/app/ui/`](../examples/nuxt-v4/app/ui/Button.vue). Both wrap the headless recipes of [`examples/design-system`](../examples/design-system/README.md), so renaming a theme token fails to compile in the recipe instead of failing at runtime.

Until commit `2045cce`, Dialog, Select, List, ListItem, Card, Badge, Code, Container, Input and Link lived in `packages/ui-react` and `packages/ui-vue` behind one `createUi(tokens, presets)` call; `git show 2045cce:packages/ui-react/src/Dialog/Dialog.tsx` recovers one as a starting point.

## Using components

In React, each file in `src/ui/` exports a factory (`createBox`, `createText`, …) that takes the app's tokens and, where the component has one, a preset. `src/ui.ts` binds them once, and app code imports the components from there:

<!-- embed: examples/react-v4/src/ui.ts -->

```ts
import {
  boxPreset,
  buttonPreset,
  textPreset,
  tokens,
} from "design-system-example";

import { createBox } from "./ui/Box";
import { createButton } from "./ui/Button";
import { createFlex } from "./ui/Flex";
import { createGrid } from "./ui/Grid";
import { createStack } from "./ui/Stack";
import { createText } from "./ui/Text";

/** The example's components, bound once to the design system's tokens and presets. */
export const Box = createBox(tokens, boxPreset);
export const Button = createButton(tokens, buttonPreset);
export const Flex = createFlex(tokens);
export const Grid = createGrid(tokens);
export const Stack = createStack(tokens);
export const Text = createText(tokens, textPreset);
```

In Vue there is no binding step: each SFC imports the bound recipes of `design-system-example` itself, and a page imports the file it renders explicitly (`import Button from "~/ui/Button.vue"`).

Every component accepts the spacing props of the theme (`p`, `px`, `mt`, `gapX`, …). The table lists the other props of each component; the rendered element's own attributes pass through as well.

| Component | Replaces tags                                                           | Main props                                                                                                                                                |
| --------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Box`     | `div`, `section`, `header`, `footer`, `aside`, `main`, `nav`, `article` | `backgroundColor`, `borderColor`, `border*`, `rounded*`, `shadow`, `backdropBlur`, `position`, `width`/`height` (and min/max), `innerBorder`              |
| `Text`    | `span`, `p`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`                         | `type` (a typography key), `color`, `align`, `decoration`                                                                                                 |
| `Stack`   | none                                                                    | `align`, `justify`, `wrap`, plus the `Box` layout props; vertical by default                                                                              |
| `Flex`    | none                                                                    | `direction`, `align`, `justify`, `wrap`, plus the `Box` layout props                                                                                      |
| `Grid`    | none                                                                    | `columns` (a count, a CSS track list such as `"80px 1fr 80px"`, or `{ base, md, lg }` of either), `align`, `justify`, `flow`, plus the `Box` layout props |
| `Button`  | `button`                                                                | `variant` (`fill`, `outline`, `soft`, `ghost`, `link`), `color`, `size`, `prefix`, `suffix`                                                               |

The rules for app code:

- Boolean variants are written bare: `<Flex wrap>`, not `wrap={true}`.
- Spacing props are numbers on the spacing scale or `{ base, md, lg }` objects: `<Box p={4} />`, `<Stack gap={{ base: 2, md: 4 }} />`.
- App code passes no `className` and no `style`; a variant or a token prop expresses the style instead. A value no prop can express (a computed transform or width) keeps its `style` behind `// eslint-disable-next-line no-restricted-syntax -- <reason>`.
- App code imports no recipe; recipes are used only inside the `ui/` component files.

ESLint enforces the last two rules and bans the tags of the table above in app files, so a plain `<div>` is reported. The component names and their tags come from [`examples/ui-registry.mjs`](../examples/ui-registry.mjs).

## Layout by intent

- **`Stack`** is the vertical, single-column flow: a page section, a form, a card body. Space its children with `gap`, not with a margin on each child.
- **`Flex`** is a row, or a wrapping set of two or more children. Never wrap a single child in `Flex` to align or space it: put those props on the child itself or on the parent `Stack`. One exception: a `Flex` whose second flex item is a CSS pseudo-element (a `::before`/`::after` rule line next to a label) has two flex items even though its markup shows one child; the site's `docs-onpage.tsx`, `docs-sidebar.tsx` and `sidebar-toc.tsx` labels work this way. ESLint cannot report this rule (whitespace text between JSX tags counts as a child), so review checks it.
- **`Grid`** always has `columns`: a count (`columns={3}`), a CSS track list (`columns="220px 1fr"`), or a `{ base, md, lg }` record of either (`columns={{ base: 1, md: "220px 1fr" }}`). A `Grid` without `columns` is a single-column `Stack` in disguise. ESLint reports `<Grid>` without `columns` in `examples/react-v4/src` and in the nuxt-v4 templates; the landing site is exempt, because its grids use desktop-first CSS templates under `@media (max-width: …)` that the mobile-first `columns` prop cannot express.

## Polymorphic `as`

The layout components and `Text` accept `as` to pick the root element, and the other props are then typed for that element: `<Text as="h1" type="display56Serif">` accepts the `<h1>` attributes, and `<Box as="section">` the `<section>` ones. Each React file declares its own small `Polymorphic` type; see [`examples/react-v4/src/ui/Box.tsx`](../examples/react-v4/src/ui/Box.tsx).

## Adding a component

`Text` is the worked example. A new component touches these places; skip the ones that do not apply:

1. **Recipe factory** in `examples/design-system/src/recipes/factories/<name>.ts`, exported from `factories/index.ts` (the `design-system-example/recipes` subpath).
2. **Bound recipe and preset** in `examples/design-system/src/recipes/<name>.ts`, exported from `src/index.ts`. The Vue SFC uses the bound recipe; the React app binds the factory with the preset.
3. **React component file** `examples/react-v4/src/ui/<Name>.tsx`: its own prop types and its own `Polymorphic` type, no shared type module. It splits its props with `src/ui/layout.ts`: `splitLayout` for a layout component, `splitSpacing` for any other.
4. **Export** from `examples/react-v4/src/ui/index.ts`.
5. **Binding** in `examples/react-v4/src/ui.ts`, and in `site/src/ui.ts` when the site renders it.
6. **Vue SFC** `examples/nuxt-v4/app/ui/<Name>.vue`.
7. **Registry entry** `{ name: "<Name>", tags: [...] }` in `examples/ui-registry.mjs`, with the lowercase tags it replaces (an empty list when none); ESLint builds the React and Vue rules from it.
8. **Type checks**: a few lines in `examples/react-v4/tests/ui-types.tsx` and `examples/nuxt-v4/tests/nuxt/ui-props.vue`, including one `@ts-expect-error` / `@vue-expect-error` for a wrong token.

The factory knows no theme values:

<!-- embed: examples/design-system/src/recipes/factories/text.ts -->

```ts
import { createVariantMapper } from "@duydpdev/style-generator/cva";

import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "./tables";

/** Text defaults; every field omitted → `<Text>` emits no class of its own. */
export interface TextPreset {
  readonly base?: string | undefined;
  readonly defaultType?: string | undefined;
  readonly defaultColor?: string | undefined;
}

export const textTables = (
  t: RecipeTokens,
  preset?: TextPreset,
): RecipeTables => ({
  base: preset?.base ?? "",
  variants: {
    type: createVariantMapper("", t.typography),
    decoration: {
      underline: "underline",
      lineThrough: "line-through",
      none: "no-underline",
    },
    align: {
      center: "text-center",
      left: "text-left",
      right: "text-right",
    },
    color: createVariantMapper("text", t.colors),
  },
});

/** Text recipe for one theme: `type`, `color`, `decoration`, `align`. */
export const createTextRecipe = (
  t: RecipeTokens,
  preset?: TextPreset,
): RecipeFn => recipeFromTables(textTables(t, preset));
```

The preset holds the theme's values, and the bound recipe applies the factory to the design system's tokens (`textRecipe({ type, color, decoration, align })`):

<!-- embed: examples/design-system/src/recipes/text.ts -->

```ts
import type { VariantProps } from "class-variance-authority";
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";

import { tokens, type Theme } from "../tokens";

import { createTextRecipe, type TextPreset } from "./factories/text";

export const textAlign = ["left", "center", "right"] as const;
export const textDecoration = ["underline", "lineThrough", "none"] as const;

/** Design-system text defaults; `<Text>` applies them when `type`/`color` are omitted. */
export const textPreset = {
  base: "wrap-anywhere whitespace-pre-wrap",
  defaultType: "text16Medium",
  defaultColor: "foreground",
} as const satisfies TextPreset & {
  readonly defaultType: TextVariant<Theme>;
  readonly defaultColor: ColorVariant<Theme>;
};

/** Props of the bound text recipe. */
export type TextRecipeProps = Readonly<{
  type?: TextVariant<Theme> | null | undefined;
  color?: ColorVariant<Theme> | null | undefined;
  decoration?: (typeof textDecoration)[number] | null | undefined;
  align?: (typeof textAlign)[number] | null | undefined;
}>;

/**
 * Headless text recipe: `textRecipe({ type, color, decoration, align })`.
 * `type` is a typography utility (`text-16-medium`), `color` a `text-*` color.
 */
export const textRecipe: (props?: TextRecipeProps) => string = createTextRecipe(
  tokens,
  textPreset,
);

export type TextVariants = VariantProps<typeof textRecipe>;

/** Props a framework `Text` component adds on top of the element's own props. */
export interface TextStyleProps {
  type?: TextVariant<Theme>;
  color?: ColorVariant<Theme>;
  decoration?: (typeof textDecoration)[number];
  align?: (typeof textAlign)[number];
}
```

The React file exports a factory that takes the app's tokens and the preset, so the site can bind the same file to its own theme:

<!-- embed: examples/react-v4/src/ui/Text.tsx -->

```tsx
import {
  createCn,
  createTextRecipe,
  type RecipeTokens,
  type TextPreset,
} from "design-system-example/recipes";
import type {
  ComponentPropsWithRef,
  CSSProperties,
  ElementType,
  JSX,
} from "react";

import { mergeStyle, splitSpacing, type ThemeSpacingProps } from "./layout";

/** Own props `P` win over the props of the rendered element `T`; `as` picks `T`. */
type Polymorphic<T extends ElementType, P extends object> = P & {
  readonly as?: T | undefined;
} & Omit<ComponentPropsWithRef<T>, keyof P | "as">;

type TextOwnProps<W extends RecipeTokens> = ThemeSpacingProps<W> & {
  readonly type?: W["typography"][number] | undefined;
  readonly color?: W["colors"][number] | undefined;
  readonly align?: "left" | "center" | "right" | undefined;
  readonly decoration?: "underline" | "lineThrough" | "none" | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

/** `Text`: typography/color/align/decoration from the text recipe, preset defaults, spacing props. */
export const createText = <W extends RecipeTokens>(
  tokens: W,
  preset?: TextPreset,
) => {
  const cn = createCn(tokens);
  const text = createTextRecipe(tokens, preset);
  const spacingKeys = tokens.spacingProperties;
  return function Text<T extends ElementType = "p">({
    as,
    className,
    style,
    type = preset?.defaultType,
    color = preset?.defaultColor,
    align,
    decoration,
    ...props
  }: Polymorphic<T, TextOwnProps<W>>): JSX.Element {
    const Component: ElementType = as ?? "p";
    const split = splitSpacing(props, spacingKeys);
    return (
      <Component
        {...split.rest}
        className={
          cn(
            text({ type, color, align, decoration }),
            split.className,
            className,
          ) || undefined
        }
        style={mergeStyle(split.style, style)}
      />
    );
  };
};
```

The Vue SFC imports the bound recipe from `design-system-example` and declares its props with `defineProps`:

<!-- embed: examples/nuxt-v4/app/ui/Text.vue -->

```vue
<script setup lang="ts">
import {
  cn,
  splitSpacingProps,
  textPreset,
  textRecipe,
  tokens,
} from "design-system-example";
import type { BoxSpacingProps, TextStyleProps } from "design-system-example";
import { useAttrs } from "vue";

/**
 * Text: typography, color, alignment and decoration from the theme. `type`
 * and `color` default to the design-system text preset. Spacing props work
 * as in Box (declared with `@vue-ignore`, read from the attributes).
 */
export interface TextProps
  extends /* @vue-ignore */ BoxSpacingProps, TextStyleProps {
  as?: string;
}

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<TextProps>(), {
  as: "p",
  type: textPreset.defaultType,
  color: textPreset.defaultColor,
});
defineSlots<{ default?: () => unknown }>();
const attrs = useAttrs();

// Root attributes: the caller's other attributes, then class and style.
const root = () => {
  const { spacing, rest } = splitSpacingProps(
    attrs as BoxSpacingProps & Record<string, unknown>,
    tokens.spacingProperties,
  );
  return {
    ...rest,
    class: cn(textRecipe(props), spacing.className),
    ...(spacing.className === "" ? {} : { style: spacing.style }),
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()"><slot /></component>
</template>
```

## Checks

The examples have no test runner. Their checks are compile-time and lint-time, and all of them read the library's built `dist/`, so run `yarn build:all` first:

- `yarn workspace react-v4-example typecheck` compiles `src/ui/*.tsx` and `tests/ui-types.tsx`, whose `@ts-expect-error` lines must each be consumed by a real type error.
- `yarn workspace nuxt-v4-example typecheck` (`nuxt typecheck`) compiles `app/ui/*.vue` and `tests/nuxt/ui-props.vue` the same way, with `@vue-expect-error`.
- `yarn lint` applies the registry rules (banned tags, no `className`/`style`, `Grid` needs `columns`).
- `yarn workspace site build` (which builds `react-v4`) and `yarn workspace nuxt-v4-example build` prove the apps render.

## Recipes without components

Use `@duydpdev/style-generator/recipes` directly when your framework has no sample component, or for one-off markup: the helpers are browser-safe and framework-free. See [Recipes](./reference/recipes.md) and [CVA helpers](./reference/cva.md).
