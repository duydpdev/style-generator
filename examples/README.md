# Examples

Working consumer apps that link `@duydpdev/style-generator` via `file:../..` and exercise the public API end-to-end.

| Example                  | Stack                           | Highlights                                                               |
| ------------------------ | ------------------------------- | ------------------------------------------------------------------------ |
| [`react-v3`](./react-v3) | Vite + React + Tailwind v3      | `createStyleSystem()` → `tailwind.config.ts` (plugin + safelist)         |
| [`react-v4`](./react-v4) | Vite + React + Tailwind v4      | `@plugin` + `@theme inline` via `@tailwindcss/vite`                      |
| [`next-v4`](./next-v4)   | Next.js 15 (App Router) + TW v4 | No Vite → prebuild Node script (`generateThemeCss` / `generateSafelist`) |
| [`nuxt-v4`](./nuxt-v4)   | Nuxt 3 (Vue 3) + Tailwind v4    | Nuxt runs on Vite → reuses `styleGenVite` via `nuxt.config.ts`           |

All apps share the same `theme.json`, palettes, cva configs, demo screens and bespoke chrome — only the framework layer and Tailwind wiring differ. `react-*` and `next-v4` reuse the same React `Box`/`Text`/`Button`; `nuxt-v4` rewrites them as Vue SFCs.

## Prerequisites

Build the local library first (the examples consume `dist/` via `file:../..`):

```bash
# From repo root
yarn install
yarn build
```

## Run an example

```bash
cd examples/react-v3   # or react-v4 / next-v4 / nuxt-v4
yarn install           # workspace:* link resolves from the repo-root install
yarn dev
```

Each example exposes `dev`, `build` and `typecheck`. Preview the production build with `yarn preview` (`react-*`, `nuxt-v4`) or `yarn start` (`next-v4`).

## Other files in this folder

`shadcn-theme.json`, `theme.json`, `tailwind.config.ts`, `v4-*`, `test-*.ts` are legacy snippets used during library development and are unrelated to the React examples above.
