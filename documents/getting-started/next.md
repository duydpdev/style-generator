# Getting started: Next.js

This tutorial wires `@duydpdev/style-generator` into a Next.js app (webpack or Turbopack) and renders token-typed components. Every code block below is copied from [`examples/next-v4`](../../examples/next-v4/README.md), which is built and type-checked in CI.

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

## Generate theme.css with the Next.js wrapper

`styleGenNext` writes `theme.css` when `next dev` or `next build` loads the config. The design system and the component package ship TypeScript source, so `transpilePackages` lets Next compile them.

<!-- embed: examples/next-v4/next.config.ts#next-config -->

```ts
const nextConfig: NextConfig = {
  // The design system and @duydpdev/ui-react ship TypeScript source (no build step): let Next compile them.
  transpilePackages: ["design-system-example", "@duydpdev/ui-react"],
};

// Next.js runs on Turbopack/webpack (no Vite), so the Vite-only `styleGenVite`
// plugin used by the React/Nuxt examples does not apply. `styleGenNext` is the
// Next-equivalent: it does not import `next`, so it works identically under
// both bundlers. It writes `app/theme/theme.css` when Next loads this config in
// `phase-development-server` (`next dev`, which also watches the theme JSON) or
// `phase-production-build` (`next build`). The theme and the generator options
// are shared with the other examples through the `design-system-example` package.
export default styleGenNext({
  themePath: "../design-system/src/theme.json",
  outDir: "app/theme",
  options,
})(nextConfig);
```

## Import the CSS and scan the components

Import the generated file next to Tailwind. Tailwind only scans the app directory, so the `@source` lines point it at the design system and the component package, which hold the class names.

<!-- embed: examples/next-v4/app/globals.css#css-entry -->

```css
@import "tailwindcss";
@import "./theme/theme.css";
@import "design-system-example/styles/palettes.css";
@import "design-system-example/styles/style-guide.css";

/* Tailwind only scans this app by default; the recipes live in the design system. */
@source "../../design-system/src";
@source "../../../packages/ui-react/src";
```

## Create the components once

`@duydpdev/ui-react` and `@duydpdev/ui-vue` are example packages inside this repository (`packages/ui-react`, `packages/ui-vue`). They are not published: copy the package folder into your project instead of installing it. A package with the same name from another registry is not ours.

`createUi(tokens, presets)` takes the typed tokens and the recipe presets; every role in `presets` is optional.

<!-- embed: examples/next-v4/app/ui.ts -->

```ts
"use client";

import { createUi } from "@duydpdev/ui-react";
import { presets, tokens } from "design-system-example";

/** One createUi call; next-v4 renders every role, so it passes all 8 presets. */
const ui = createUi(tokens, presets);

export const Box = ui.Box;
export const Flex = ui.Flex;
export const Stack = ui.Stack;
export const Grid = ui.Grid;
export const Container = ui.Container;
export const Text = ui.Text;
export const Button = ui.Button;
export const Card = ui.Card;
export const Badge = ui.Badge;
export const Input = ui.Input;
export const Select = ui.Select;
export const Dialog = ui.Dialog;
```

## Use them

<!-- embed: examples/next-v4/app/page.tsx#usage -->

```tsx
<Stack as="header" justify="between" wrap>
  <Box>
    <Text type="text12Mono" color="muted">
      @duydpdev/style-generator · Next.js 16
    </Text>
    <Text as="h1" type="display56Serif">
      Shared design system
    </Text>
  </Box>
  <ThemeSwitch />
</Stack>

<Card as="section" tone="surface" padding="lg">
  <Stack gap={{ base: 2, md: 4 }}>
    <Text as="h2" type="text20Semibold">
      Buttons
    </Text>
    {intents.map((color) => (
      <Flex key={color} wrap gap={2}>
        <Badge color={color}>{color}</Badge>
        {BUTTON_VARIANTS.map((variant) => (
          <Button key={variant} variant={variant} color={color}>
            {variant}
          </Button>
        ))}
      </Flex>
    ))}
  </Stack>
</Card>

<Card as="section" tone="outline" padding="md">
  <Stack gap={3}>
    <Text as="h2" type="text20Semibold">
      Inputs
    </Text>
    <Input size="md" placeholder="Default input" />
    <Input size="md" invalid placeholder="Invalid input" />
  </Stack>
</Card>

<Box
  as="section"
  backgroundColor="surface"
  rounded="lg"
  shadow="md"
  p={6}
>
  <DialogDemo />
</Box>
```

## Next steps

- [Components](../components.md): the props of every component and how to author a new one.
- [Theme config](../reference/theme.md): every theme key and its rules.
- [Next.js](../reference/next.md): the wrapper options.
