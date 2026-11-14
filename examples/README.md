# Examples

Working consumer apps that link `@duydpdev/style-generator` through a Yarn `link:../..` dependency (see `documents/deploy.md` for why it is `link:`) and exercise the public API end-to-end. In every example, `v4` means **Tailwind CSS v4**, not the library's version: each app wires the library through a generated `theme.css` that it `@import`s next to `@import "tailwindcss"`, with no `@plugin` and no safelist file.

Upgrading an existing project? See [`../documents/migration/6.x-to-7.0.md`](../documents/migration/6.x-to-7.0.md), [`../documents/migration/4.x-to-5.0.md`](../documents/migration/4.x-to-5.0.md) and [`../documents/migration/3.x-to-4.0.md`](../documents/migration/3.x-to-4.0.md) (the move to the Tailwind v4 `theme.css` flow).

## Layout

| Package                            | Kind          | What it holds                                                                                                                                                                            |
| ---------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`design-system`](./design-system) | shared, no UI | The theme, the generator `options`, typed tokens, `cn()`, `axisAttributes()`, the headless CVA recipes of the six sample components, the shared CSS and the DX tests. Private workspace. |
| [`harness`](./harness)             | app           | Vite + React 19 + Tailwind v4: `styleGenVite` in `vite.config.ts`, `@tailwindcss/vite`. The live demo of the site and the parity oracle of `plain-react`; no Storybook.                  |
| [`plain-react`](./plain-react)     | app           | Vite + React 19 + Tailwind v4. Plain example with Storybook and the parity gate.                                                                                                         |
| [`plain-nuxt`](./plain-nuxt)       | app           | Nuxt 4 (Vue 3) + Tailwind v4: `styleGenVite` through `nuxt.config.ts`. Plain example: the same landing page as single-file components, with a Vue Storybook.                             |

The harness app (`harness`) shares one `theme.json` (with `"$schema"` and two `themeAxes`, `theme` and `palette`), one `options` module and the CSS from `design-system` (`"design-system-example": "workspace:*"`); it keeps only its wiring (bundler config, global stylesheet) and its demo sections. `harness` renders its six sample components from `src/ui/*.tsx` (the landing site imports the same files through `harness-example/ui`) over the `design-system` recipes. Overrides that combine two axes, and variables outside `--sg-*`, stay hand-written CSS (`palettes.css`, `style-guide.css`); the scope table is in [`design-system/README.md`](./design-system/README.md#theme-axes). Start there to see how the pieces fit.

## Plain examples (copy these)

`plain-react` and `plain-nuxt` render the same landing page from ten one-folder components over `@duydpdev/style-generator/ui`; each owns `theme.json` + `theme.ts`; copy a folder with [Components](../documents/components.md#plain-examples-copy-these).

## Prerequisites

**Node >= 22.18 for the harness app.** Its bundler config imports `design-system-example/style-gen.options`, a `.ts` file inside a workspace package, and Node loads it through its built-in type stripping. (The library itself runs on Node `^20.19.0 || >=22.12.0`; the floor above is for the examples only.) No example has a `postinstall` or `prepare` hook.

Build the local library and the CLI first (the examples consume the built `dist/` through the `link:../..` dependency). The examples are workspaces of the repo root, so the root install also installs them:

```bash
# From repo root
yarn install
yarn build:all
```

## Run an example

```bash
cd examples/harness   # or plain-react / plain-nuxt
yarn dev
```

Each app exposes `dev`, `build` and `typecheck` (`plain-nuxt` also `prepare:nuxt`, `generate`, `preview`); preview a production build with `yarn preview`. The `style-gen` CLI scripts (`generate`, `doctor`, `schema`) live in `design-system`, as do its tests; the other apps have their own checks:

```bash
yarn workspace design-system-example doctor
yarn workspace design-system-example test      # DX test of the recipes; needs `yarn build:all`
yarn workspace plain-react-example test        # stories as browser tests + parity gate; needs `yarn build:all`
yarn workspace plain-nuxt-example test:stories # the app's Storybook stories as browser tests; needs `yarn build:all` and `prepare:nuxt` (local only: CI does not run it)
yarn workspace harness-example typecheck       # type tests of the sample components
```

## Other files in this folder

`shadcn-theme.json` and `theme.json` are standalone theme samples; both must parse with the strict `ThemeSchema` (checked by the example-theme integration test under `src/__integration__/`).
