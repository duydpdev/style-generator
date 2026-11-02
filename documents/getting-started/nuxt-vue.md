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

## Import the CSS

Import the generated file next to Tailwind. Tailwind only scans the app directory, so the `@source` line points it at the design system, whose recipes hold the class names; the components in `app/ui/` are inside the app and scanned by default.

<!-- embed: examples/nuxt-v4/app/assets/css/globals.css#css-entry -->

```css
@import "tailwindcss";
@import "./theme.css";
@import "design-system-example/styles/palettes.css";
@import "design-system-example/styles/style-guide.css";

/* Tailwind only scans this app by default (app/ui included); the recipes live in the design system. */
@source "../../../../design-system/src";
```

## Use a component file

Each of the six sample components is one single-file component in `app/ui/` (`<script setup lang="ts">` with typed `defineProps`/`defineSlots`, and `defineEmits` on `Button`). They are example code, not an API: copy the folder (see [Components](../components.md)). Pages import the file they render explicitly, for example `import Button from "~/ui/Button.vue"`:

<!-- embed: examples/nuxt-v4/app/ui/Button.vue -->

```vue
<script setup lang="ts">
import {
  buttonRecipe,
  cn,
  splitSpacingProps,
  tokens,
} from "design-system-example";
import type { BoxSpacingProps, ButtonRecipeProps } from "design-system-example";
import { useAttrs } from "vue";

/**
 * Button: variant, intent color and size from the design-system button
 * recipe. Emits `click`; the `prefix`/`suffix` slots wrap icons around the
 * label. Renders `type="button"` when `as` is `button`; a caller's `type`
 * attribute wins. Spacing props work as in Box.
 */
export interface ButtonProps extends /* @vue-ignore */ BoxSpacingProps {
  as?: string;
  variant?: NonNullable<ButtonRecipeProps["variant"]>;
  color?: NonNullable<ButtonRecipeProps["color"]>;
  size?: NonNullable<ButtonRecipeProps["size"]>;
}

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<ButtonProps>(), { as: "button" });
const emit = defineEmits<{ click: [event: MouseEvent] }>();
const slots = defineSlots<{
  default?: () => unknown;
  prefix?: () => unknown;
  suffix?: () => unknown;
}>();
const attrs = useAttrs();

// Root attributes: defaults, the caller's other attributes, then class and style.
const root = () => {
  const { spacing, rest } = splitSpacingProps(
    attrs as BoxSpacingProps & Record<string, unknown>,
    tokens.spacingProperties,
  );
  return {
    type: props.as === "button" ? "button" : undefined,
    "data-slot": "button",
    ...rest,
    class: cn(buttonRecipe(props), spacing.className),
    ...(spacing.className === "" ? {} : { style: spacing.style }),
  };
};

const onClick = (event: MouseEvent) => {
  emit("click", event);
};
</script>

<template>
  <component :is="props.as" v-bind="root()" @click="onClick">
    <span v-if="slots.prefix" data-icon="start"><slot name="prefix" /></span>
    <span><slot /></span>
    <span v-if="slots.suffix" data-icon="end"><slot name="suffix" /></span>
  </component>
</template>
```

## Use them

<!-- embed: examples/nuxt-v4/app/pages/index.vue#usage -->

```vue
<template>
  <Stack as="main" align="center" :py="{ base: 6, md: 10 }" :px="4">
    <Stack width="100%" :maxWidth="960" :gap="6">
      <Flex as="header" justify="between" align="end" wrap :gap="4">
        <Box>
          <Text type="text12Mono" color="muted">
            @duydpdev/style-generator · Nuxt 4
          </Text>
          <Text as="h1" type="display56Serif">Shared design system</Text>
        </Box>
        <ThemeSwitch />
      </Flex>

      <Box
        as="section"
        backgroundColor="surface"
        borderColor="line"
        border="thin"
        rounded="lg"
        shadow="sm"
        :p="8"
      >
        <Stack :gap="{ base: 2, md: 4 }">
          <Text as="h2" type="text20Semibold">Buttons</Text>
          <Flex
            v-for="color in intents"
            :key="color"
            wrap
            align="center"
            :gap="2"
          >
            <Text as="span" type="text12Mono" :color="color">{{ color }}</Text>
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
      </Box>

      <Box as="section" borderColor="line" border="thin" rounded="lg" :p="5">
        <Stack :gap="3">
          <Text as="h2" type="text20Semibold">Layout</Text>
          <Grid :columns="{ base: 1, md: 3 }" :gap="3">
            <Box
              v-for="name in CELLS"
              :key="name"
              backgroundColor="background"
              borderColor="line"
              border="thin"
              rounded="md"
              :p="4"
            >
              <Text type="text14Regular">{{ name }}</Text>
            </Box>
          </Grid>
        </Stack>
      </Box>
    </Stack>
  </Stack>
</template>
```

## Next steps

- [Components](../components.md): the props of every component and how to author a new one.
- [Theme config](../reference/theme.md): every theme key and its rules.
- [Vite and Nuxt](../reference/vite.md): the plugin options.
