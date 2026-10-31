# Components

Apps import their components from their own `ui.ts`, which calls `createUi(tokens, presets)` once. The typed tokens and the recipe presets come from the shared design system, and every role in `presets` is optional: a component whose role is not declared is not returned.

`@duydpdev/ui-react` and `@duydpdev/ui-vue` are example packages inside this repository (`packages/ui-react`, `packages/ui-vue`). They are not published: copy the package folder into your project instead of installing it. A package with the same name from another registry is not ours.

## Using components

<!-- embed: examples/react-v4/src/ui.ts -->

```ts
import { createUi } from "@duydpdev/ui-react";
import { presets as designPresets, tokens } from "design-system-example";

/** The roles this app renders; an omitted role is not returned by createUi. */
const presets = {
  box: designPresets.box,
  text: designPresets.text,
  button: designPresets.button,
};

/** The example's token-typed components: one `createUi` call for the whole app. */
export const { Box, Button, Container, Flex, Grid, Stack, Text } = createUi(
  tokens,
  presets,
);
```

Every component accepts the spacing props of the theme (`p`, `px`, `mt`, `gapX`, …). The table lists the other props that are specific to each component; the rendered element's own attributes pass through as well.

| Component   | Replaces tags                                                           | Main props                                                                                                                                   |
| ----------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Box`       | `div`, `section`, `header`, `footer`, `aside`, `main`, `nav`, `article` | `backgroundColor`, `borderColor`, `border*`, `rounded*`, `shadow`, `backdropBlur`, `position`, `width`/`height` (and min/max), `innerBorder` |
| `Flex`      | none                                                                    | `direction`, `align`, `justify`, `wrap`, plus the `Box` layout props                                                                         |
| `Stack`     | none                                                                    | The `Flex` props with `direction="column"` as the default                                                                                    |
| `Grid`      | none                                                                    | `columns` (a number or `{ base, md, lg }`), `align`, `justify`, `flow`, plus the `Box` layout props                                          |
| `Container` | none                                                                    | The `Box` layout props without horizontal margins: it centres itself                                                                         |
| `Text`      | `span`, `p`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`                         | `type` (a typography key), `color`, `align`, `decoration`                                                                                    |
| `Link`      | none                                                                    | `color`, `underline` (`always`, `hover`, `none`)                                                                                             |
| `List`      | none                                                                    | `marker` (`none`, `disc`, `decimal`), `position` (`inside`, `outside`), plus the `Box` layout props                                          |
| `ListItem`  | none                                                                    | The `Box` layout props                                                                                                                       |
| `Code`      | none                                                                    | `type`, `color`                                                                                                                              |
| `Button`    | `button`                                                                | `variant` (`fill`, `outline`, `soft`, `ghost`, `link`), `color`, `size`, `prefix`, `suffix`                                                  |
| `Card`      | none                                                                    | `tone` (`surface`, `muted`, `outline`), `padding` (`none`, `sm`, `md`, `lg`)                                                                 |
| `Badge`     | none                                                                    | `color`, `variant` (`soft`, `solid`, `outline`)                                                                                              |
| `Input`     | `input`                                                                 | `size`, `invalid`, plus the `<input>` attributes                                                                                             |
| `Select`    | `select`                                                                | `size`, `invalid`, plus the `<select>` attributes                                                                                            |
| `Dialog`    | none                                                                    | `open`, `onClose`, `size`, `blur`                                                                                                            |

The rules for app code:

- Boolean variants are written bare: `<Flex wrap>`, not `wrap={true}`.
- Spacing props are numbers on the spacing scale or `{ base, md, lg }` objects: `<Box p={4} />`, `<Stack gap={{ base: 2, md: 4 }} />`.
- App code passes no `className`; a variant or a token prop expresses the style instead.
- App code imports no recipe; recipes are only used inside the component package.

ESLint enforces the last two rules and bans the tags of the table above in app files, so a plain `<div>` is reported.

## Polymorphic `as`

Components that render a layout or text element accept `as` to pick the root element, and the other props are then typed for that element: `<Text as="h1" type="display56Serif">` accepts the `<h1>` attributes, and `<Box as="section">` the `<section>` ones. The types are in [`packages/ui-react/src/shared/types/polymorphic.ts`](../packages/ui-react/src/shared/types/polymorphic.ts).

## Authoring a component

A component is a recipe, a preset that binds it to the theme, and a small folder in the component package. `Badge` is the smallest complete example.

### 1. Recipe factory

The factory turns the theme's tokens and a preset into the variant tables of one recipe. It lives in the design system and knows no theme values.

<!-- embed: examples/design-system/src/recipes/factories/badge.ts -->

```ts
import { createVariantMapper } from "@duydpdev/style-generator/cva";

import {
  borderWidthClass,
  contrastText,
  pick,
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "./tables";

export interface BadgePreset {
  readonly intents: readonly string[];
  /** Solid-variant text colour of an intent without an `on<Intent>` sibling. */
  readonly background: string;
  readonly radius: string;
  /** Omitted → Tailwind's `border` (1px). */
  readonly borderWidth?: string | undefined;
  readonly type: string;
  /** Literal soft-variant classes per intent (`bg-primary/10 text-primary`). */
  readonly soft: Readonly<Record<string, string>>;
}

export const badgeTables = (
  t: RecipeTokens,
  preset: BadgePreset,
): RecipeTables => {
  const bg = createVariantMapper("bg", t.colors);
  const text = createVariantMapper("text", t.colors);
  const border = createVariantMapper("border", t.colors);
  return {
    base: [
      "inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5",
      pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
      borderWidthClass(t.borderWidth, preset.borderWidth),
      pick(createVariantMapper("", t.typography), preset.type),
    ],
    variants: {
      color: Object.fromEntries(preset.intents.map((intent) => [intent, ""])),
      variant: {
        soft: "border-transparent",
        solid: "border-transparent",
        outline: "bg-transparent",
      },
    },
    compoundVariants: preset.intents.flatMap((intent) => [
      { color: intent, variant: "soft", class: pick(preset.soft, intent) },
      {
        color: intent,
        variant: "solid",
        class: [
          pick(bg, intent),
          contrastText(t.colors, intent, preset.background),
        ],
      },
      {
        color: intent,
        variant: "outline",
        class: `${pick(border, intent)} ${pick(text, intent)}`,
      },
    ]),
    defaultVariants: { color: preset.intents[0], variant: "soft" },
  };
};

export const createBadgeRecipe = (
  t: RecipeTokens,
  preset: BadgePreset,
): RecipeFn => recipeFromTables(badgeTables(t, preset));
```

### 2. Bound recipe and preset

The preset holds the theme's values (intents, radius, border width, typography key); the bound recipe applies the factory to the design system's tokens and exposes `badgeRecipe({ color, variant })`.

<!-- embed: examples/design-system/src/recipes/badge.ts -->

```ts
import type { VariantProps } from "class-variance-authority";

import { tokens } from "../tokens";

import { intents, type Intent } from "./button";
import { createBadgeRecipe, type BadgePreset } from "./factories/badge";

export const badgePreset = {
  intents,
  background: "background",
  radius: "pill",
  borderWidth: "thin",
  type: "text12Mono",
  // Opacity-modified classes stay literal: the registry's coverage has none.
  soft: {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
  },
} as const satisfies BadgePreset;

/** Props of the bound badge recipe. */
export type BadgeRecipeProps = Readonly<{
  color?: Intent | null | undefined;
  variant?: "soft" | "solid" | "outline" | null | undefined;
}>;

/** Headless badge recipe: `badgeRecipe({ color, variant })`. */
export const badgeRecipe: (props?: BadgeRecipeProps) => string =
  createBadgeRecipe(tokens, badgePreset);

export type BadgeVariants = VariantProps<typeof badgeRecipe>;
```

### 3. Component folder

The folder holds the dependencies type, the styles that build the classes, and the component.

<!-- embed: packages/ui-react/src/Badge/Badge.types.ts -->

```ts
import type { UiCn } from "../shared/cn";
import type { BodyRecipe } from "../shared/splitStyleProps";

export interface BadgeDeps {
  readonly cn: UiCn;
  readonly spacing: readonly string[];
  readonly badge: BodyRecipe;
}
```

<!-- embed: packages/ui-react/src/Badge/Badge.styles.ts -->

```ts
import {
  createBadgeRecipe,
  type BadgePreset,
  type RecipeTokens,
} from "design-system-example/recipes";

import type { BadgeDeps } from "./Badge.types";

export const createBadgeStyles = (
  tokens: RecipeTokens,
  preset: BadgePreset,
): Pick<BadgeDeps, "badge"> => ({ badge: createBadgeRecipe(tokens, preset) });
```

<!-- embed: packages/ui-react/src/Badge/Badge.tsx -->

```tsx
import type { JSX } from "react";

import { mergeStyle, splitSpacing } from "../shared/splitStyleProps";
import type { LooseProps } from "../shared/types";

import type { BadgeDeps } from "./Badge.types";

export const createBadge = (deps: BadgeDeps) =>
  function Badge({
    as,
    className,
    style,
    color,
    variant,
    ...props
  }: LooseProps): JSX.Element {
    const Component = as ?? "span";
    const spacing = splitSpacing(props, deps.spacing);
    return (
      <Component
        {...spacing.rest}
        className={deps.cn(
          deps.badge({ color, variant }),
          spacing.className,
          className,
        )}
        style={mergeStyle(spacing.style, style)}
      />
    );
  };
```

### 4. Register it

`createUi` returns the component when its role is in `presets`.

<!-- embed: packages/ui-react/src/createUi.ts#create-ui -->

```ts
/**
 * Bind every component to one app's tokens (`createDesignTokens(theme, options).DesignTokens.Web`)
 * and role presets. Box/Flex/Stack/Grid/Container/Text/Link/List/ListItem/Code are always
 * returned; Button, Badge, Card, Input, Select and Dialog only when `presets` declares their
 * role. Call once per app.
 */
export function createUi<
  W extends UiTokens,
  B extends ColorKey<W> = never,
  G extends ColorKey<W> = never,
  const P extends UiPresets<W, B, G> = UiPresets<W, B, G>,
>(tokens: W, presets: P & UiPresets<W, B, G>): Ui<W, B, G, P> {
  const roles = presets as Roles;
  const cn = createUiCn(tokens);
  const spacing = tokens.spacingProperties;
  const { box, layout } = createBoxStyles(tokens, roles.box);
  const flex = { cn, spacing, layout, ...createFlexStyles() };
  const ui: Record<string, unknown> = {
    Box: createBox({ cn, spacing, box }),
    Flex: createFlex(flex, "row"),
    Stack: createStack(flex),
    Grid: createGrid({ cn, spacing, layout, ...createGridStyles(tokens) }),
    Container: createContainer({
      cn,
      spacing,
      layout,
      ...createContainerStyles(),
    }),
    Text: createText({
      cn,
      spacing,
      ...createTextStyles(tokens, roles.text),
    }),
    Link: createLink({ cn, spacing, ...createLinkStyles(tokens) }),
    List: createList({ cn, spacing, layout, ...createListStyles() }),
    ListItem: createListItem({ cn, spacing, layout }),
    Code: createCode({
      cn,
      spacing,
      ...createCodeStyles(tokens, roles.code),
    }),
  };
  if (roles.button)
    ui.Button = createButton({
      cn,
      spacing,
      ...createButtonStyles(tokens, roles.button),
    });
  if (roles.badge)
    ui.Badge = createBadge({
      cn,
      spacing,
      ...createBadgeStyles(tokens, roles.badge),
    });
  if (roles.card)
    ui.Card = createCard({
      cn,
      spacing,
      ...createCardStyles(tokens, roles.card),
    });
  if (roles.input)
    ui.Input = createInput({
      cn,
      ...createInputStyles(tokens, roles.input),
    });
  if (roles.select)
    ui.Select = createSelect({
      cn,
      ...createSelectStyles(tokens, roles.select),
    });
  if (roles.dialog)
    ui.Dialog = createDialog({
      cn,
      ...createDialogStyles(tokens, roles.dialog),
    });
  // Bodies are untyped (LooseProps); the typed surface is restored once, here.
  return ui as unknown as Ui<W, B, G, P>;
}
```

Add a `{ name: "Badge", … }` entry to `UI_COMPONENTS` in [`registry.mjs`](../packages/ui-react/registry.mjs) so ESLint bans the tags the component replaces.

### 5. Tests to add

- `Badge.test.tsx` renders the component and checks its classes.
- `Badge.test-d.tsx` pins the prop types.
- `tests/recipe-names.test.ts` fails until every recipe has a component, so a new recipe without one is caught.

## Recipes without components

Use `@duydpdev/style-generator/recipes` directly when your framework has no component package, or for one-off markup: the helpers are browser-safe and framework-free. See [Recipes](./reference/recipes.md) and [CVA helpers](./reference/cva.md).
