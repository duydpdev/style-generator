# Getting started: Nuxt + Vue

This tutorial wires `@duydpdev/style-generator` into a Nuxt 4 app and renders a themed `Button` built from a copy-paste Vue component. Every code block below except the final `app/app.vue` is copied from [`examples/plain-nuxt`](../../examples/plain-nuxt/README.md), which is built and type-checked in CI; the example's landing-page sections (`Hero`, `Features`, ...) are not part of this tutorial.

## Install

Start from a Nuxt 4 app (`npx nuxi@latest init my-app --template minimal`, then `yarn install`). Install the package and its peer dependencies as described in [Install](../../README.md#install). The components also need `class-variance-authority`, `clsx` and `tailwind-merge`; the Vite setup below imports `@tailwindcss/vite`, and the package needs `tailwindcss` (the minimal template has neither):

```bash
yarn add @duydpdev/style-generator@^8.0.0 class-variance-authority clsx tailwind-merge tailwindcss @tailwindcss/vite
yarn add -D typescript@^5.9.0
```

`typescript` is a development dependency of the app because `@vue/compiler-sfc` reads the props type from `types.ts` through the TypeScript compiler API. Use 5.x or 6.x (the package's own peer range is `^5.0.0 || ^6.0.0`): TypeScript 7 does not provide that API, and the page then fails with `No fs option provided to compileScript`.

## Create the theme

Create `app/theme/theme.json`. The `Button` below reads the colors `primary`, `secondary`, `success`, `danger`, `background` and `foreground`, the `md` radius and the `text16Medium` and `text20Semibold` type styles, so start from this complete theme (it is `examples/plain-nuxt/app/theme/theme.json`):

<!-- embed: examples/plain-nuxt/app/theme/theme.json -->

```json
{
  "colors": {
    "primary": "#2647D9",
    "primaryHover": "#1F3BB8",
    "primaryActive": "#19319A",
    "onPrimary": "$surface",
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

`yarn style-gen init` (the [Quickstart](../../README.md#quickstart)) writes a smaller starter theme to `app/assets/css/theme.json` (with a `theme.schema.json` next to it) and a `style-gen.config.json` that points there. This tutorial keeps the theme in `app/theme/` instead: either skip `init`, or delete those two files it wrote and replace `style-gen.config.json` with the file shown below.

## Own the theme

`app/theme.ts` turns the JSON into the `theme` type and the `cn` helper, and re-exports the typed `tokens` that the plugin writes to `app/theme/theme.tokens.ts` (commit that file; `style-gen generate --check` fails in CI when it is stale):

<!-- embed: examples/plain-nuxt/app/theme.ts -->

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

Nuxt runs on Vite, so `styleGenVite` goes under `vite.plugins`. Nuxt 4 sets the Vite root to `app/`, so the plugin gets the project folder as `root` and reads `style-gen.config.json` from there; it takes no other option, so the CLI and the bundler share one configuration:

<!-- embed: examples/plain-nuxt/nuxt.config.ts#nuxt-config -->

```ts
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: false },

  // Global stylesheet entry: Tailwind v4 + the generated theme.css.
  css: ["~/assets/css/globals.css"],

  // Nuxt 4 sets the Vite root to `app/`, so `root` points at the project
  // folder that holds `style-gen.config.json`.
  vite: {
    plugins: [
      styleGenVite({ root: fileURLToPath(new URL(".", import.meta.url)) }),
      tailwindcss(),
    ],
  },

  app: {
    head: {
      title: "style-generator · Nuxt plain example",
      htmlAttrs: { lang: "en" },
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
        },
      ],
    },
  },
});
```

Save this as `style-gen.config.json` in the project folder:

<!-- embed: examples/plain-nuxt/style-gen.config.json -->

```json
{
  "theme": "app/theme/theme.json",
  "output": "app/theme/theme.css",
  "coverage": { "colors": { "opacities": [10, 20, 50, 80] } }
}
```

## Import the CSS

Import the generated file next to Tailwind. There is no `@source` line, because Tailwind scans `app/`, which holds every class literal (`app/ui` included), and `theme.css` lists the token utilities:

<!-- embed: examples/plain-nuxt/app/assets/css/globals.css#css-entry -->

```css
@import "tailwindcss";
@import "../../theme/theme.css";
```

If you ran `style-gen init`, it also wrote `.claude/rules/style-generator.md`; add `@source not "../../../.claude";` as the last line of `app/assets/css/globals.css`: that file holds example classes Tailwind would otherwise pick up ([`style-gen init`](../reference/cli.md#agent-rules)).

## Build a component

Components use one folder per component. `style.ts` is the same file as in React and Next:

<!-- embed: examples/plain-nuxt/app/ui/button/style.ts -->

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

/** The other theme keys the recipe reads: outline fill and fallback text colour, radius, type styles. */
const themeKeys = {
  background: "background",
  radius: "md",
  type: "text16Medium",
  typeLg: "text20Semibold",
} as const;

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

The Vue `types.ts` declares the props the SFC compiler can read and extends the spacing props with `/* @vue-ignore */`. Components are imported explicitly, for example `import Button from "~/ui/button/Button.vue"`:

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
import { Comment, Fragment, Text, useAttrs, type VNode } from "vue";

import { cn, tokens } from "../../theme";

import { buttonRecipe } from "./style";
import type { ButtonProps } from "./types";

type ClassValue = Parameters<typeof cn>[number];

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<ButtonProps>(), { as: "button" });
const slots = defineSlots<{
  default?: () => VNode[];
  prefix?: () => unknown;
  suffix?: () => unknown;
}>();
const attrs = useAttrs();

// Whether slot output (vnodes, a fragment's children or one entry) renders
// something. Comments (`v-if`), blank text, empty fragments and the raw
// `null`/boolean entries a render function can leave in a fragment do not.
const filled = (nodes: unknown): boolean => {
  if (Array.isArray(nodes)) return nodes.some(filled);
  if (nodes == null || typeof nodes === "boolean") return false;
  if (typeof nodes === "string") return nodes.trim() !== "";
  if (typeof nodes !== "object") return true;
  const node = nodes as VNode;
  if (node.type === Comment) return false;
  if (node.type === Fragment || node.type === Text)
    return filled(node.children);
  return true;
};

// Runs the default slot only to create its vnodes (nothing mounts), so a
// `v-if`-false or blank label counts as no label.
const hasLabel = (): boolean => filled(slots.default?.());
const hasPrefix = (): boolean => filled(slots.prefix?.());
const hasSuffix = (): boolean => filled(slots.suffix?.());

// Root attributes: defaults, the caller's attributes, then class and style.
const root = () => {
  const iconOnly = !hasLabel() && hasPrefix() !== hasSuffix();
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
        iconOnly,
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
    <!-- Icon slots are flex boxes so an inline-level icon is centred, not baseline-aligned. -->
    <!-- A slot span renders only when its content does, so the DOM matches `iconOnly`; an empty span would still take a `gap` and push the icon off centre. -->
    <!-- `empty:hidden` is the net for a child component that renders nothing, which the vnode check counts as content. -->
    <span v-if="hasPrefix()" class="flex shrink-0 items-center empty:hidden"
      ><slot name="prefix"
    /></span>
    <span v-if="hasLabel()" class="empty:hidden"><slot /></span>
    <span v-if="hasSuffix()" class="flex shrink-0 items-center empty:hidden"
      ><slot name="suffix"
    /></span>
  </component>
</template>
```

## Use it

This tutorial builds only `Button`; the landing-page sections of the example are not included. Replace `app/app.vue` with a page that uses it:

```vue
<script setup lang="ts">
import Button from "~/ui/button/Button.vue";
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center gap-3 bg-background text-foreground"
  >
    <Button>Get started</Button>
    <Button variant="soft" color="danger">Delete</Button>
  </main>
</template>
```

Run `yarn dev`: a filled primary button and a soft danger button render with the theme's colors.

## Next steps

- [Components](../components.md#plain-examples-copy-these): copy-paste components for your app.
- [Theme config](../reference/theme.md): every theme key and its rules.
- [Vite and Nuxt](../reference/vite.md): the plugin options.
