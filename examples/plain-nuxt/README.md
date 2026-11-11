# Nuxt 4 + Tailwind v4 example (plain)

Nuxt 4 (Vue 3) app that renders a landing page built from plain, copy-paste single-file components. CI type-checks, lints, builds and generates it, making it the working reference for the [Nuxt tutorial](../../documents/getting-started/nuxt-vue.md). The files in `app/ui` and `app/sections` render the same landing page as `examples/plain-react`, and `yarn check:plain-ui` keeps `style.ts` identical across the plain apps.

## Prerequisites

```bash
# From the repo root
yarn install
yarn build:all                                  # lib (dist/) + CLI (dist/cli/index.mjs)
yarn workspace plain-nuxt-example prepare:nuxt  # creates .nuxt/ before linting or typechecking
```

Run `yarn workspace plain-nuxt-example prepare:nuxt` before running ESLint or typechecking, so Nuxt generates its `.nuxt/` types.

## Run the example

```bash
cd examples/plain-nuxt
yarn dev
```

## Copy a component

1. Install the package and the libraries a copied folder uses:
   ```bash
   yarn add @duydpdev/style-generator@^7.0.0 class-variance-authority clsx tailwind-merge
   ```
   `@duydpdev/style-generator` is on the public npm registry: no token or scope config is needed (see the [Install](../../README.md#install) section of the repository README).
2. Wire `theme.css` for Nuxt: add `styleGenVite` to `vite.plugins` in `nuxt.config.ts` and import `@import "tailwindcss";` and `@import "../../theme/theme.css";` in `app/assets/css/globals.css`. See the [Nuxt tutorial](../../documents/getting-started/nuxt-vue.md).
3. Copy `app/theme/theme.json` (or use your own theme), `app/theme.ts`, `app/options.ts` and `style-gen.config.json`. `options.ts` holds the literal `options` (here `coverage.colors.opacities`) and imports no JSON, so `nuxt.config.ts` can import it without restarting the server on every theme edit; `nuxt.config.ts` passes it to `styleGenVite` and `theme.ts` passes it as the second argument of `createDesignTokens`. `style-gen.config.json` repeats the same steps for the `generate` CLI (`yarn check:plain-ui` keeps them equal).
4. Copy the component folder from `app/ui/`, for example `app/ui/button/`. A folder imports only its own files, `../../theme` and the packages, so nothing else comes with it. Components are imported explicitly (for example, `import Button from "~/ui/button/Button.vue"`). See [Components](../../documents/components.md#plain-examples-copy-these).

In Vue components, `types.ts` declares the props the SFC compiler can read and extends the spacing props with `/* @vue-ignore */` for components that accept responsive spacing (`Box`, `Text`, `Stack`, `Flex`, `Grid`, `Button`). Components without spacing props (`Card`, `Badge`, `Input`, `Link`) have no spacing props and need no `@vue-ignore`.

## Storybook and tests

- `yarn workspace plain-nuxt-example storybook`: the component catalogue at http://localhost:6009.
- `yarn workspace plain-nuxt-example test:stories`: runs the stories as Vitest browser tests via Playwright Chromium.

Only the `app/ui/` components have stories (`.storybook/main.ts` loads `app/ui/**`); sections and `ThemeSwitch` have none. In `app/assets/css/globals.css`, `@source not` excludes the story files so stories never add extra utilities to the app's CSS.

## Scripts

| Script                 | What it does                                               |
| ---------------------- | ---------------------------------------------------------- |
| `yarn dev`             | Nuxt dev server (theme.css regenerated via `styleGenVite`) |
| `yarn build`           | Nuxt production build                                      |
| `yarn generate`        | Pre-render static pages (`.output/public`)                 |
| `yarn preview`         | Preview production build                                   |
| `yarn prepare:nuxt`    | Generate `.nuxt/` types (required before lint / typecheck) |
| `yarn typecheck`       | `nuxt typecheck`                                           |
| `yarn storybook`       | Storybook dev server (port 6009)                           |
| `yarn storybook:build` | Build Storybook static assets                              |
| `yarn test:stories`    | Run Storybook tests with Vitest browser                    |

## Layout

```text
examples/plain-nuxt
├── .storybook/
│   ├── main.ts
│   └── preview.ts
├── vitest.config.ts
├── nuxt.config.ts
├── package.json
├── tsconfig.json
├── app/
│   ├── options.ts
│   ├── theme/
│   │   ├── theme.json
│   │   └── theme.css (generated, gitignored)
│   ├── theme.ts
│   ├── ui/
│   │   └── <folder>/
│   │       ├── style.ts
│   │       ├── types.ts
│   │       ├── <Name>.vue
│   │       └── <Name>.stories.ts
│   ├── sections/
│   │   └── <Name>.vue
│   ├── components/
│   │   └── ThemeSwitch.vue
│   └── pages/
│       └── index.vue
└── tests/
    └── nuxt/
        └── ui-props.vue
```
