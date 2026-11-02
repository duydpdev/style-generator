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

## Import the CSS

Import the generated file next to Tailwind. Tailwind only scans the app directory, so the `@source` line points it at the design system, whose recipes hold the class names; the components in `src/ui/` are inside the app and scanned by default.

<!-- embed: examples/react-v4/src/index.css#css-entry -->

```css
@import "tailwindcss";
@import "./theme/theme.css";
@import "design-system-example/styles/palettes.css";
@import "design-system-example/styles/style-guide.css";
@import "./parts.css";
@source "../../design-system/src";
```

## Bind the components once

The six sample components are example code inside the app, one self-contained file each in `src/ui/`: copy the folder instead of installing anything (see [Components](../components.md)). Each file exports a factory, and `src/ui.ts` binds them to the design system's tokens and presets once:

<!-- embed: examples/react-v4/src/ui.ts -->

```ts
import {
  boxPreset,
  buttonPreset,
  textPreset,
  tokens,
} from "design-system-example";

import { createBox } from "./ui/Box";
import { createButton } from "./ui/Button";
import { createFlex } from "./ui/Flex";
import { createGrid } from "./ui/Grid";
import { createStack } from "./ui/Stack";
import { createText } from "./ui/Text";

/** The example's components, bound once to the design system's tokens and presets. */
export const Box = createBox(tokens, boxPreset);
export const Button = createButton(tokens, buttonPreset);
export const Flex = createFlex(tokens);
export const Grid = createGrid(tokens);
export const Stack = createStack(tokens);
export const Text = createText(tokens, textPreset);
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
  <Grid
    columns={{
      base: "72px repeat(4, minmax(0, 1fr))",
      md: "120px repeat(4, minmax(0, 1fr))",
    }}
    align="center"
    gapX={4}
    gapY={4}
    data-part="button-matrix"
  >
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

<Box mt={10} pt={7} borderT="thin" data-part="dashed" borderColor="line">
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
