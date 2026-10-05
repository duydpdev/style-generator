# Nuxt + Tailwind v4 example

Demo app showing `@duydpdev/style-generator` with **Nuxt 3** (Vue 3) and **Tailwind CSS v4** (`generate()` + `@theme inline`).

Because Nuxt runs on Vite, this example reuses the same `styleGenVite` plugin as the `react-v4` example, registered through `nuxt.config.ts` → `vite.plugins`.

## Prerequisites

`package.json` depends on the library through `"@duydpdev/style-generator": "link:../.."`, so the library **must be built first**. The example is a Yarn workspace of the repo root, so the root install also installs it:

```bash
# From the repo root
yarn install
yarn build:all   # lib (dist/) + CLI (dist/cli/index.mjs, used by `yarn doctor`)
```

## Run the example

```bash
cd examples/nuxt-v4
yarn dev          # Nuxt dev server on http://localhost:3000
```

`styleGenVite` (registered in `nuxt.config.ts`) writes `theme/theme.css` on dev start, on build and whenever `theme.json` changes. The file holds the full generated CSS (`:root` vars, `themeAxes` overrides, `@theme inline`, typography/spacing utilities, registry `@source inline` utility coverage) and is gitignored. `assets/css/globals.css` imports it right after `@import "tailwindcss"`.

## Scripts

| Script              | What it does                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `yarn dev`          | Nuxt dev server (HMR on `theme.json`)                                                                 |
| `yarn build`        | Production build via Nuxt                                                                             |
| `yarn generate`     | Static generation (`nuxt generate`)                                                                   |
| `yarn preview`      | Serve the production build                                                                            |
| `yarn typecheck`    | `nuxt typecheck` (vue-tsc)                                                                            |
| `yarn prepare:nuxt` | Generate `.nuxt/` types (auto-imports)                                                                |
| `yarn doctor`       | `node ../../dist/cli/index.mjs doctor`: checks `style-gen.config.json` and `theme/theme.json` in here |

> `dev` / `build` / `typecheck` each run `nuxt prepare` internally, so `.nuxt/` types are generated on demand. There is intentionally **no `postinstall` hook**: it would run during the repo-root `yarn install` before the library `dist/` exists and break `yarn install --immutable` in CI. Run `yarn prepare:nuxt` manually if your editor needs `.nuxt/tsconfig.json` before the first dev/build.

## What it demonstrates

1. **Color tokens + theme toggle**: `bg-primary`, `bg-background`, etc. come from `@theme inline`. The toggles set `<html data-theme>` / `<html data-palette>` (plus `voice`, `geometry`, `surface`) via `useHead` and switch the library-generated `html[data-theme="dark"]` / `html[data-palette="..."]` overrides.
2. **Typography utilities**: `text-16-medium`, `text-32-bold`, … are emitted from `theme.typography` and used through `<Text type="text16Medium">`. The `type` prop is typed by `TextVariant<Theme>`; `color`, `decoration`, `align` and `as` are the other props.
3. **Spacing helpers**: `<Box :p="4" :mx="{ base: 2, md: 4 }">` calls `resolveSpacingProps` from `@duydpdev/style-generator/spacing`, which returns `.sp-*` class names plus inline `--sg-sp-*` CSS variables. `Box` also maps `backgroundColor`, `borderColor`, `border*`, `rounded*`, `shadow` and `backdropBlur` to token classes.
4. **CVA mapper + `cn()`**: `box.style.ts` and `text.style.ts` build their variants with `createVariantMapper(prefix, tokens)` from `@duydpdev/style-generator/cva`. `button.style.ts` is plain `cva` with `variant` (`fill`, `outline`, `soft`, `ghost`, `link`) × `color` (`primary`, `secondary`, `success`, `danger`) `compoundVariants` (20 combinations) and `size` (`sm`, `md`, `lg`). Final classes go through a `cn(clsx, twMerge)` helper.

## Multi-axis theming scope (`themeAxes`)

`theme.json` declares two `themeAxes`, `theme` (light/dark) and `palette` (cobalt/forest/sunset/mono), toggled independently via separate `<html data-*>` attributes. Not every override in this example is generated from `theme.json`, though:

| Axis (source)                                                       | Content                                                                              | Handling                                                                                                                                                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `theme` (`theme.json` → `themeAxes.theme.dark`)                     | override `--sg-*` colors + shadows                                                   | Generated by the library — `html[data-theme="dark"]`                                                                                                                                             |
| `palette` (`theme.json` → `themeAxes.palette.{forest,sunset,mono}`) | override `--sg-*` colors                                                             | Generated by the library — `html[data-palette="forest\|sunset\|mono"]`                                                                                                                           |
| compound `[data-theme="dark"][data-palette="…"]` (`palettes.css`)   | cross-axis override (dark × a specific palette)                                      | Stays hand-written CSS: a single `ThemeOverride` can't target two axes' attributes at once; its (0,2,0) specificity still beats either single-axis `html[data-…]` rule (0,1,1) the library emits |
| `voice`, `geometry`, `surface` (`style-guide.css`)                  | `--f-sans`, `--radius-sm`, `--shadow-sm`, and a nested `.sg-glass-target` child rule | Stays hand-written CSS: variables outside `--sg-*` and a nested-child selector aren't representable by a `ThemeOverride`                                                                         |

## SSR notes

State lives in `useState`-backed composables (`useStyleGuide`, `useDrawers`), so the server and the first client render share the same initial values. The `<html data-*>` attributes are applied reactively via `useHead` in `app.vue`, keeping SSR and hydration in agreement.

## Layout (Nuxt conventions)

```text
examples/nuxt-v4
├── nuxt.config.ts                # vite.plugins: [styleGenVite, tailwindcss] + app.head (fonts, html data-*)
├── app.vue                       # reactive <html data-*> via useHead
├── package.json
├── style-gen.config.json         # read by `yarn doctor` (theme + output paths)
├── tsconfig.json
├── assets/css/globals.css        # tailwindcss + theme.css + palettes.css + style-guide.css
├── pages/
│   └── index.vue                 # showcase composition
├── composables/
│   ├── useStyleGuide.ts          # palette/theme/voice/geometry/surface state
│   └── useDrawers.ts             # json + tweaks panel open state
├── lib/
│   └── utils.ts                  # cn() = twMerge(clsx(...))
├── components/
│   ├── Box.vue / Text.vue / Button.vue                  # token-typed primitives
│   ├── box.style.ts / text.style.ts / button.style.ts   # cva configs (same as react-v4)
│   ├── box.type.ts               # SpacingProperties + StyleProperties + BoxProps
│   └── sections/                 # Topbar, Hero, Color, Typography, Utilities, ResponsiveSpacing, Button,
│                                 # Footer, JsonDrawer, TweaksPanel + SectionHead
├── data/
│   ├── palettes.ts               # palette list + color rows
│   └── types.ts                  # StyleGuideState + tweak unions
└── theme/
    ├── theme.json                # source of truth ("$schema" → theme.schema.json)
    ├── theme.schema.json         # JSON Schema for editor completion
    ├── theme.css                 # generated by styleGenVite (gitignored)
    ├── design-tokens.ts          # createDesignTokens(theme.json) from the browser-safe /tokens subpath
    ├── palettes.css              # hand-written dark × palette overrides
    └── style-guide.css           # bespoke chrome (topbar, hero, drawers, tweaks)
```

The cva configs, theme JSON, palettes and bespoke chrome CSS match `react-v4`; only the component layer is rewritten as Vue SFCs and the state moves into Nuxt composables.
