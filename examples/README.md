# Examples

Working consumer apps that link `@duydpdev/style-generator` through a Yarn `link:../..` dependency (`workspace:*` is not linked for the root package; see `documents/deploy.md`) and exercise the public API end-to-end. Each one wires the library the 4.0.0 way: a generated `theme.css` that the app `@import`s next to `@import "tailwindcss"` — no `@plugin`, no safelist file. Upgrading an existing project? See [`../documents/migration/3.x-to-4.0.md`](../documents/migration/3.x-to-4.0.md).

| Example                  | Stack                           | Highlights                                                         |
| ------------------------ | ------------------------------- | ------------------------------------------------------------------ |
| [`react-v4`](./react-v4) | Vite + React + Tailwind v4      | `@import` of the generated `theme.css` via `@tailwindcss/vite`     |
| [`next-v4`](./next-v4)   | Next.js 15 (App Router) + TW v4 | No Vite → `styleGenNext` in `next.config.ts` (webpack + Turbopack) |
| [`nuxt-v4`](./nuxt-v4)   | Nuxt 3 (Vue 3) + Tailwind v4    | Nuxt runs on Vite → reuses `styleGenVite` via `nuxt.config.ts`     |

All apps share the same `theme.json` (with `"$schema"` and two `themeAxes`: `theme` and `palette`), palettes, cva configs, demo screens and bespoke chrome — only the framework layer and Tailwind wiring differ. `react-v4` and `next-v4` reuse the same React `Box`/`Text`/`Button`; `nuxt-v4` rewrites them as Vue SFCs. Overrides that combine two axes, and variables outside `--sg-*`, stay hand-written CSS (`palettes.css`, `style-guide.css`); the scope table is in [`nuxt-v4/README.md`](./nuxt-v4/README.md#multi-axis-theming-scope-themeaxes).

## Prerequisites

Build the local library first (the examples consume the built `dist/` through the workspace link):

```bash
# From repo root
yarn install
yarn build
```

## Run an example

```bash
cd examples/react-v4   # or next-v4 / nuxt-v4
yarn install           # link:../.. is created by the repo-root install
yarn dev
```

Each example exposes `dev`, `build` and `typecheck`. Preview the production build with `yarn preview` (`react-v4`, `nuxt-v4`) or `yarn start` (`next-v4`).

## Other files in this folder

`shadcn-theme.json` and `theme.json` are standalone theme samples; both must parse with the strict `ThemeSchema` (checked by the example-theme integration test under `src/__integration__/`). `v4-index.css` and `test-cva.ts` are small development snippets unrelated to the apps above.
