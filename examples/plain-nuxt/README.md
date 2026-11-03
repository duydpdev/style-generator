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
   yarn add @duydpdev/style-generator@^5.3.0 class-variance-authority clsx tailwind-merge
   ```
   `@duydpdev/style-generator` comes from GitHub Packages, so set up the `@duydpdev` scope registry and a personal access token first (see the [Install](../../README.md#install) section of the repository README); without the scope config npmjs serves an unrelated `3.0.0`.
2. Wire `theme.css` for Nuxt: add `styleGenVite` to `vite.plugins` in `nuxt.config.ts` and import `@import "tailwindcss";` and `@import "./theme/theme.css";` in `app/assets/css/main.css`. See the [Nuxt tutorial](../../documents/getting-started/nuxt-vue.md).
3. Copy `app/theme/theme.json` (or use your own theme) and `app/theme.ts`. If you pass generator options to `styleGenVite`, pass the same object to `createDesignTokens` in `theme.ts`.
4. Copy the component folder from `app/ui/`, for example `app/ui/button/`. A folder imports only its own files, `../../theme` and the packages, so nothing else comes with it. Components are imported explicitly (for example, `import Button from "~/ui/button/Button.vue"`). See [Components](../../documents/components.md#plain-examples-copy-these).

In Vue components, `types.ts` declares the props the SFC compiler can read and extends the spacing props with `/* @vue-ignore */` for components that accept responsive spacing (`Box`, `Text`, `Stack`, `Flex`, `Grid`, `Button`). Components without spacing props (`Card`, `Badge`, `Input`, `Link`) have no spacing props and need no `@vue-ignore`.

## Scripts

| Script              | What it does                                               |
| ------------------- | ---------------------------------------------------------- |
| `yarn dev`          | Nuxt dev server (theme.css regenerated via `styleGenVite`) |
| `yarn build`        | Nuxt production build                                      |
| `yarn generate`     | Pre-render static pages (`.output/public`)                 |
| `yarn preview`      | Preview production build                                   |
| `yarn prepare:nuxt` | Generate `.nuxt/` types (required before lint / typecheck) |
| `yarn typecheck`    | `nuxt typecheck`                                           |

## Layout

```text
examples/plain-nuxt
├── nuxt.config.ts
├── package.json
├── tsconfig.json
├── app/
│   ├── theme/
│   │   ├── theme.json
│   │   └── theme.css (generated, gitignored)
│   ├── theme.ts
│   ├── ui/
│   │   └── <folder>/
│   │       ├── style.ts
│   │       ├── types.ts
│   │       └── <Name>.vue
│   ├── sections/
│   ├── components/
│   │   └── ThemeSwitch.vue
│   └── pages/
│       └── index.vue
└── tests/
    └── nuxt/
        └── ui-props.vue
```
