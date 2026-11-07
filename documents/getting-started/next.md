# Getting started: Next.js

This tutorial wires `@duydpdev/style-generator` into Next.js (webpack or Turbopack) and builds a landing page from copy-paste components. The theme, `Button` style, `Button` component and theme switch are embedded from [`examples/plain-react`](../../examples/plain-react/README.md), whose copies are identical; the Next.js specific file (the config) is shown as a standalone snippet, and there is no runnable Next.js example folder.

## Install

Install the package and its peer dependencies as described in [Install](../../README.md#install). The components also need `class-variance-authority`, `clsx` and `tailwind-merge`. See [Install](../../README.md#install) for configuring the `@duydpdev` scope registry and the GitHub Personal Access Token.

```bash
yarn add @duydpdev/style-generator@^5.4.0 class-variance-authority clsx tailwind-merge
```

## Own the theme

The theme JSON is `src/theme/theme.json` (not shown here). `src/theme.ts` turns it into typed tokens and the `cn` helper, using the `options` literal of `src/options.ts`. That module imports no JSON, so `next.config.ts` can import it without reloading the config on every theme edit:

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

## Generate theme.css with the Next.js wrapper

`styleGenNext` writes `src/theme/theme.css` when `next dev` or `next build` loads the config; a theme inside the app needs no `transpilePackages`.

<!-- snippet: no-check imports ./src/options, the tutorial's own options module, which is not a checker fixture -->

```ts
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";
import { options } from "./src/options";

const nextConfig: NextConfig = {};

// Next.js runs on Turbopack/webpack (no Vite), so the Vite-only `styleGenVite`
// plugin does not apply. `styleGenNext` does not import `next`, so it works
// under both bundlers. It writes `src/theme/theme.css` when Next loads this
// config in `phase-development-server` (`next dev`, which also watches the
// theme JSON) or `phase-production-build` (`next build`). `options` comes from
// `src/options.ts`, which imports no JSON (a theme edit must not reload this
// config) and types the tokens with the same object; the `generate` CLI reads
// the same steps from `style-gen.config.json`.
export default styleGenNext({
  themePath: "src/theme/theme.json",
  outDir: "src/theme",
  options,
})(nextConfig);
```

## Import the CSS

Import the generated file next to Tailwind. No `@source` line is needed: Tailwind scans `src/`, and `theme.css` lists every token utility in `@source inline(...)`.

```css
@import "tailwindcss";
@import "../theme/theme.css";
```

## Build a component

Components use one folder per component. `style.ts` holds the style tables, and `Button.tsx` has no `'use client'` because it uses no hook, allowing it to render in server components:

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

## Compose the page

`src/app/page.tsx` is a server component that returns `<App />` from `src/App.tsx` (the same file as [`examples/plain-react/src/App.tsx`](../../examples/plain-react/src/App.tsx)); only `ThemeSwitch` is a client component.

## Switch to dark

`themeAxisAttributes` from `@duydpdev/style-generator/recipes` manages the `data-*` attributes on `<html>`. A client component applies the attributes after hydration. In Next.js the file starts with `"use client";`; the rest is `examples/plain-react/src/ThemeSwitch.tsx` unchanged:

<!-- embed: examples/plain-react/src/ThemeSwitch.tsx -->

```tsx
import { themeAxisAttributes } from "@duydpdev/style-generator/recipes";
import { useEffect, useState } from "react";
import type { JSX } from "react";

import type { theme } from "./theme";
import { Button } from "./ui/button";

/** `{ "data-theme": "dark" }`; the light theme is the base theme (no attribute). */
const DARK = themeAxisAttributes<typeof theme>({ theme: "dark" });

/** Light/dark toggle: sets or removes the `theme` axis attribute on `<html>`. */
export function ThemeSwitch(): JSX.Element {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(DARK)) {
      if (dark) root.setAttribute(name, value);
      else root.removeAttribute(name);
    }
  }, [dark]);

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={dark}
      onClick={() => {
        setDark((on) => !on);
      }}
    >
      Dark mode
    </Button>
  );
}
```

## Next steps

- [Components](../components.md#plain-examples-copy-these): copy-paste components for your app.
- [Theme config](../reference/theme.md): every theme key and its rules.
- [Next.js](../reference/next.md): the wrapper options.
