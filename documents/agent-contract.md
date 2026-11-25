# Agent contract

The rules an agent (or a person) follows to write a theme and components with `@duydpdev/style-generator` in an app. They hold for **any** theme: no colour, size or key in this file is a value to copy. The keys in the code below (`primary`, `background`, `text16Medium` …) belong to the example theme; your app uses the keys of its own theme JSON.

`style-gen init` writes this file to `.claude/rules/style-generator.md`. Everything not covered here is in [Components](./components.md) and the [Theme config](./reference/theme.md) reference.

## 1. Role contract (theme shape, not theme names)

Name the semantic keys after the app's own roles; name primitive colours and typography after their values (see [Naming convention](#naming-convention)). The library derives every type and class from the keys you write; it never expects a particular name.

- `colors` is required and **flat camelCase**: `brand`, `brandHover`, `surfaceRaised`. No nested object, no `DEFAULT`, no `_`, no leading run of two or more capitals (`CTA`, `HTMLText`); a single capital or an inner run (`primaryCTA`) is fine. The schema rejects the rest.
- An intent may declare state siblings `<intent>Hover`, `<intent>Active` and `<intent>Selected`. `createVariantMapper("bg", tokens.colors, { states: COLOR_STATES })` (`COLOR_STATES` from `@duydpdev/style-generator/cva`) turns `brand` into `bg-brand hover:bg-brand-hover active:bg-brand-active aria-selected:bg-brand-selected` when they exist and into `bg-brand` when they do not.
- An intent may declare a `<intent>Foreground` text colour (`brand` → `brandForeground`). `contrastText(tokens.colors, intent, fallback)` returns `text-brand-foreground` when it exists, else `text-<fallback>`. `contrastText` does not read an `on<Intent>` key; `style-gen doctor` names the `<intent>Foreground` rename for each one.
- A value `"$<key>"` aliases another key **of the same category** (`"brandHover": "$brandActive"` in `colors`). Not in `typography`. Unknown targets and cycles are schema errors.
- Dark mode and palettes go in `themeAxes.<axis>.<variant>`; an override may only redefine keys that exist in the base category. Activation is `html[data-<axis>="<variant>"]` (use `themeAxisAttributes` from `@duydpdev/style-generator/recipes`). `base` is reserved as a variant name.
- Every other category (`typography`, `shadows`, `borderRadius`, `borderWidth`, `fontFamily`, `backdropBlurs`) is optional and follows the same key grammar. Typography entries need `fontSize`, `lineHeight` and a numeric `fontWeight`.
- Avoid keys whose class equals a Tailwind utility (`none` → `bg-none`, typography `textSm` → `text-sm`, `h1` → `h-1`). `style-gen doctor` warns; rename to `clear`, `flat`, or a value-named typography key such as `text32Bold`.
- `style-gen init` writes a starter theme that already follows the [Naming convention](#naming-convention): gray, blue, red, green and amber primitives, the semantic core aliasing them, and value-named typography. Its keys are a shape to start from and its values are placeholders: rename or add semantic keys after the app's roles and set every value for this app; a starter value left as it is is a copy, not a choice.

Each rule above is enforced by the theme schema (`generate()`, `style-gen generate`, the Vite/Next plugins) or reported by `style-gen doctor`. Keep `"$schema"` pointing at the generated `theme.schema.json` for editor validation.

**One theme per UI set.** Every UI set — an app, a design canvas, a design-system artifact — has its own `theme.json` in the product's repository, with semantic keys named after that product's roles. A design system or a canvas is built from that theme and declares no token values of its own. No tool enforces this; it is a review rule.

### Naming convention

This convention applies to new themes and new design canvases. Never rename a key an existing app already uses to follow it: every class literal that uses the old key would stop matching. The library accepts any key that passes the schema; the convention is a recommendation, not a schema rule.

- Colours come in two layers: primitives hold every literal value, semantic keys point at primitives.
- A primitive key is a hue and a step, or `black`/`white`: it matches `^(?:[a-z]+(?:50|[1-9]00|950)|black|white)(?:Alpha[1-9]\d?)?$` (`blue600`, `gray50`, `white`; `gray150` is not one). Its value is a literal, never `$…`. The hue is lowercase letters only; the steps are 50, 100 to 900 and 950, and a scale may skip steps.
- A translucent colour is a primitive with an alpha suffix in percent (1–99): `blue600Alpha10: "rgba(37, 99, 235, 0.10)"`.
- A semantic colour may also alias `"$<primitive>/<n>"` (`<n>` an integer percent, 1–100): `border: "$navy700/8"` emits `color-mix(in srgb, var(--sg-color-navy-700) 8%, transparent)`. It is an additional form next to the alpha suffix above, and it still aliases a primitive; the alpha keys stay valid.
- Every other colour key is semantic. Its value is `"$<primitive>"` in the base `colors` and in every `themeAxes` override that redefines it; a semantic key never aliases another semantic key, and an override never redefines a primitive.

Semantic core: `background`, `foreground`, `surface`, `muted`, `mutedForeground`, `border`, `focus`, `scrim`, `primary`, `primaryForeground`, `primaryHover`, `primaryActive`, `danger`, `success`, `warning`.
`muted` is a quiet fill and `mutedForeground` the secondary text on it (and on `background`), like every `<intent>`/`<intent>Foreground` pair.
Product keys (`domainNutrition`) sit beside them.

- A semantic key is a neutral key (`background`, `foreground`, `surface`, `surfaceRaised`, `muted`, `mutedForeground`, `border`, `borderStrong`, `focus`, `scrim`) or `<role>[Subtle][Border][Foreground][Hover|Active|Selected]`: a core or product role, then the suffixes in that order, then at most one state, always last. `primaryForegroundHover` is the hover sibling of `primaryForeground`; `successSubtleForeground` is the text on a `successSubtle` fill. A product role is camelCase with one capital per segment (`domainNutrition`, not `primaryCTA`). Its first segment is not `on`, `ok`, `bad`, `warn` or `line`, and a role of several segments does not end in a suffix, a state, `Ink`, `Soft`, `Line`, `Ok`, `Bad` or `Warn` (`chartLine` reads as a v1 name).
- `style-gen canvas check --naming` reports the v1 names with their v2 rename: `on<Role>` → `<role>Foreground`, `…Ink` → `…Foreground`, `…Soft` → `…Subtle`, `…Line` → `…Border`, `ok`/`bad`/`warn` → `success`/`danger`/`warning`, `line`/`lineStrong` → `border`/`borderStrong`. When the new name already exists, it says `merge manually` instead.

- A typography key is `text<size><Weight>`: it matches `^text(\d{2,3})(Regular|Medium|Semibold|Bold)$`. The digits are `fontSize` in px (a rem value counts as rem × 16) and the word is `fontWeight` 400/500/600/700. Every key with the same size has the same `lineHeight`. The scale is 12, 14, 16, 20, 24, 32, 40, 56.
- A typography entry never sets `fontFamily`. A different face is the `font-<fontFamily key>` class next to the typography class: `class="text-56-regular font-display"`.
- Radius keys are `sm`, `md`, `lg`, `xl` and `full`. The list is closed; a theme may declare any subset of it, and xl is for large surfaces (device frames, sheets, panels).

<!-- prettier-ignore -->
```json
{
  "colors": {
    "blue400": "#60a5fa",
    "blue600": "#2563eb",
    "blue600Alpha10": "rgba(37, 99, 235, 0.10)",
    "primary": "$blue600",
    "primaryHover": "$blue400",
    "scrim": "$blue600Alpha10"
  },
  "themeAxes": {
    "theme": { "dark": { "colors": { "primary": "$blue400" } } }
  },
  "typography": {
    "text16Regular": { "fontSize": "16px", "lineHeight": "24px", "fontWeight": 400 },
    "text32Bold": { "fontSize": "32px", "lineHeight": "40px", "fontWeight": 700 }
  }
}
```

Components and artboards use semantic keys only. Every colour key has a class by default; `coverage: { colors: { keys: "aliased" } }` in `style-gen.config.json` (recommended) drops the generated coverage of the primitives, so only the semantic keys are always built. Add `resetTailwindDefaults: ["colors"]` only for a new app that uses no Tailwind palette classes: it removes Tailwind's palette, so an existing `bg-red-500` stops being emitted.

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

All generator options live in `style-gen.config.json` (`theme`, `output`, `tokensOutput` and every `generate()` option); the plugin takes only `root`. Run `style-gen generate` once through the project's package manager (`yarn style-gen generate`, `npm exec --no -- style-gen generate`) and commit the `theme.tokens.ts` it writes.

Imports allowed inside `src/ui/<folder>/`:

| File                     | May import                                                       |
| ------------------------ | ---------------------------------------------------------------- |
| `style.ts`               | `./…`, `../../theme`, `@duydpdev/style-generator/{ui,cva,types}` |
| `types.ts`, `<Name>.tsx` | the above, plus `react`, `@duydpdev/style-generator/ui-react`    |
| `index.ts`               | `./…` only                                                       |

## 3. New component checklist

A component declares the axes that apply to it (a checkbox has `color` and `size`, a field has none); for these three axes it uses only this vocabulary:

<!-- component-axes:start -->

| Axis      | Values                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------ |
| `color`   | a role key: `primary`, `secondary`, `accent`, `danger`, `success`, `warning`, `info` or a product role |
| `variant` | `solid`, `soft`, `outline`, `ghost`, `link`                                                            |
| `size`    | `sm`, `md`, `lg`, `icon`                                                                               |

<!-- component-axes:end -->

- `solid` fills with `<role>` and `<role>Foreground` text (`background` text when the theme has no `<role>Foreground`); `soft` fills with `<role>Subtle` and `<role>SubtleForeground` text and dims on hover (`hover:opacity-90`); `outline` is a `<role>` border and text on the `background` fill, with a `<role>Subtle` hover fill; `ghost` is `<role>` text with a `<role>Subtle` hover fill; `link` is `<role>` text, underlined on hover.
- `size` sets the height from `controlHeight` (`h-control-<key>`) on a single-line control (button, input, select, slider, a pagination button), and an avatar is a square of that height; a checkbox, radio or switch takes its box from `iconSize` (`size-icon-<key>`), and a multi-line field (textarea) changes only its padding and type style. An indicator follows the same split: a spinner takes its box from `iconSize`, and a progress track sets only its own thickness (`h-1`/`h-2`/`h-3`). `icon` is a square at the `md` height; only button-like components declare it.
- States: hover and active come from the `<role>Hover`/`<role>Active` keys through `COLOR_STATES` (`hover:opacity-90` without them); focus is a `focus-visible:` outline (a border on a field) in the `focus` key; disabled is `disabled:opacity-disabled` (the `opacity.disabled` token) with `cursor-not-allowed`; selected is `<role>Selected` through `COLOR_STATES` (`aria-selected:`) where the component has a selected state (a tab), and every other component that maps that role through `COLOR_STATES` (a solid button, a link) also carries the `aria-selected:` class, which matches nothing until an element sets `aria-selected="true"`; invalid is `aria-invalid:` with the `danger` role on a form field.
- Anatomy slots are named `prefix`, `suffix`, `label`, `hint` and `error`; a component has the ones it needs (Button: `prefix`, `suffix`; a field: `label`, `hint`, `error`). A component that styles several elements of its own names the extra slots after the element: `root` for the field's wrapper, `track` and `thumb` for a switch.
- Overlays sit on two `zIndex` keys: `z-overlay` for a scrim, `z-modal` for every panel (dialog, drawer, popover, tooltip, menu). Panels share one layer, so the one rendered later stacks on top: a menu the app renders after a dialog panel (a portal at the end of `body`) opens above it. A panel enters with a `starting:` transition timed by the `motionDuration`/`motionEasing` keys and stops under `motion-reduce:`; a scrim fills with the `scrim` key, or with the `background` colour at an opacity step in a theme without one, and blurs with a `backdropBlurs` key. The parts carry roles and classes, and the menu also moves the focus between its enabled items (ArrowUp, ArrowDown, Home, End); opening and closing, focus trapping and return, `Escape`, positioning and portals belong to the app.

<!-- component-rules:end -->

1. Pick the roles the component needs and add the missing keys to the theme JSON (with `<intent>Hover`/`<intent>Foreground` siblings if wanted, and `<intent>Subtle`/`<intent>SubtleForeground` when the component has a `soft` variant).
2. Create `src/ui/<kebab-name>/` with `style.ts`, `types.ts`, `<Name>.tsx`, `index.ts`.
3. In `style.ts`, declare the intents as `as const satisfies readonly ColorVariant<typeof theme>[]`.
4. Build every class that names a theme key from a mapper over `tokens.*` (section 4); literals only for the cases section 4 allows, with a comment.
5. Export `<name>Tables` (`satisfies RecipeTables`) and `<name>Recipe = recipeFromTables(<name>Tables)`.
6. In `types.ts`, type `color` as `(typeof <name>Intents)[number]` and wrap the props with `Polymorphic`.
7. In `<Name>.tsx`, render `cn(<name>Recipe({ … }), className)`; `index.ts` re-exports the component and its types.
8. Run `style-gen doctor` and `tsc --noEmit` through the project's package manager (`yarn style-gen doctor`, `npm exec --no -- style-gen doctor`); after a production build, `style-gen budget <css dir> --max-gzip <bytes>`.

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

  | Category         | Mapper                                                                     | Class                 |
  | ---------------- | -------------------------------------------------------------------------- | --------------------- |
  | `colors`         | `createVariantMapper("bg", tokens.colors)` (also `text`, `border`, `ring`) | `bg-<key>`            |
  | `typography`     | `createVariantMapper("", tokens.typography)`                               | `<key>`               |
  | `borderRadius`   | `createVariantMapper("rounded", tokens.borderRadius)`                      | `rounded-<key>`       |
  | `fontFamily`     | `createVariantMapper("font", tokens.fontFamily)`                           | `font-<key>`          |
  | `borderWidth`    | `createVariantMapper("border", tokens.borderWidth)`                        | `border-<key>`        |
  | `shadows`        | `createVariantMapper("shadow", tokens.shadows)`                            | `shadow-<key>`        |
  | `controlHeight`  | `createVariantMapper("h-control", tokens.controlHeight)`                   | `h-control-<key>`     |
  | `iconSize`       | `createVariantMapper("size-icon", tokens.iconSize)`                        | `size-icon-<key>`     |
  | `zIndex`         | `createVariantMapper("z", tokens.zIndex)`                                  | `z-<key>`             |
  | `motionDuration` | `createVariantMapper("duration", tokens.motionDuration)`                   | `duration-<key>`      |
  | `motionEasing`   | `createVariantMapper("ease", tokens.motionEasing)`                         | `ease-<key>`          |
  | `backdropBlurs`  | `createVariantMapper("backdrop-blur", tokens.backdropBlurs)`               | `backdrop-blur-<key>` |

  Read a mapper with `mapper.<key>` (a compile-time check) or `pick(mapper, key)` (throws at import when the theme lacks the key). Never type `rounded-pill`, `font-sans` or a typography class by hand.

- The generator emits a state variant only on the matching state key (`hover:bg-<key>-hover`, `active:bg-<key>-active`, `aria-selected:bg-<key>-selected`). Any other variant and theme key pair is a class literal that Tailwind finds by scanning the file: another variant (`focus-visible:outline-<key>`, `disabled:opacity-<key>`, `aria-invalid:border-<key>`), a state variant on a key that is not that state's sibling (`hover:bg-<intent>-subtle`), an opacity step not listed in `coverage.colors.opacities`, or a state with an opacity (`hover:bg-<key>/10`). Key each such literal by the theme key it names and check it with `satisfies`, so a key that leaves the theme fails the compiler; each such table gets a one-line comment saying why. Layout utilities with no theme key (`inline-flex`, `gap-1.5`, `tabular-nums`) are plain literals.
- Theme keys written by hand (key lists and literal classes) sit in one block per `style.ts`, checked with `satisfies`; a `mapper.<key>` read elsewhere is checked by the compiler on its own. In the example button this region is **the only part that changes with the theme**:

<!-- embed: examples/plain-react/src/ui/button/style.ts#button-preset -->

```ts
/**
 * The intents `color` offers. `satisfies` is the DX anchor: rename or
 * remove one of these colors in theme.json and the compiler fails here.
 * Each needs `<intent>Subtle` and `<intent>SubtleForeground` for `soft`.
 */
export const buttonIntents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<typeof theme>[];

/** Literal classes, so Tailwind's scanner sees them: the registry emits no `hover:` variant of a `Subtle` key. */
const hoverTint = {
  primary: "hover:bg-primary-subtle",
  secondary: "hover:bg-secondary-subtle",
  success: "hover:bg-success-subtle",
  danger: "hover:bg-danger-subtle",
} as const satisfies Record<ButtonIntent, string>;

/** Literal classes keyed by the theme key they name: the generator emits no `focus-visible:`/`disabled:` variant of a theme key, so Tailwind finds these by scanning this file. `satisfies` fails when a key leaves the theme. */
const stateClasses = {
  focus: { focus: "focus-visible:outline-focus" },
  disabled: { disabled: "disabled:opacity-disabled" },
} as const satisfies {
  focus: Partial<Record<ColorVariant<typeof theme>, string>>;
  disabled: Partial<Record<keyof (typeof theme)["opacity"], string>>;
};

/** The other theme keys the recipe reads: outline fill and fallback text colour, radius, type styles, one `controlHeight` key per size. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  background: "background",
  radius: "md",
  type: "text16Medium",
  typeLg: "text20Semibold",
  height: { sm: "sm", md: "md", lg: "lg" },
} as const satisfies {
  background: ColorVariant<typeof theme>;
  radius: RoundedVariant<typeof theme>;
  type: TextVariant<typeof theme>;
  typeLg: TextVariant<typeof theme>;
  height: Record<"sm" | "md" | "lg", keyof (typeof theme)["controlHeight"]>;
};
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
- A second token namespace beside `--sg-*`: custom properties (such as `--app-ink`) that hold colour, radius, shadow, font or type values. Layout sizes that no theme category covers (a sidebar width) are not tokens.
- A `font-size` or `font` shorthand written outside a typography key — inline, in CSS or on a canvas.

## 6. Interface floor (any theme)

A theme sets the look; these limits hold under every theme and every `themeAxes` variant. Each one is a number or a state you can measure, not a matter of taste.

- Text reaches 4.5:1 against the surface it sits on, 3:1 when it is 24px or larger (or about 19px bold), in every variant of every axis (WCAG 1.4.3). Check the pairs your components actually render, not only `foreground` on `background`.
- Control borders, focus outlines and icons that carry meaning reach 3:1 against their surroundings (WCAG 1.4.11).
- Every interactive element shows a visible focus state for keyboard users: a `focus-visible:` outline in a theme colour, never `outline: none` alone (WCAG 2.4.7).
- A pointer target is at least 24×24 CSS px (WCAG 2.5.8) and 44×44 on touch screens. Grow the hit area with padding, not the icon.
- Colour is never the only signal: an error, a status or a selected state also has a word, an icon or a shape (WCAG 1.4.1).
- Motion that is not essential stops under `prefers-reduced-motion` (`motion-reduce:` variants).
- An icon inside a component goes in that component's icon slot (`Button`'s `prefix`/`suffix`), never in the children beside the label and never pushed with a margin: the slot centres it, a label line puts it on the text baseline. An icon-only button has no children and an `aria-label`; the slot makes it square.
- One icon set, one stroke width and one declared size scale by role (for example 12 for chevrons, 16 beside text, 20 for icon-only touch controls, 24 for illustrations). No emoji or pictograph stands in for an icon.

## 7. More

Which rules a tool enforces, and where:

| Level      | What                                                                                                                                          | Where it runs                                    |
| :--------- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------- |
| Hard       | The theme schema: key names, aliases, `themeAxes` overrides, collisions                                                                       | Every `generate()`, `style-gen generate`, plugin |
| Opt-in     | `style-gen canvas check`: one theme per canvas, plus `--naming`, `--boards` (with `--recipes <file>`), `--stamp`, `--intents`, `--ds-version` | Only when it is called (a script, CI)            |
| Convention | Everything else in this contract (layout, component checklist, forbidden app code, interface floor)                                           | Review                                           |

[Components](./components.md) holds the example components, the harness and the recipe factories; [UI kit](./reference/ui.md) documents `recipeFromTables`, `pick`, `contrastText`, `createCn` and the spacing helpers.
