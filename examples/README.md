# Examples

Working consumer apps that link `@duydpdev/style-generator` through a Yarn `link:../..` dependency (see `documents/deploy.md` for why it is `link:`) and exercise the public API end-to-end. In every example, `v4` means **Tailwind CSS v4**, not the library's version: each app wires the library through a generated `theme.css` that it `@import`s next to `@import "tailwindcss"`, with no `@plugin` and no safelist file.

Upgrading an existing project? See [`../documents/migration/4.x-to-5.0.md`](../documents/migration/4.x-to-5.0.md) (current) and [`../documents/migration/3.x-to-4.0.md`](../documents/migration/3.x-to-4.0.md) (the move to the Tailwind v4 `theme.css` flow).

## Layout

| Package                            | Kind          | What it holds                                                                                                                                                 |
| ---------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`design-system`](./design-system) | shared, no UI | The theme, the generator `options`, typed tokens, `cn()`, `axisAttributes()`, eight headless CVA recipes, the shared CSS and the DX tests. Private workspace. |
| [`react-v4`](./react-v4)           | app           | Vite + React 19 + Tailwind v4: `styleGenVite` in `vite.config.ts`, `@tailwindcss/vite`.                                                                       |
| [`next-v4`](./next-v4)             | app           | Next.js 16 (App Router) + Tailwind v4: no Vite, so `styleGenNext` in `next.config.ts` (webpack and Turbopack), `@tailwindcss/postcss`.                        |
| [`nuxt-v4`](./nuxt-v4)             | app           | Nuxt 4 (Vue 3) + Tailwind v4: Nuxt runs on Vite, so it reuses `styleGenVite` through `nuxt.config.ts`.                                                        |

The three apps share one `theme.json` (with `"$schema"` and two `themeAxes`, `theme` and `palette`), one `options` module, the recipes and the CSS from `design-system` (`"design-system-example": "workspace:*"`); each keeps only its wiring (bundler config, global stylesheet) and its framework-specific components (the React `Box`/`Text`/`Button` and demo sections in `react-v4`, a theme switch in `next-v4` and `nuxt-v4`). Overrides that combine two axes, and variables outside `--sg-*`, stay hand-written CSS (`palettes.css`, `style-guide.css`); the scope table is in [`design-system/README.md`](./design-system/README.md#theme-axes). Start there to see how the pieces fit.

## Prerequisites

**Node >= 22.18.** The bundler configs import `design-system-example/style-gen.options`, a `.ts` file inside a workspace package, and Node loads it through its built-in type stripping. (The library itself runs on Node `^20.19.0 || >=22.12.0`; the floor above is for the examples only.) No example has a `postinstall` or `prepare` hook.

Build the local library and the CLI first (the examples consume the built `dist/` through the `link:../..` dependency). The examples are workspaces of the repo root, so the root install also installs them:

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

Each app exposes `dev`, `build` and `typecheck` (`nuxt-v4` also `prepare:nuxt`, `generate`, `preview`); preview a production build with `yarn preview` (`react-v4`, `nuxt-v4`) or `yarn start` (`next-v4`). The `style-gen` CLI scripts (`generate`, `doctor`, `schema`) and the tests live in `design-system`:

```bash
yarn workspace design-system-example doctor
yarn workspace design-system-example test      # needs `yarn build:all`
```

## Other files in this folder

`shadcn-theme.json` and `theme.json` are standalone theme samples; both must parse with the strict `ThemeSchema` (checked by the example-theme integration test under `src/__integration__/`).
