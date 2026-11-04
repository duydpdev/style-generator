# React + Tailwind v4 example

Demo app showing `@duydpdev/style-generator` with **Tailwind CSS v4**, Vite and React 19. It is a thin consumer of the shared [`design-system`](../design-system/README.md) package: the theme, options, tokens, `cn()`, the headless recipes and the shared CSS all live there. This app holds the wiring, its demo sections and the six sample components in `src/ui/` (`Box`, `Flex`, `Stack`, `Grid`, `Text`, `Button`), which the `site` workspace imports as `react-v4-example/ui`.

## Prerequisites

The library is linked (`"@duydpdev/style-generator": "link:../.."`) and the design system is a workspace package (`"design-system-example": "workspace:*"`), so install and build from the repo root first. Node >= 22.18 is required (the Vite config imports a `.ts` module through Node's type stripping):

```bash
# From the repo root
yarn install
yarn build:all   # lib (dist/); the example imports the built subpaths
```

## Run the example

```bash
cd examples/react-v4
yarn dev          # Vite dev server on http://localhost:5173
```

`styleGenVite` (in `vite.config.ts`) reads `../design-system/src/theme.json`, takes `options` from `design-system-example/style-gen.options`, and writes `src/theme/theme.css` on dev start, on build and whenever the theme changes. That file is generated and gitignored. `src/index.css` imports it, then the design system's `palettes.css` and `style-guide.css`, and adds `@source "../../design-system/src"` so Tailwind scans the recipes.

## Scripts

| Script                 | What it does                         |
| ---------------------- | ------------------------------------ |
| `yarn dev`             | Vite dev server (HMR on the theme)   |
| `yarn build`           | Production build via Vite            |
| `yarn preview`         | Serve the production build           |
| `yarn typecheck`       | `tsc --noEmit`                       |
| `yarn storybook`       | Storybook at http://localhost:6007   |
| `yarn storybook:build` | Static Storybook (autodocs)          |
| `yarn test:stories`    | Every story as a Vitest browser test |

`doctor`, `generate` and `schema` live in the design-system package (`yarn workspace design-system-example doctor`).

## Storybook

`src/ui/<Name>.stories.tsx` (one per sample component) and `src/sections/<Module>.stories.tsx` (one per demo section module) document the harness; they run as Vitest browser tests (`@storybook/addon-vitest`, Chromium: `yarn workspace react-v4-example test:stories`, after `yarn build:all` and `yarn playwright install chromium` once). `src/index.css` has `@source not "./**/*.stories.*"`, so a story adds no utility to the app's CSS, and a story's comments and strings avoid utility words such as `blur` and `filter`. ESLint excepts `*.stories.tsx` from the component-only rules (`UI_STORY_FILES` in `eslint.config.js`).

## What it demonstrates

1. **Sample components**: `src/ui/` holds one self-contained file per component (`createBox`, `createFlex`, `createStack`, `createGrid`, `createText`, `createButton`) over the design system's recipes and the published kit (`@duydpdev/style-generator/ui` and `/ui-react`), plus `layout.ts` (the harness's own `LayoutProps` type and size-key list); `src/ui.ts` binds them to this app's tokens and presets. They are examples to copy, not a published API. App code has no Tailwind `className` and no `style=`: props cover tokens and spacing, and the few bespoke styles hang off `x-` classes (`src/parts.css` and the design system's `style-guide.css`). ESLint enforces this (`UI_APP_FILES` in `eslint.config.js`, names from `examples/ui-registry.mjs`), and every `<Grid>` passes `columns`. `yarn typecheck` also compiles `tests/ui-types.tsx`, the components' `@ts-expect-error` checks.
2. **Spacing props**: every component takes `p`, `mx`, `gap`, … as a number or `{ base, md, lg }`, so `<Box p={4} mx={{ base: 2, md: 4 }}>` works; the component turns them into the `.sp-*` classes and inline `--sg-sp-*` variables.
3. **Multi-axis theming**: `App.tsx` applies `axisAttributes({ theme, palette })` to `<html>` (the state types derive from the theme's axes; the topbar button cycles light, dark and high contrast) plus the chrome-only `voice`, `geometry`, `surface`. The `dark × palette` compound overrides are hand-written CSS in the design system's `palettes.css`.
4. **Live demo sections**: `src/sections/` is the style-guide UI. The `site` build renders it as the live demo, so it stays in this app.

## Layout

```text
examples/react-v4
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                # styleGenVite + @tailwindcss/vite, shared options
├── tests/                        # ui-types.tsx: compile-time prop checks (yarn typecheck)
└── src/
    ├── main.tsx
    ├── App.tsx                   # page state (palette/theme/tweaks) + section composition
    ├── index.css                 # tailwindcss + theme.css + design-system styles + @source
    ├── ui.ts                     # binds the src/ui factories to the design-system tokens and presets
    ├── ui/                       # Box, Flex, Stack, Grid, Text, Button, layout.ts (LayoutProps, LAYOUT_SIZE_KEYS), index.ts
    ├── parts.css                 # x- classes (bespoke styles) that no component prop covers
    ├── sections/                 # Topbar, Hero, Color, Typography, Utilities, ResponsiveSpacing, Button,
    │                             # Footer, JsonDrawer, TweaksPanel + SectionHead, palettes.ts, types.ts
    └── theme/
        └── theme.css             # generated by styleGenVite (gitignored)
```
