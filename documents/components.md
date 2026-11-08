# Components: examples, not an API

There are two sets. The plain examples are what you copy: one folder per component over the published `./ui` kit ([UI kit](./reference/ui.md)). The harness is the repo's own DX test and site demo.

## Plain examples (copy these)

### Where they live

`examples/plain-react` (Vite + React, Storybook, parity gate) and `examples/plain-nuxt` (Nuxt 4, Storybook). Both render the same landing page from the same ten components, and each component folder carries a story (add one with every new component, in both plain apps).

### One folder per component

```text
<app>/src/theme/theme.json        # the app's own theme (Nuxt: app/theme/theme.json)
<app>/src/options.ts              # export { options }: generator options, imports no JSON  (Nuxt: app/options.ts)
<app>/src/theme.ts                # export { theme, tokens, cn }  (Nuxt: app/theme.ts)
<app>/src/ui/<kebab-name>/        # one folder per component (Nuxt: app/ui/<kebab-name>/)
  style.ts                        # tables + recipe; imports only "../../theme" and @duydpdev/style-generator/{ui,cva,types}
  types.ts                        # exported <Name>OwnProps/<Name>Props (React: may also import "react" + "@duydpdev/style-generator/ui-react")
  <Name>.tsx | <Name>.vue         # the component
  <Name>.stories.tsx              # plain-react; <Name>.stories.ts in plain-nuxt
  index.ts                        # required in plain-react; absent in plain-nuxt
<app>/src/sections/*.tsx          # landing sections + page helpers (Section, Container, SectionHead); app code, not scanned by check:plain-ui (Nuxt: app/sections/*.vue)
```

- `theme.json` is the reduced theme token configuration.
- `options.ts` holds the literal `options` (here `coverage.colors.opacities`). It imports no JSON, so the bundler config (`vite.config.ts`, `next.config.ts`, `nuxt.config.ts`) can import it without restarting the dev server on every theme edit; `theme.ts` passes it to `createDesignTokens` and `style-gen.config.json` repeats it for the CLI (`check:plain-ui` keeps both equal).
- `theme.ts` exports `theme`, `tokens`, and `cn` for the application.
- `style.ts` is the same file in both apps; it holds the variant tables and the headless recipe.
- `types.ts` is framework-specific (not compared); the Vue `types.ts` declares the props the SFC compiler can read and extends the spacing props with `/* @vue-ignore */`.
- `<Name>.tsx` / `<Name>.vue` renders the component markup and applies the recipe and spacing utilities.
- `<Name>.stories.tsx` (`<Name>.stories.ts` in `plain-nuxt`) isolates the component for Storybook; `plain-nuxt` has hand-written Vue ports of the `plain-react` stories. Only component folders have stories: each `.storybook/main.ts` loads `ui/**` only, so sections, `App` and `ThemeSwitch` have none.
- `index.ts` re-exports the component and its types in `plain-react` (absent in `plain-nuxt`).
- `sections/*.tsx` contains the application landing sections and layout helpers.

### The theme module

The theme module exports `theme`, `tokens` created with `createDesignTokens(theme, options)` (`options` comes from `options.ts`), and the `cn` helper.

<!-- embed: examples/plain-react/src/theme.ts -->

```ts
import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import { createCn } from "@duydpdev/style-generator/ui";

import { options } from "./options";
import themeJson from "./theme/theme.json";

/** The theme; `typeof theme` feeds `ColorVariant<typeof theme>` in the ui folders. */
export const theme = themeJson;

/** Typed token arrays from the theme and `options` (`./options`, shared with the bundler config). */
export const tokens = createDesignTokens(themeJson, options).DesignTokens.Web;

/** clsx + a tailwind-merge that knows this theme's utilities. */
export const cn = createCn(tokens);
```

### A component folder

<!-- embed: examples/plain-react/src/ui/button/style.ts -->

```ts
import {
  COLOR_STATES,
  createVariantMapper,
} from "@duydpdev/style-generator/cva";
import type { ColorVariant } from "@duydpdev/style-generator/types";
import {
  contrastText,
  pick,
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/**
 * The intents `color` offers. `satisfies` is the DX anchor: rename or
 * remove one of these colors in theme.json and the compiler fails here.
 */
export const buttonIntents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<typeof theme>[];

export type ButtonIntent = (typeof buttonIntents)[number];

const BUTTON_TINTS = ["outline", "soft", "ghost", "link"] as const;

type ButtonTint = (typeof BUTTON_TINTS)[number];

/** Literal classes, so Tailwind's scanner sees them: the registry emits no `outline-*` or `/10` classes. */
const focusRing = {
  primary: "focus-visible:outline-primary",
  secondary: "focus-visible:outline-secondary",
  success: "focus-visible:outline-success",
  danger: "focus-visible:outline-danger",
} as const satisfies Record<ButtonIntent, string>;

const tint = {
  primary: {
    outline: "border-primary text-primary hover:bg-primary/10",
    soft: "bg-primary/10 text-primary hover:bg-primary/15",
    ghost: "text-primary hover:bg-primary/10",
    link: "text-primary",
  },
  secondary: {
    outline: "border-secondary text-secondary hover:bg-secondary/10",
    soft: "bg-secondary/10 text-secondary hover:bg-secondary/15",
    ghost: "text-secondary hover:bg-secondary/10",
    link: "text-secondary",
  },
  success: {
    outline: "border-success text-success hover:bg-success/10",
    soft: "bg-success/10 text-success hover:bg-success/15",
    ghost: "text-success hover:bg-success/10",
    link: "text-success",
  },
  danger: {
    outline: "border-danger text-danger hover:bg-danger/10",
    soft: "bg-danger/10 text-danger hover:bg-danger/15",
    ghost: "text-danger hover:bg-danger/10",
    link: "text-danger",
  },
} as const satisfies Record<ButtonIntent, Record<ButtonTint, string>>;

const colors: readonly string[] = tokens.colors;
// `bg-primary hover:bg-primary-hover active:bg-primary-active` when the theme declares the state siblings.
const bgStates = createVariantMapper("bg", tokens.colors, {
  states: COLOR_STATES,
});
const bg = createVariantMapper("bg", tokens.colors);
const rounded = createVariantMapper("rounded", tokens.borderRadius);
const type = createVariantMapper("", tokens.typography);

/** A filled intent: state backgrounds, `on<Intent>` text (else `text-background`), `hover:opacity-90` without an `<intent>Hover` color. */
const fill = (intent: ButtonIntent): string[] => {
  const classes = [
    pick(bgStates, intent),
    contrastText(colors, intent, "background"),
  ];
  if (!colors.includes(`${intent}Hover`)) classes.push("hover:opacity-90");
  return classes;
};

/** Button as data: variant × intent × size. */
export const buttonTables = {
  base: [
    "inline-flex shrink-0 items-center justify-center gap-1.5",
    `${pick(rounded, "md")} border`,
    `cursor-pointer ${pick(type, "text16Medium")} whitespace-nowrap outline-hidden select-none`,
    "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2",
    "transition-[background-color,color,opacity] duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  variants: {
    variant: {
      fill: "border-transparent active:scale-[0.98]",
      outline: `${pick(bg, "background")} active:scale-[0.98]`,
      soft: "border-transparent active:scale-[0.98]",
      ghost: "border-transparent active:scale-[0.98]",
      link: "border-transparent underline-offset-4 hover:underline",
    },
    color: focusRing,
    size: {
      sm: "h-7 px-2.5",
      md: "h-9 px-3.5",
      lg: `h-11 px-5 ${pick(type, "text32Bold")}`,
    },
  },
  compoundVariants: buttonIntents.flatMap((intent) => [
    { color: intent, variant: "fill", class: fill(intent) },
    ...BUTTON_TINTS.map((variant) => ({
      color: intent,
      variant,
      class: tint[intent][variant],
    })),
  ]),
  defaultVariants: {
    variant: "fill",
    color: buttonIntents[0],
    size: "md",
  },
} satisfies RecipeTables;

export const buttonRecipe: RecipeFn = recipeFromTables(buttonTables);
```

<!-- embed: examples/plain-react/src/ui/button/types.ts -->

```ts
import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type { CSSProperties, ElementType, ReactNode } from "react";

import type { tokens } from "../../theme";

import type { ButtonIntent } from "./style";

export type ButtonOwnProps = ThemeSpacingProps<typeof tokens> & {
  readonly variant?: "fill" | "outline" | "soft" | "ghost" | "link" | undefined;
  /** One of `buttonIntents`. */
  readonly color?: ButtonIntent | undefined;
  readonly size?: "sm" | "md" | "lg" | undefined;
  readonly prefix?: ReactNode;
  readonly suffix?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

export type ButtonProps<T extends ElementType = "button"> = Polymorphic<
  T,
  ButtonOwnProps
>;
```

<!-- embed: examples/plain-react/src/ui/button/Button.tsx -->

```tsx
import { mergeStyle, splitSpacing } from "@duydpdev/style-generator/ui";
import type { ElementType, JSX } from "react";

import { cn, tokens } from "../../theme";

import { buttonRecipe } from "./style";
import type { ButtonProps } from "./types";

/** `Button`: variant × intent × size; a `<button>` gets `type="button"` unless one is passed. */
export function Button<T extends ElementType = "button">({
  as,
  className,
  style,
  variant,
  color,
  size,
  prefix,
  suffix,
  children,
  ...props
}: ButtonProps<T>): JSX.Element {
  const Component: ElementType = as ?? "button";
  const split = splitSpacing(props, tokens.spacingProperties);
  return (
    <Component
      type={Component === "button" ? "button" : undefined}
      {...split.rest}
      className={
        cn(
          buttonRecipe({ variant, color, size }),
          split.className,
          className,
        ) || undefined
      }
      style={mergeStyle(split.style, style)}
    >
      {prefix != null && <span>{prefix}</span>}
      <span>{children}</span>
      {suffix != null && <span>{suffix}</span>}
    </Component>
  );
}
```

The Vue implementation in `plain-nuxt` shares `style.ts`, uses an SFC-compatible `types.ts`, and renders a single-file component:

<!-- embed: examples/plain-nuxt/app/ui/button/types.ts -->

```ts
import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";

import type { tokens } from "../../theme";

import type { ButtonIntent } from "./style";

/** Button props; spacing props arrive as attributes (`@vue-ignore`). */
export interface ButtonProps extends /* @vue-ignore */ ThemeSpacingProps<
  typeof tokens
> {
  as?: string;
  variant?: "fill" | "outline" | "soft" | "ghost" | "link";
  /** One of `buttonIntents`. */
  color?: ButtonIntent;
  size?: "sm" | "md" | "lg";
}
```

<!-- embed: examples/plain-nuxt/app/ui/button/Button.vue -->

```vue
<script setup lang="ts">
import { splitSpacing } from "@duydpdev/style-generator/ui";
import { useAttrs } from "vue";

import { cn, tokens } from "../../theme";

import { buttonRecipe } from "./style";
import type { ButtonProps } from "./types";

type ClassValue = Parameters<typeof cn>[number];

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<ButtonProps>(), { as: "button" });
const slots = defineSlots<{
  default?: () => unknown;
  prefix?: () => unknown;
  suffix?: () => unknown;
}>();
const attrs = useAttrs();

// Root attributes: defaults, the caller's attributes, then class and style.
const root = () => {
  const split = splitSpacing(attrs, tokens.spacingProperties);
  const { class: klass, style, ...rest } = split.rest;
  return {
    type: props.as === "button" ? "button" : undefined,
    ...rest,
    class: cn(
      buttonRecipe({
        variant: props.variant,
        color: props.color,
        size: props.size,
      }),
      split.className,
      klass as ClassValue,
    ),
    style: [split.style, style],
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()">
    <span v-if="slots.prefix"><slot name="prefix" /></span>
    <span><slot /></span>
    <span v-if="slots.suffix"><slot name="suffix" /></span>
  </component>
</template>
```

### Copy a component into your app

1. Install the required dependencies:

   ```bash
   yarn add @duydpdev/style-generator@^7.0.0 class-variance-authority clsx tailwind-merge
   ```

   See the README [Install](../README.md#install) section to configure the `@duydpdev` scope registry and your Personal Access Token; without the scope config npmjs serves an unrelated `3.0.0`.

2. Wire `theme.css` for your bundler ([React + Vite](./getting-started/react-vite.md), [Next.js](./getting-started/next.md), [Nuxt](./getting-started/nuxt-vue.md)).

3. Copy `theme.ts`, `options.ts` and your theme JSON, once.

4. Copy the folder. Nothing else is needed: a folder imports only its own files, `../../theme` and packages.

### The ten components

| Folder   | Component | Parity gate |
| -------- | --------- | ----------- |
| `box`    | Box       | yes         |
| `text`   | Text      | yes         |
| `stack`  | Stack     | yes         |
| `flex`   | Flex      | yes         |
| `grid`   | Grid      | yes         |
| `button` | Button    | yes         |
| `card`   | Card      | no          |
| `badge`  | Badge     | no          |
| `input`  | Input     | no          |
| `link`   | Link      | no          |

"yes" means `yarn workspace plain-react-example test` fails when the plain React classes differ from the harness component's.

### Rules

- `className`/`class` and `style` are allowed on tags.
- A pattern that has a rule or repeats becomes a component with typed props.
- No `data-*` attribute as a bespoke CSS hook (ESLint and the CI `check` job ban the old part-hook attribute repo-wide); bespoke CSS hooks in the plain apps are ordinary `className`s.
- `src/**` (Nuxt `app/**`) never imports `design-system-example` or `harness-example` (ESLint).
- A ui folder imports only `./…`, `../../theme` and packages.

### Adding a plain component

Add the folder in `plain-react` with a `<Name>.stories.tsx`, copy `style.ts` to `examples/plain-nuxt/app/ui/<folder>/` and write its `types.ts`, `<Name>.vue` and a `<Name>.stories.ts` port; then run `yarn check:plain-ui`.

### Checks

- `yarn check:plain-ui`
- `yarn workspace plain-react-example test`
- The three `typecheck`/`build` scripts
- `yarn lint` (after `yarn build:all` and both `prepare:nuxt`)

## Harness (repo-internal)

The harness is not meant to be copied: it is the repo's own DX test and site demo.

Until commit `2045cce`, Dialog, Select, List, ListItem, Card, Badge, Code, Container, Input and Link lived in `packages/ui-react` and `packages/ui-vue` behind one `createUi(tokens, presets)` call; `git show 2045cce:packages/ui-react/src/Dialog/Dialog.tsx` recovers one as a starting point.

### Using components

In React, each file in `src/ui/` exports a factory (`createBox`, `createText`, …) that takes the app's tokens and, where the component has one, a preset. `src/ui.ts` binds them once, and app code imports the components from there:

<!-- embed: examples/harness/src/ui.ts -->

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

In Vue (`plain-nuxt`) there is no binding step: each SFC imports `cn` and `tokens` from the app's `theme.ts` and its recipe from its own `style.ts`, and a page imports the file it renders explicitly (`import Button from "~/ui/button/Button.vue"`).

Every component accepts the spacing props of the theme (`p`, `px`, `mt`, `gapX`, …). The table lists the other props of each component; the rendered element's own attributes pass through as well.

| Component | Replaces tags                                                           | Main props                                                                                                                                                                                                                                                                                                                              |
| --------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Box`     | `div`, `section`, `header`, `footer`, `aside`, `main`, `nav`, `article` | `backgroundColor`, `borderColor`, `ringColor`, `outlineColor` (a token or `token/step`), `border*`, `rounded*`, `shadow`, `backdropBlur`, `position`, `display`, `overflow`, `zIndex`, `opacity`, `cursor`, `pointerEvents`, `select`, `transition`, `aspect`, `objectFit`, `visibility`, `width`/`height` (and min/max), `innerBorder` |
| `Text`    | `span`, `p`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`                         | `type` (a typography key), `color` (a token or `token/step`), `align`, `decoration`, `transform`, `italic`, `truncate`, `lineClamp`, `wrap`                                                                                                                                                                                             |
| `Stack`   | none                                                                    | `align`, `justify`, `wrap`, `divideColor`, plus the `Box` layout props; vertical by default                                                                                                                                                                                                                                             |
| `Flex`    | none                                                                    | `direction`, `align`, `justify`, `wrap`, `divideColor`, `grow`, `shrink`, `basis`, plus the `Box` layout props                                                                                                                                                                                                                          |
| `Grid`    | none                                                                    | `columns` (a count, a CSS track list such as `"80px 1fr 80px"`, or `{ base, md, lg }` of either), `align`, `justify`, `flow`, `rows` (`1`-`6` or `"none"`; with `as="textarea"` it is the grid prop, not the HTML attribute), plus the `Box` layout props                                                                               |
| `Button`  | `button`                                                                | `variant` (`fill`, `outline`, `soft`, `ghost`, `link`), `color`, `size`, `prefix`, `suffix`                                                                                                                                                                                                                                             |

Each static layout prop takes the Tailwind class suffix in camelCase (`display="inlineFlex"` → `inline-flex`, `cursor="notAllowed"` → `cursor-not-allowed`); `zIndex` (`0`-`50` in steps of 10, `"auto"`) and `opacity` (`0`-`100` in steps of 10) take numbers; the colour steps are `coverage.colors.opacities`; the plain `Input` also takes `placeholderColor` (default `muted`).

The `token/step` colors of `Text` (`color="primary/50"`) are the steps in `coverage.colors.opacities`, which the example apps declare in `options.ts` and `style-gen.config.json`. `truncate` also sets `whitespace-nowrap`, so do not combine it with `lineClamp`.

The rules for app code:

- Boolean variants are written bare: `<Flex wrap>`, not `wrap={true}`. `false` is written only where it selects a class: `<Flex shrink={false}>` renders `shrink-0`.
- Spacing props are numbers on the spacing scale or `{ base, md, lg }` objects: `<Box p={4} />`, `<Stack gap={{ base: 2, md: 4 }} />`.
- App code passes no `className` and no `style`; a variant or a token prop expresses the style instead. A value no prop can express (a computed transform or width) keeps its `style` behind `// eslint-disable-next-line no-restricted-syntax -- <reason>`.
- App code imports no recipe; recipes are used only inside the `ui/` component files.

ESLint enforces the last two rules and bans the tags of the table above in app files, so a plain `<div>` is reported. The component names and their tags come from [`examples/ui-registry.mjs`](../examples/ui-registry.mjs).

### Layout by intent

- **`Stack`** is the vertical, single-column flow: a page section, a form, a card body. Space its children with `gap`, not with a margin on each child.
- **`Flex`** is a row, or a wrapping set of two or more children. Never wrap a single child in `Flex` to align or space it: put those props on the child itself or on the parent `Stack`. One exception: a `Flex` whose second flex item is a CSS pseudo-element (a `::before`/`::after` rule line next to a label) has two flex items even though its markup shows one child; the site's `docs-onpage.tsx`, `docs-sidebar.tsx` and `sidebar-toc.tsx` labels work this way. ESLint cannot report this rule (whitespace text between JSX tags counts as a child), so review checks it.
- **`Grid`** always has `columns`: a count (`columns={3}`), a CSS track list (`columns="220px 1fr"`), or a `{ base, md, lg }` record of either (`columns={{ base: 1, md: "220px 1fr" }}`). A `Grid` without `columns` is a single-column `Stack` in disguise. ESLint reports `<Grid>` without `columns` in `examples/harness/src`; the landing site is exempt, because its grids use desktop-first CSS templates under `@media (max-width: …)` that the mobile-first `columns` prop cannot express.

### Polymorphic `as`

The layout components and `Text` accept `as` to pick the root element, and the other props are then typed for that element: `<Text as="h1" type="display56Serif">` accepts the `<h1>` attributes, and `<Box as="section">` the `<section>` ones. Each React file types its props with `Polymorphic` from `@duydpdev/style-generator/ui-react`; see [`examples/harness/src/ui/Box.tsx`](../examples/harness/src/ui/Box.tsx).

### Adding a component

`Text` is the worked example. A new component touches these places; skip the ones that do not apply:

1. **Recipe factory** in `examples/design-system/src/recipes/factories/<name>.ts`, exported from `factories/index.ts` (the `design-system-example/recipes` subpath).
2. **Bound recipe and preset** in `examples/design-system/src/recipes/<name>.ts`, exported from `src/index.ts`. The React app binds the factory with the preset.
3. **React component file** `examples/harness/src/ui/<Name>.tsx`: its own prop types over `Polymorphic` from `@duydpdev/style-generator/ui-react`. It splits its props with the kit in `@duydpdev/style-generator/ui`: `splitLayout` (with `BOX_VARIANT_KEYS` and the `LAYOUT_SIZE_KEYS` of `src/ui/layout.ts`) for a layout component, `splitSpacing` for any other.
4. **Export** from `examples/harness/src/ui/index.ts`.
5. **Binding** in `examples/harness/src/ui.ts`, and in `site/src/ui.ts` when the site renders it.
6. **Registry entry** `{ name: "<Name>", tags: [...] }` in `examples/ui-registry.mjs`, with the lowercase tags it replaces (an empty list when none); ESLint builds the React rules from it.
7. **Type checks**: a few lines in `examples/harness/tests/ui-types.tsx`, including one `@ts-expect-error` for a wrong token.

The factory knows no theme values:

<!-- embed: examples/design-system/src/recipes/factories/text.ts -->

```ts
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

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
    color: createVariantMapper("text", t.colors, {
      opacities: t.opacities ?? [],
    }),
    transform: {
      uppercase: "uppercase",
      lowercase: "lowercase",
      capitalize: "capitalize",
      normalCase: "normal-case",
    },
    italic: { true: "italic" },
    truncate: { true: "truncate whitespace-nowrap" },
    lineClamp: {
      1: "line-clamp-1",
      2: "line-clamp-2",
      3: "line-clamp-3",
      4: "line-clamp-4",
      5: "line-clamp-5",
      6: "line-clamp-6",
      none: "line-clamp-none",
    },
    wrap: {
      wrap: "text-wrap",
      nowrap: "text-nowrap whitespace-nowrap",
      balance: "text-balance",
      pretty: "text-pretty",
    },
  },
});

/**
 * Text recipe for one theme: `type`, `color` (a token or `token/step`),
 * `decoration`, `align`, `transform`, `italic`, `truncate` (also sets
 * `whitespace-nowrap`), `lineClamp` and `wrap`.
 */
export const createTextRecipe = (
  t: RecipeTokens,
  preset?: TextPreset,
): RecipeFn => recipeFromTables(textTables(t, preset));
```

The preset holds the theme's values, and the bound recipe applies the factory to the design system's tokens (`textRecipe({ type, color, decoration, align, transform, italic, truncate, lineClamp, wrap })`):

<!-- embed: examples/design-system/src/recipes/text.ts -->

```ts
import type { VariantProps } from "class-variance-authority";
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";

import { tokens, type ColorValue, type Theme } from "../tokens";

import { createTextRecipe, type TextPreset } from "./factories/text";

export const textAlign = ["left", "center", "right"] as const;
export const textDecoration = ["underline", "lineThrough", "none"] as const;
export const textTransform = [
  "uppercase",
  "lowercase",
  "capitalize",
  "normalCase",
] as const;
export const textLineClamp = [1, 2, 3, 4, 5, 6, "none"] as const;
export const textWrap = ["wrap", "nowrap", "balance", "pretty"] as const;

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
  color?: ColorValue | null | undefined;
  decoration?: (typeof textDecoration)[number] | null | undefined;
  align?: (typeof textAlign)[number] | null | undefined;
  transform?: (typeof textTransform)[number] | null | undefined;
  italic?: boolean | null | undefined;
  truncate?: boolean | null | undefined;
  lineClamp?: (typeof textLineClamp)[number] | null | undefined;
  wrap?: (typeof textWrap)[number] | null | undefined;
}>;

/**
 * Headless text recipe: `textRecipe({ type, color, decoration, align,
 * transform, italic, truncate, lineClamp, wrap })`. `type` is a typography
 * utility (`text-16-medium`), `color` a `text-*` color or `token/step`
 * (`primary/50`); `truncate` also sets `whitespace-nowrap` (do not combine
 * it with `lineClamp`).
 */
export const textRecipe: (props?: TextRecipeProps) => string = createTextRecipe(
  tokens,
  textPreset,
);

export type TextVariants = VariantProps<typeof textRecipe>;

/** Props a framework `Text` component adds on top of the element's own props. */
export interface TextStyleProps {
  type?: TextVariant<Theme>;
  color?: ColorValue;
  decoration?: (typeof textDecoration)[number];
  align?: (typeof textAlign)[number];
  transform?: (typeof textTransform)[number];
  italic?: boolean;
  truncate?: boolean;
  lineClamp?: (typeof textLineClamp)[number];
  wrap?: (typeof textWrap)[number];
}
```

The React file exports a factory that takes the app's tokens and the preset, so the site can bind the same file to its own theme:

<!-- embed: examples/harness/src/ui/Text.tsx -->

```tsx
import {
  createCn,
  mergeStyle,
  splitSpacing,
  type RecipeTokens,
  type ThemeSpacingProps,
} from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import {
  createTextRecipe,
  type TextPreset,
} from "design-system-example/recipes";
import type { CSSProperties, ElementType, JSX } from "react";

import type { ColorValue } from "./layout";

type TextOwnProps<W extends RecipeTokens> = ThemeSpacingProps<W> & {
  readonly type?: W["typography"][number] | undefined;
  readonly color?: ColorValue<W> | undefined;
  readonly align?: "left" | "center" | "right" | undefined;
  readonly decoration?: "underline" | "lineThrough" | "none" | undefined;
  readonly transform?:
    | "uppercase"
    | "lowercase"
    | "capitalize"
    | "normalCase"
    | undefined;
  readonly italic?: boolean | undefined;
  readonly truncate?: boolean | undefined;
  readonly lineClamp?: 1 | 2 | 3 | 4 | 5 | 6 | "none" | undefined;
  readonly wrap?: "wrap" | "nowrap" | "balance" | "pretty" | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

/** `Text`: typography, color (a token or `token/step`), align, decoration, transform, italic, truncate, line clamp, wrap from the text recipe, preset defaults, spacing props. */
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
    transform,
    italic,
    truncate,
    lineClamp,
    wrap,
    ...props
  }: Polymorphic<T, TextOwnProps<W>>): JSX.Element {
    const Component: ElementType = as ?? "p";
    const split = splitSpacing(props, spacingKeys);
    return (
      <Component
        {...split.rest}
        className={
          cn(
            text({
              type,
              color,
              align,
              decoration,
              transform,
              italic,
              truncate,
              lineClamp,
              wrap,
            }),
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

The Vue SFC in `plain-nuxt` imports `cn` and `tokens` from the app's `theme.ts` and its recipe from `style.ts`, and declares its props with `defineProps`:

<!-- embed: examples/plain-nuxt/app/ui/text/Text.vue -->

```vue
<script setup lang="ts">
import { splitSpacing } from "@duydpdev/style-generator/ui";
import { useAttrs } from "vue";

import { cn, tokens } from "../../theme";

import { textRecipe } from "./style";
import type { TextProps } from "./types";

type ClassValue = Parameters<typeof cn>[number];

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<TextProps>(), { as: "p" });
const attrs = useAttrs();

const root = () => {
  const split = splitSpacing(attrs, tokens.spacingProperties);
  const { class: klass, style, ...rest } = split.rest;
  return {
    ...rest,
    class: cn(
      textRecipe({
        type: props.type,
        color: props.color,
        align: props.align,
        decoration: props.decoration,
        transform: props.transform,
        italic: props.italic,
        truncate: props.truncate,
        lineClamp: props.lineClamp,
        wrap: props.wrap,
      }),
      split.className,
      klass as ClassValue,
    ),
    style: [split.style, style],
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()"><slot /></component>
</template>
```

### Checks

The examples have no test runner. Their checks are compile-time and lint-time, and all of them read the library's built `dist/`, so run `yarn build:all` first:

- `yarn workspace harness-example typecheck` compiles `src/ui/*.tsx` and `tests/ui-types.tsx`, whose `@ts-expect-error` lines must each be consumed by a real type error.
- `yarn lint` applies the registry rules (banned tags, no `className`/`style`, `Grid` needs `columns`).
- `yarn workspace site build` (which builds `harness`) proves the app renders.

## Recipes without components

Use `@duydpdev/style-generator/recipes` directly when your framework has no sample component, or for one-off markup: the helpers are browser-safe and framework-free. See [Recipes](./reference/recipes.md) and [CVA helpers](./reference/cva.md). The same kit the sample components use is published as [`./ui`](./reference/ui.md) (`recipeFromTables`, `createCn`, `splitLayout`, `mergeStyle`) and [`./ui-react`](./reference/ui-react.md) (`Polymorphic`).
