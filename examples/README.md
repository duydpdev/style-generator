# Examples

Working consumer apps that link `@duydpdev/style-generator` through a Yarn `link:../..` dependency (see `documents/deploy.md` for why it is `link:`) and exercise the public API end-to-end. Each one wires the library the 4.0.0 way: a generated `theme.css` that the app `@import`s next to `@import "tailwindcss"`, with no `@plugin` and no safelist file. Upgrading an existing project? See [`../documents/migration/3.x-to-4.0.md`](../documents/migration/3.x-to-4.0.md).

| Example                  | Stack                           | Highlights                                                         |
| ------------------------ | ------------------------------- | ------------------------------------------------------------------ |
| [`react-v4`](./react-v4) | Vite + React + Tailwind v4      | `@import` of the generated `theme.css` via `@tailwindcss/vite`     |
| [`next-v4`](./next-v4)   | Next.js 15 (App Router) + TW v4 | No Vite → `styleGenNext` in `next.config.ts` (webpack + Turbopack) |
| [`nuxt-v4`](./nuxt-v4)   | Nuxt 3 (Vue 3) + Tailwind v4    | Nuxt runs on Vite → reuses `styleGenVite` via `nuxt.config.ts`     |

All apps share the same `theme.json` (with `"$schema"` and two `themeAxes`: `theme` and `palette`), palettes, cva configs, demo screens and bespoke chrome — only the framework layer and Tailwind wiring differ. `react-v4` and `next-v4` reuse the same React `Box`/`Text`/`Button`; `nuxt-v4` rewrites them as Vue SFCs. Overrides that combine two axes, and variables outside `--sg-*`, stay hand-written CSS (`palettes.css`, `style-guide.css`); the scope table is in [`nuxt-v4/README.md`](./nuxt-v4/README.md#multi-axis-theming-scope-themeaxes).

## Prerequisites

Build the local library and the CLI first (the examples consume the built `dist/` through the `link:../..` dependency; `yarn doctor` runs `dist/cli/index.mjs`). The examples are workspaces of the repo root, so the root install also installs them:

```bash
# From repo root
yarn install
yarn build:all
```

## Run an example

```bash
cd examples/react-v4   # or next-v4 / nuxt-v4
yarn dev
```

Each example exposes `dev`, `build`, `typecheck` and `doctor` (`node ../../dist/cli/index.mjs doctor`, which reads that example's `style-gen.config.json`). Preview the production build with `yarn preview` (`react-v4`, `nuxt-v4`) or `yarn start` (`next-v4`).

## Other files in this folder

`shadcn-theme.json` and `theme.json` are standalone theme samples; both must parse with the strict `ThemeSchema` (checked by the example-theme integration test under `src/__integration__/`).
