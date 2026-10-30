# Getting started: React + Vite

This tutorial wires `@duydpdev/style-generator` into a Vite + React app and renders token-typed components. Every code block below is copied from [`examples/react-v4`](../../examples/react-v4/README.md), which is built and type-checked in CI.

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

`styleGenVite` writes `theme.css` when the dev server or a build starts, and again whenever the theme file changes.

<!-- embed: examples/react-v4/vite.config.ts#vite-config -->

```ts
export default defineConfig({
  base: process.env.EXAMPLE_BASE ?? "/",
  plugins: [
    react(),
    styleGenVite({
      themePath: "../design-system/src/theme.json",
      outDir: "src/theme",
      options,
    }),
    tailwindcss(),
  ],
});
```

## Import the CSS and scan the components

Import the generated file next to Tailwind. Tailwind only scans the app directory, so the `@source` lines point it at the design system and the component package, which hold the class names.

<!-- embed: examples/react-v4/src/index.css#css-entry -->

```css
@import "tailwindcss";
@import "./theme/theme.css";
@import "design-system-example/styles/palettes.css";
@import "design-system-example/styles/style-guide.css";
@import "./parts.css";
@source "../../design-system/src";
@source "../../../packages/ui-react/src";
```

## Create the components once

`@duydpdev/ui-react` and `@duydpdev/ui-vue` are example packages inside this repository (`packages/ui-react`, `packages/ui-vue`). They are not published: copy the package folder into your project instead of installing it. A package with the same name from another registry is not ours.

`createUi(tokens, presets)` takes the typed tokens and the recipe presets; every role in `presets` is optional.

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

## Use them

<!-- embed: examples/react-v4/src/sections/ButtonSection.tsx#usage -->

```tsx
<SectionHead
  num="04 — Button"
  title="cva × compoundVariants."
  desc={
    <>
      Sixteen permutations from a single <code>buttonRecipe</code>. Each
      cell here is the rendered class chain — final classes are merged
      through <code>cn(clsx, twMerge)</code>.
    </>
  }
/>

<Box mx={-8} px={8} py={2} data-part="scroll-x">
  <Grid align="center" gapX={4} gapY={4} data-part="button-matrix">
    <Box />
    {COLORS.map((c) => (
      <Text key={c} type="text12Mono" color="muted">
        {c}
      </Text>
    ))}
    {VARIANTS.map((v) => (
      <Box key={v.id} data-part="display-contents">
        <Text type="text12Mono" color="muted" data-part="caps-wide">
          {v.label}
        </Text>
        {COLORS.map((c) => (
          <Box key={`${v.id}-${c}`}>
            <Button variant={v.id} color={c}>
              {v.label.toLowerCase()}
            </Button>
          </Box>
        ))}
      </Box>
    ))}
  </Grid>
</Box>

<Box
  mt={10}
  pt={7}
  borderT="thin"
  data-part="dashed"
  style={{ borderColor: "var(--c-line)" }}
>
  <Text type="text12Mono" color="muted" mb={4} data-part="caps-wide">
    Sizes
  </Text>
  <Flex wrap align="center" gap={3}>
    {SIZES.map((s) => (
      <Button key={s} variant="fill" color="primary" size={s}>
        size · {s}
      </Button>
    ))}
  </Flex>
</Box>
```

## Next steps

- [Components](../components.md): the props of every component and how to author a new one.
- [Theme config](../reference/theme.md): every theme key and its rules.
- [Vite and Nuxt](../reference/vite.md): the plugin options.
