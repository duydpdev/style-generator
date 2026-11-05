# Getting started: Nuxt + Vue

This tutorial wires `@duydpdev/style-generator` into a Nuxt 4 app and builds a landing page from copy-paste Vue components. Every code block below is copied from [`examples/plain-nuxt`](../../examples/plain-nuxt/README.md), which is built and type-checked in CI.

## Install

Install the package and its peer dependencies as described in [Install](../../README.md#install). The components also need `class-variance-authority`, `clsx` and `tailwind-merge`. See [Install](../../README.md#install) for configuring the `@duydpdev` scope registry and the GitHub Personal Access Token.

```bash
yarn add @duydpdev/style-generator@^5.4.0 class-variance-authority clsx tailwind-merge
```

## Own the theme

The theme JSON is [`app/theme/theme.json`](../../examples/plain-nuxt/app/theme/theme.json) (not embedded here). `app/theme.ts` turns it into typed tokens and the `cn` helper, using the `options` literal of `app/options.ts`. That module imports no JSON, so `nuxt.config.ts` can import it without restarting the server on every theme edit:

<!-- embed: examples/plain-nuxt/app/theme.ts -->

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

## Generate theme.css with the Vite plugin

Nuxt runs on Vite, so `styleGenVite` goes under `vite.plugins`. Nuxt 4 sets the Vite root to `app/`, so the paths are absolute. The plugin takes the same `options` literal that `app/options.ts` exports and `app/theme.ts` passes to `createDesignTokens`; `style-gen.config.json` repeats it for the `generate` CLI (`check:plain-ui` keeps the two equal):

<!-- embed: examples/plain-nuxt/nuxt.config.ts#nuxt-config -->

```ts
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "./app/options";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: false },

  // Global stylesheet entry: Tailwind v4 + the generated theme.css.
  css: ["~/assets/css/globals.css"],

  // Nuxt runs on Vite, so styleGenVite works as in plain-react. Nuxt 4 sets
  // the Vite `root` to `app/`, so the paths are absolute. `options` comes
  // from `app/options.ts`, which imports no JSON (a theme edit must not
  // restart the server) and types the tokens with the same object; the
  // `generate:theme` CLI reads the same steps from `style-gen.config.json`.
  vite: {
    plugins: [
      styleGenVite({
        themePath: fileURLToPath(
          new URL("./app/theme/theme.json", import.meta.url),
        ),
        outDir: fileURLToPath(new URL("./app/theme", import.meta.url)),
        options,
      }),
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
