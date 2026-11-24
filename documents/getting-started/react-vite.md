# Getting started: React + Vite

This tutorial wires `@duydpdev/style-generator` into a Vite + React app and renders a themed `Button` built from a copy-paste component. Every code block below except the final `src/App.tsx` is copied from [`examples/plain-react`](../../examples/plain-react/README.md), which is built and type-checked in CI; the example's landing-page sections (`Hero`, `Features`, ...) are not part of this tutorial.

To skip the setup, copy the starter: `npx degit duydpdev/style-generator/starters/vite-react my-app`.

## Install

Start from a Vite React TypeScript app (`yarn create vite my-app --template react-ts`, then `yarn install`). Install the package and its peer dependencies as described in [Install](../../README.md#install). The components also need `class-variance-authority`, `clsx` and `tailwind-merge`; the Vite setup below also imports `tailwindcss`, `@tailwindcss/vite` and `@vitejs/plugin-react` (the template already lists the last one).

```bash
yarn add @duydpdev/style-generator@^8.0.0 class-variance-authority clsx tailwind-merge tailwindcss @tailwindcss/vite @vitejs/plugin-react
```

## Create the theme

Create `src/theme/theme.json`. The `Button` below reads the colors `primary`, `secondary`, `success`, `danger`, `background` and `foreground`, the `md` radius and the `text16Medium` and `text20Semibold` type styles, so start from this complete theme (it is `examples/plain-react/src/theme/theme.json`):

<!-- embed: examples/plain-react/src/theme/theme.json -->

```json
{
  "colors": {
    "primary": "#2647D9",
    "primaryHover": "#1F3BB8",
    "primaryActive": "#19319A",
    "primaryForeground": "$surface",
    "secondary": "#6E5BFF",
    "accent": "$secondary",
    "success": "#2E7D5B",
    "danger": "#C8462C",
    "background": "#FAF7F2",
    "surface": "#FFFFFF",
    "foreground": "#0F1530",
    "muted": "#6B6D7A",
    "line": "color-mix(in srgb, var(--sg-color-foreground) 8%, transparent)"
  },
  "typography": {
    "text12Mono": {
      "fontSize": "12px",
      "fontWeight": 400,
      "lineHeight": "150%",
      "letterSpacing": "0px"
    },
    "text14Regular": {
      "fontSize": "14px",
      "fontWeight": 400,
      "lineHeight": "150%",
      "letterSpacing": "0px"
    },
    "text16Medium": {
      "fontSize": "16px",
      "fontWeight": 500,
      "lineHeight": "150%",
      "letterSpacing": "0px"
    },
    "text20Semibold": {
      "fontSize": "20px",
      "fontWeight": 600,
      "lineHeight": "140%",
      "letterSpacing": "-0.01em"
    },
    "text32Bold": {
      "fontSize": "32px",
      "fontWeight": 700,
      "lineHeight": "120%",
      "letterSpacing": "-0.02em"
    },
    "display56Serif": {
      "fontSize": "56px",
      "fontWeight": 400,
      "lineHeight": "100%",
      "letterSpacing": "-0.025em"
    }
  },
  "shadows": {
    "sm": "0px 1px 2px rgba(15, 21, 48, 0.06), 0px 1px 1px rgba(15, 21, 48, 0.04)",
    "md": "0px 8px 24px -8px rgba(15, 21, 48, 0.12), 0px 2px 6px rgba(15, 21, 48, 0.05)",
    "lg": "0px 20px 48px -16px rgba(15, 21, 48, 0.18), 0px 4px 12px rgba(15, 21, 48, 0.06)"
  },
  "backdropBlurs": {
    "sm": "4px",
    "md": "8px",
    "lg": "14px"
  },
  "borderRadius": {
    "sm": "6px",
    "md": "10px",
    "lg": "16px",
    "pill": "999px"
  },
  "fontFamily": {
    "sans": "\"Geist\", ui-sans-serif, system-ui, -apple-system, sans-serif",
    "serif": "\"Instrument Serif\", \"Geist\", serif",
    "mono": "\"JetBrains Mono\", ui-monospace, \"SFMono-Regular\", monospace"
  },
  "borderWidth": {
    "thin": "1px",
    "thick": "2px"
  },
  "themeAxes": {
    "theme": {
      "dark": {
        "colors": {
          "primary": "#8FA6FF",
          "primaryHover": "#A9BBFF",
          "primaryActive": "#C2CEFF",
          "secondary": "#A89AFF",
          "success": "#6BBF93",
          "danger": "#F08369",
          "background": "#0B0E1D",
          "surface": "#161A2D",
          "foreground": "#F2EFE9",
          "muted": "#8A8FA8"
        },
        "shadows": {
          "sm": "0px 1px 2px rgba(0, 0, 0, 0.4)",
          "md": "0px 8px 24px -8px rgba(0, 0, 0, 0.5), 0px 2px 6px rgba(0, 0, 0, 0.3)",
          "lg": "0px 20px 48px -16px rgba(0, 0, 0, 0.6)"
        }
      }
    }
  }
}
```

`yarn style-gen init` (the [Quickstart](../../README.md#quickstart)) writes its own starter theme to `src/styles/theme.json` and a `style-gen.config.json` that points there. This tutorial keeps the theme in `src/theme/` instead: either skip `init`, or delete the `src/styles/` folder it wrote and replace `style-gen.config.json` with the file shown below.

## Own the theme

`src/theme.ts` turns the JSON into the `theme` type and the `cn` helper, and re-exports the typed `tokens` that the plugin writes to `src/theme/theme.tokens.ts` (commit that file; `style-gen generate --check` fails in CI when it is stale):

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

## Generate theme.css with the Vite plugin

`styleGenVite()` takes no generator options: it reads `style-gen.config.json` at the project root, the same file `style-gen generate` reads. It writes `src/theme/theme.css` and `src/theme/theme.tokens.ts` when the dev server or a build starts and whenever the theme file or the config changes:

<!-- embed: examples/plain-react/vite.config.ts#vite-config -->

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

// Theme, output and generator options live in style-gen.config.json.
export default defineConfig({
  plugins: [react(), styleGenVite(), tailwindcss()],
});
```

<!-- embed: examples/plain-react/style-gen.config.json -->

```json
{
  "theme": "src/theme/theme.json",
  "output": "src/theme/theme.css",
  "coverage": { "colors": { "opacities": [10, 20, 50, 80] } }
}
```

The plugin writes those two files only when the dev server or a build starts, but `src/theme.ts` imports `./theme/theme.tokens`, and the Vite template's `build` script runs `tsc -b` before Vite starts. Run `yarn style-gen generate` once (or start `yarn dev`) before the first `yarn build` or type check, otherwise it fails with `Cannot find module './theme/theme.tokens'`.

## Import the CSS

Replace the contents of `src/index.css` (the one `src/main.tsx` imports) with the generated file imported next to Tailwind. No `@source` line is needed: Tailwind scans `src/`, `src/ui` included:

<!-- embed: examples/plain-react/src/index.css#css-entry -->

```css
@import "tailwindcss";
@import "./theme/theme.css";
```

If you ran `style-gen init`, it also wrote `.claude/rules/style-generator.md`; add `@source not "../.claude";` as the last line of `src/index.css`: that file holds example classes Tailwind would otherwise pick up ([`style-gen init`](../reference/cli.md#agent-rules)).

## Build a component

Components use one folder per component. `style.ts` holds the style tables, and `Button.tsx` uses no hook:

<!-- embed: examples/plain-react/src/ui/button/style.ts -->

```ts
import {
  COLOR_STATES,
  createVariantMapper,
} from "@duydpdev/style-generator/cva";
import type {
  ColorVariant,
  RoundedVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";
import {
  contrastText,
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

const BUTTON_TINTS = ["outline", "soft", "ghost", "link"] as const;

type ButtonTint = (typeof BUTTON_TINTS)[number];

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

/** The other theme keys the recipe reads: outline fill and fallback text colour, radius, type styles. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  background: "background",
  radius: "md",
  type: "text16Medium",
  typeLg: "text20Semibold",
} as const satisfies {
  background: ColorVariant<typeof theme>;
  radius: RoundedVariant<typeof theme>;
  type: TextVariant<typeof theme>;
  typeLg: TextVariant<typeof theme>;
};

export type ButtonIntent = (typeof buttonIntents)[number];

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
    contrastText(colors, intent, themeKeys.background),
  ];
  if (!colors.includes(`${intent}Hover`)) classes.push("hover:opacity-90");
  return classes;
};

/** Button as data: variant × intent × size. */
export const buttonTables = {
  base: [
    "inline-flex shrink-0 items-center justify-center gap-1.5",
    `${pick(rounded, themeKeys.radius)} border`,
    `cursor-pointer ${pick(type, themeKeys.type)} whitespace-nowrap outline-hidden select-none`,
    "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2",
    "transition-[background-color,color,opacity] duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  variants: {
    variant: {
      fill: "border-transparent active:scale-[0.98]",
      outline: `${pick(bg, themeKeys.background)} active:scale-[0.98]`,
      soft: "border-transparent active:scale-[0.98]",
      ghost: "border-transparent active:scale-[0.98]",
      link: "border-transparent underline-offset-4 hover:underline",
    },
    color: focusRing,
    size: {
      sm: "h-7 px-2.5",
      md: "h-9 px-3.5",
      lg: `h-11 px-5 ${pick(type, themeKeys.typeLg)}`,
    },
    // Set by the components when there is no label and exactly one icon slot.
    // `px-0` must beat the size's `px-*`: the components pass the recipe through `cn` (tailwind-merge), which keeps the later class, so `iconOnly` stays after `size`.
    iconOnly: { true: "aspect-square px-0" },
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

export const buttonRecipe = recipeFromTables(buttonTables);
```

`types.ts` holds the prop types:

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

`Button.tsx` is the component:

<!-- embed: examples/plain-react/src/ui/button/Button.tsx -->

```tsx
import { mergeStyle, splitSpacing } from "@duydpdev/style-generator/ui";
import {
  Fragment,
  isValidElement,
  type ElementType,
  type JSX,
  type ReactNode,
} from "react";

import { cn, tokens } from "../../theme";

import { buttonRecipe } from "./style";
import type { ButtonProps } from "./types";

/**
 * An icon slot is a flex box so an inline-level icon (an inline-block wrapper,
 * `<iconify-icon>`) is centred instead of sitting on the 24px line box's baseline.
 * `empty:hidden` drops a slot whose content rendered nothing, so it takes no `gap`.
 */
const ICON_SLOT = "flex shrink-0 items-center empty:hidden";

/**
 * Whether a slot renders something, matching `Button.vue`: not `null`/`undefined`, a
 * boolean (`{open && "Label"}`), blank text, or an array/fragment holding only such entries.
 */
const present = (node: ReactNode): boolean => {
  if (Array.isArray(node)) return node.some(present);
  if (node == null || typeof node === "boolean") return false;
  if (typeof node === "string") return node.trim() !== "";
  if (isValidElement<{ children?: ReactNode }>(node) && node.type === Fragment)
    return present(node.props.children);
  return true;
};

/**
 * `Button`: variant × intent × size; a `<button>` gets `type="button"` unless one is passed.
 * An icon-only button passes the icon as `prefix` (or `suffix`) with no label and an `aria-label`:
 * no label span is rendered, so `gap` cannot push the icon off centre, and the button is square.
 */
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
  const iconOnly = !present(children) && present(prefix) !== present(suffix);
  return (
    <Component
      type={Component === "button" ? "button" : undefined}
      {...split.rest}
      className={
        cn(
          buttonRecipe({ variant, color, size, iconOnly }),
          split.className,
          className,
        ) || undefined
      }
      style={mergeStyle(split.style, style)}
    >
      {present(prefix) && <span className={ICON_SLOT}>{prefix}</span>}
      {present(children) && <span className="empty:hidden">{children}</span>}
      {present(suffix) && <span className={ICON_SLOT}>{suffix}</span>}
    </Component>
  );
}
```

`index.ts` is the folder's public entry:

<!-- embed: examples/plain-react/src/ui/button/index.ts -->

```ts
export { Button } from "./Button";
export type { ButtonOwnProps, ButtonProps } from "./types";
```

## Use it

This tutorial builds only `Button`; the landing-page sections of the example are not included. Replace `src/App.tsx` (the template's `src/main.tsx` already imports it and `./index.css`) with a page that uses it:

<!-- snippet: no-check imports ./ui/button from the app being built -->

```tsx
import { Button } from "./ui/button";

export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center gap-3 bg-background text-foreground">
      <Button>Get started</Button>
      <Button variant="soft" color="danger">
        Delete
      </Button>
    </main>
  );
}
```

Run `yarn dev`: a filled primary button and a soft danger button render with the theme's colors.

## Next steps

- [Components](../components.md#plain-examples-copy-these): copy-paste components for your app.
- [Theme config](../reference/theme.md): every theme key and its rules.
- [Vite and Nuxt](../reference/vite.md): the plugin options.
