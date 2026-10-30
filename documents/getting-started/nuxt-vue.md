# Getting started: Nuxt + Vue

This tutorial wires `@duydpdev/style-generator` into a Nuxt 4 app and renders token-typed Vue components. Every code block below is copied from [`examples/nuxt-v4`](../../examples/nuxt-v4/README.md), which is built and type-checked in CI.

## Install

Install the package and its peer dependencies as described in [Install](../../README.md#install).

## Share the theme options

The theme is a JSON file ([`examples/design-system/src/theme.json`](../../examples/design-system/src/theme.json), 161 lines, not embedded here). The generator options live in one module that the bundler config, the typed tokens and the recipes all import, so the three never drift apart.

<!-- embed: examples/design-system/src/style-gen.options.ts#options -->

```ts
export const options = {
  breakpoints: ["md", "lg"],
} as const satisfies StyleGeneratorOptions;
```

## Generate theme.css with the Vite plugin

Nuxt runs on Vite, so `styleGenVite` goes under `vite.plugins`. Nuxt 4 sets the Vite root to `app/`, so the paths are absolute.

<!-- embed: examples/nuxt-v4/nuxt.config.ts#nuxt-config -->

```ts
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: false },

  // Global stylesheet entry (Tailwind v4 + generated theme.css + shared design-system styles).
  css: ["~/assets/css/globals.css"],

  // Nuxt runs on Vite, so the styleGenVite plugin works exactly like the
  // react-v4 example. Nuxt 4 sets the Vite `root` to `app/` (its `srcDir`), so
  // the paths are absolute: a relative `themePath` would resolve from `app/`.
  vite: {
    plugins: [
      styleGenVite({
        themePath: fileURLToPath(
          new URL("../design-system/src/theme.json", import.meta.url),
        ),
        outDir: fileURLToPath(new URL("./app/assets/css", import.meta.url)),
        options,
      }),
      tailwindcss(),
    ],
  },

  app: {
    head: {
      title: "style-generator · Nuxt + Tailwind v4 Example",
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

## Import the CSS and scan the components

Import the generated file next to Tailwind. Tailwind only scans the app directory, so the `@source` lines point it at the design system and the component package, which hold the class names.

<!-- embed: examples/nuxt-v4/app/assets/css/globals.css#css-entry -->

```css
@import "tailwindcss";
@import "./theme.css";
@import "design-system-example/styles/palettes.css";
@import "design-system-example/styles/style-guide.css";

/* Tailwind only scans this app by default; recipes live in the design system, components in packages/ui-vue. */
@source "../../../../design-system/src";
@source "../../../../../packages/ui-vue/src";
```

## Create the components once

`@duydpdev/ui-react` and `@duydpdev/ui-vue` are example packages inside this repository (`packages/ui-react`, `packages/ui-vue`). They are not published: copy the package folder into your project instead of installing it. A package with the same name from another registry is not ours.

`createUi(tokens, presets)` takes the typed tokens and the recipe presets; every role in `presets` is optional.

<!-- embed: examples/nuxt-v4/app/ui.ts -->

```ts
import { createUi } from "@duydpdev/ui-vue";
import { presets, tokens } from "design-system-example";

/**
 * The app's components, typed by the design-system theme. nuxt-v4 renders
 * every role, so it passes the full presets. Import them explicitly from "~/ui".
 */
export const {
  Box,
  Flex,
  Stack,
  Grid,
  Container,
  Text,
  Link,
  List,
  ListItem,
  Code,
  Button,
  Card,
  Badge,
  Input,
  Select,
  Dialog,
} = createUi(tokens, presets);
```

## Use them

<!-- embed: examples/nuxt-v4/app/pages/index.vue#usage -->

```vue
<template>
  <Container as="main" :maxWidth="960" :py="{ base: 6, md: 10 }" :px="4">
    <Stack as="header" justify="between" wrap>
      <Box>
        <Text type="text12Mono" color="muted">
          @duydpdev/style-generator · Nuxt 4
        </Text>
        <Text as="h1" type="display56Serif">Shared design system</Text>
      </Box>
      <ThemeSwitch />
    </Stack>

    <Card as="section" tone="surface" padding="lg">
      <Stack :gap="{ base: 2, md: 4 }">
        <Text as="h2" type="text20Semibold">Buttons</Text>
        <Flex v-for="color in intents" :key="color" wrap :gap="2">
          <Badge :color="color">{{ color }}</Badge>
          <Button
            v-for="variant in BUTTON_VARIANTS"
            :key="variant"
            :variant="variant"
            :color="color"
          >
            {{ variant }}
          </Button>
        </Flex>
      </Stack>
    </Card>

    <Card as="section" tone="outline" padding="md">
      <Stack :gap="3">
        <Text as="h2" type="text20Semibold">Inputs</Text>
        <Input size="md" placeholder="Default input" />
        <Input size="md" invalid placeholder="Invalid input" />
      </Stack>
    </Card>

    <Box as="section" backgroundColor="surface" rounded="lg" shadow="md" :p="6">
      <Button variant="outline" @click="dialogOpen = true">Open dialog</Button>
      <Dialog :open="dialogOpen" size="sm" @close="dialogOpen = false">
        <Text as="h2" type="text20Semibold">Dialog</Text>
        <Text type="text14Regular" color="muted">
          The component owns the overlay, Escape and outside click; the page
          owns the open state.
        </Text>
      </Dialog>
    </Box>
  </Container>
</template>
```

## Next steps

- [Components](../components.md): the props of every component and how to author a new one.
- [Theme config](../reference/theme.md): every theme key and its rules.
- [Vite and Nuxt](../reference/vite.md): the plugin options.
