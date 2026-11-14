# Agent contract

The rules an agent (or a person) follows to write a theme and components with `@duydpdev/style-generator` in an app. They hold for **any** theme: no colour, size or key in this file is a value to copy. The keys in the code below (`primary`, `background`, `text16Medium` …) belong to the example theme; your app uses the keys of its own theme JSON.

`style-gen init` writes this file to `.claude/rules/style-generator.md`. Everything not covered here is in [Components](./components.md) and the [Theme config](./reference/theme.md) reference.

## 1. Role contract (theme shape, not theme names)

Name the keys after the app's own roles. The library derives every type and class from the keys you write; it never expects a particular name.

- `colors` is required and **flat camelCase**: `brand`, `brandHover`, `surfaceRaised`. No nested object, no `DEFAULT`, no `_`, no leading run of two or more capitals (`CTA`, `HTMLText`); a single capital or an inner run (`primaryCTA`) is fine. The schema rejects the rest.
- An intent may declare state siblings `<intent>Hover` and `<intent>Active`. `createVariantMapper("bg", tokens.colors, { states: COLOR_STATES })` (`COLOR_STATES` from `@duydpdev/style-generator/cva`) turns `brand` into `bg-brand hover:bg-brand-hover active:bg-brand-active` when they exist and into `bg-brand` when they do not.
- An intent may declare an `on<Intent>` text colour (`brand` → `onBrand`). `contrastText(tokens.colors, intent, fallback)` returns `text-on-brand` when it exists, else `text-<fallback>`.
- A value `"$<key>"` aliases another key **of the same category** (`"brandHover": "$brandActive"` in `colors`). Not in `typography`. Unknown targets and cycles are schema errors.
- Dark mode and palettes go in `themeAxes.<axis>.<variant>`; an override may only redefine keys that exist in the base category. Activation is `html[data-<axis>="<variant>"]` (use `themeAxisAttributes` from `@duydpdev/style-generator/recipes`). `base` is reserved as a variant name.
- Every other category (`typography`, `shadows`, `borderRadius`, `borderWidth`, `fontFamily`, `backDropBlurs`) is optional and follows the same key grammar. Typography entries need `fontSize`, `lineHeight` and a numeric `fontWeight`.
- Avoid keys whose class equals a Tailwind utility (`none` → `bg-none`, typography `textSm` → `text-sm`, `h1` → `h-1`). `style-gen doctor` warns; rename to `clear`, `flat`, `heading1`.
- `style-gen init` writes a starter theme. Rename its keys to the app's roles and set every value for this app; a starter key left with its starter value is a copy, not a choice.

Each rule above is enforced by the theme schema (`generate()`, `style-gen generate`, the Vite/Next plugins) or reported by `style-gen doctor`. Keep `"$schema"` pointing at the generated `theme.schema.json` for editor validation.

## 2. Layout

```text
<theme JSON>                # the path `style-gen.config.json#theme` names (init default: src/styles/theme.json)
<theme>.tokens.ts           # written by `style-gen generate` and the bundler plugin beside the CSS (commit it); exports `tokens`
src/theme.ts                # export { theme, tokens, cn }; imports the theme JSON and the generated tokens file
src/ui/<kebab-name>/        # one folder per component, never a loose src/components/<Name>.tsx
  style.ts                  # intents, tables, recipe
  types.ts                  # <Name>OwnProps / <Name>Props
  <Name>.tsx                # the component (Vue: <Name>.vue, no index.ts)
  index.ts                  # re-exports the component and its types
```

All generator options live in `style-gen.config.json` (`theme`, `output`, `tokensOutput` and every `generate()` option); the plugin takes only `root`. Run `yarn style-gen generate` once and commit the `theme.tokens.ts` it writes.

Imports allowed inside `src/ui/<folder>/`:

| File                     | May import                                                       |
| ------------------------ | ---------------------------------------------------------------- |
| `style.ts`               | `./…`, `../../theme`, `@duydpdev/style-generator/{ui,cva,types}` |
| `types.ts`, `<Name>.tsx` | the above, plus `react`, `@duydpdev/style-generator/ui-react`    |
| `index.ts`               | `./…` only                                                       |

## 3. New component checklist

1. Pick the roles the component needs and add the missing keys to the theme JSON (with `<intent>Hover`/`on<Intent>` siblings if wanted).
2. Create `src/ui/<kebab-name>/` with `style.ts`, `types.ts`, `<Name>.tsx`, `index.ts`.
3. In `style.ts`, declare the intents as `as const satisfies readonly ColorVariant<typeof theme>[]`.
4. Build every class that names a theme key from a mapper over `tokens.*` (section 4); literals only for the cases section 4 allows, with a comment.
5. Export `<name>Tables` (`satisfies RecipeTables`) and `<name>Recipe = recipeFromTables(<name>Tables)`.
6. In `types.ts`, type `color` as `(typeof <name>Intents)[number]` and wrap the props with `Polymorphic`.
7. In `<Name>.tsx`, render `cn(<name>Recipe({ … }), className)`; `index.ts` re-exports the component and its types.
8. Run `yarn style-gen doctor` and `yarn tsc --noEmit`; after a production build, `yarn style-gen budget <css dir> --max-gzip <bytes>`.

## 4. Type contract

`theme.ts` is written once. `tokens` is imported from the generated `theme.tokens.ts`; the bundler plugin (and `style-gen generate`) rewrite it on every theme edit, so it never goes stale. Do not call `createDesignTokens` in the app:

<!-- embed: examples/plain-react/src/theme.ts -->

```ts
import { createCn } from "@duydpdev/style-generator/ui";

import themeJson from "./theme/theme.json";
import { tokens } from "./theme/theme.tokens";

/** The theme; `typeof theme` feeds `ColorVariant<typeof theme>` in the ui folders. */
export const theme = themeJson;

/** Typed token arrays, generated into `./theme/theme.tokens.ts` (commit it). */
export { tokens };

/** clsx + a tailwind-merge that knows this theme's utilities. */
export const cn = createCn(tokens);
```

- Intent lists use `ColorVariant` from `@duydpdev/style-generator/types` against `typeof theme`. Do not derive your own `ColorKey` from `tokens.colors`.
- Every class that names a theme key comes from a mapper, one per category; the class carries the **kebab-cased** key (`text16Medium` → `text-16-medium`):

  | Category       | Mapper                                                                     | Class           |
  | -------------- | -------------------------------------------------------------------------- | --------------- |
  | `colors`       | `createVariantMapper("bg", tokens.colors)` (also `text`, `border`, `ring`) | `bg-<key>`      |
  | `typography`   | `createVariantMapper("", tokens.typography)`                               | `<key>`         |
  | `borderRadius` | `createVariantMapper("rounded", tokens.borderRadius)`                      | `rounded-<key>` |
  | `fontFamily`   | `createVariantMapper("font", tokens.fontFamily)`                           | `font-<key>`    |
  | `borderWidth`  | `createVariantMapper("border", tokens.borderWidth)`                        | `border-<key>`  |
  | `shadows`      | `createVariantMapper("shadow", tokens.shadows)`                            | `shadow-<key>`  |

  Read a mapper with `mapper.<key>` (a compile-time check) or `pick(mapper, key)` (throws at import when the theme lacks the key). Never type `rounded-pill`, `font-sans` or a typography class by hand.

- A class literal that names a theme key is allowed only for a combination the generator does not emit for your options: a variant other than `hover:`/`active:` (`focus-visible:outline-<key>`), an opacity step not listed in `coverage.colors.opacities`, or a state with an opacity (`hover:bg-<key>/10`). Tailwind finds it by scanning the file. Each such table gets a one-line comment saying why. Layout utilities with no theme key (`inline-flex`, `gap-1.5`, `tabular-nums`) are plain literals.
- Theme keys are confined to one block per `style.ts`. In the example button this region is **the only part that changes with the theme**:

<!-- embed: examples/plain-react/src/ui/button/style.ts#button-preset -->

```ts
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

/** Literal classes, so Tailwind's scanner sees them: the registry emits no `focus-visible:` variant, no `/15` step and no state × opacity (`hover:bg-<key>/10`). */
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

/** The other theme keys the recipe reads: outline fill and fallback text colour, radius, type styles. */
const themeKeys = {
  background: "background",
  radius: "md",
  type: "text16Medium",
  typeLg: "text20Semibold",
} as const;
```

The component file applies the recipe through `cn` and takes `className` last:

<!-- embed: examples/plain-react/src/ui/badge/Badge.tsx -->

```tsx
import type { ElementType, JSX } from "react";

import { cn } from "../../theme";

import { badgeRecipe } from "./style";
import type { BadgeProps } from "./types";

/** `Badge`: a short label; `color` × `variant` from the badge recipe. */
export function Badge<T extends ElementType = "span">({
  as,
  color,
  variant,
  className,
  ...rest
}: BadgeProps<T>): JSX.Element {
  const Component: ElementType = as ?? "span";
  return (
    <Component
      {...rest}
      className={cn(badgeRecipe({ color, variant }), className) || undefined}
    />
  );
}
```

## 5. Forbidden in app code

- `class-variance-authority`, `clsx` or `tailwind-merge` imported directly. Use `recipeFromTables` for recipes and `cn` from `theme.ts` (`createCn(tokens)`) for merging.
- Raw Tailwind colour, radius, shadow, font or typography classes typed by hand (`className="bg-blue-500 rounded-lg"`). Add a variant to a component instead.
- Raw tags where a component exists (`div`/`section`/… → `Box`, `span`/`p`/`h1`… → `Text`, `button` → `Button`).
- Imports from another component folder, or from outside `./…`, `../../theme` and packages, inside a ui folder.
- `data-*` attributes as CSS hooks. The only data attributes the library reads are the `themeAxes` ones on `<html>`.
- Theme values (hex codes, colour functions, pixel sizes) in TypeScript. Values live in the theme JSON; code names keys.
- Keys copied from an example theme. Derive intents from the roles of the app you are building.

## 6. More

[Components](./components.md) holds the ten example components, the harness and the recipe factories; [UI kit](./reference/ui.md) documents `recipeFromTables`, `pick`, `contrastText`, `createCn` and the spacing helpers.
