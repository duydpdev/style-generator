# Getting started: Nuxt + Vue

This tutorial wires `@duydpdev/style-generator` into a Nuxt 4 app and builds a landing page from copy-paste Vue components. Every code block below is copied from [`examples/plain-nuxt`](../../examples/plain-nuxt/README.md), which is built and type-checked in CI.

## Install

Install the package and its peer dependencies as described in [Install](../../README.md#install). The components also need `class-variance-authority`, `clsx` and `tailwind-merge`.

```bash
yarn add @duydpdev/style-generator@^8.0.0 class-variance-authority clsx tailwind-merge
```

## Own the theme

The theme JSON is [`app/theme/theme.json`](../../examples/plain-nuxt/app/theme/theme.json) (not embedded here). `app/theme.ts` turns it into the `theme` type and the `cn` helper, and re-exports the typed `tokens` that the plugin writes to `app/theme/theme.tokens.ts` (commit that file; `style-gen generate --check` fails in CI when it is stale):

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

## Import the CSS

Import the generated file next to Tailwind. There is no `@source` line, because Tailwind scans `app/`, which holds every class literal (`app/ui` included), and `theme.css` lists the token utilities:

<!-- embed: examples/plain-nuxt/app/assets/css/globals.css#css-entry -->

```css
@import "tailwindcss";
@import "../../theme/theme.css";
```

If `style-gen init` wrote `.claude/rules/style-generator.md`, also add the `@source not "<path>/.claude";` line it printed: that file holds example classes Tailwind would otherwise pick up ([`style-gen init`](../reference/cli.md#agent-rules)).

## Build a component

Components use one folder per component. `style.ts` is the same file as in React and Next. The Vue `types.ts` declares the props the SFC compiler can read and extends the spacing props with `/* @vue-ignore */`. Components are imported explicitly, for example `import Button from "~/ui/button/Button.vue"`:

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

## Use them

<!-- embed: examples/plain-nuxt/app/pages/index.vue#usage -->

```vue
<template>
  <Box backgroundColor="background" class="min-h-screen text-foreground">
    <Box
      as="header"
      position="sticky"
      backdropBlur="md"
      borderB="thin"
      borderColor="line"
      class="top-0 z-10 bg-background/80"
    >
      <Container>
        <Flex align="center" justify="between" :gap="4" :py="4">
          <Link href="#hero" tone="foreground" underline="none">
            <Text as="span" type="text16Medium">style-generator</Text>
          </Link>
          <Flex as="nav" aria-label="Main" align="center" :gap="4">
            <Link href="#features" tone="muted">Features</Link>
            <Link href="#pricing" tone="muted">Pricing</Link>
            <Link :href="DOCS_URL" tone="muted">Docs</Link>
            <ThemeSwitch />
          </Flex>
        </Flex>
      </Container>
    </Box>
    <main>
      <Hero />
      <Features />
      <Pricing />
      <Cta />
    </main>
    <Footer />
  </Box>
</template>
```

## Next steps

- [Components](../components.md#plain-examples-copy-these): copy-paste components for your app.
- [Theme config](../reference/theme.md): every theme key and its rules.
- [Vite and Nuxt](../reference/vite.md): the plugin options.
