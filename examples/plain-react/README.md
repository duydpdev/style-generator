# plain-react example

A Vite + React 19 + Tailwind CSS v4 app whose components are plain folders you can copy. A folder in `src/ui/` depends only on `src/theme.ts`, `src/theme/theme.json` and the packages below.

## Run it

```bash
yarn install
yarn build:all                               # at the repo root: the example links the built library
yarn workspace plain-react-example dev
```

`styleGenVite` (`vite.config.ts`) writes `src/theme/theme.css` from `src/theme/theme.json` on `dev` and `build`. The file is generated and git-ignored.

## Copy a component into your app

1. Install the package and the libraries a copied folder uses: `yarn add @duydpdev/style-generator@^5.3.0 class-variance-authority clsx tailwind-merge`, plus `react` and `@types/react`. `@duydpdev/style-generator` is served by GitHub Packages, so set up the `@duydpdev` scope and a token first (the [Install](../../README.md#install) section of the repository README); without the scope config npmjs serves an unrelated `3.0.0`.
2. Copy `src/theme/theme.json` (or use your own theme) and `src/theme.ts`. If you pass generator options to `styleGenVite`, pass the same object as the second argument of `createDesignTokens` in `theme.ts`.
3. Wire the generator: `styleGenVite({ themePath: "src/theme/theme.json", outDir: "src/theme" })` in `vite.config.ts`, and `@import "tailwindcss";` + `@import "./theme/theme.css";` in your CSS entry.
4. Copy one folder, for example `src/ui/button/`. A folder imports only its own files, `../../theme` and the packages, so nothing else comes with it.

## Components

Every folder is self-contained: it imports only the package, `react`, `../../theme` and its own files (`yarn check:plain-ui` enforces this). Copying `card/` needs nothing else from this app.

To use a folder in your own app: `yarn add @duydpdev/style-generator@^5.3.0 class-variance-authority clsx tailwind-merge`, then copy the folder plus `src/theme.ts` and `src/theme/theme.json`. The package comes from GitHub Packages, so set up the scope registry and token first ([root README, Install](../../README.md#install)); without that config npmjs serves an unrelated `3.0.0`.

| Folder           | Component | Parity gate | Notes                                                                            |
| ---------------- | --------- | ----------- | -------------------------------------------------------------------------------- |
| `src/ui/box/`    | `Box`     | yes         | Token, size and spacing props; `innerBorder` draws a 1px overlay frame           |
| `src/ui/text/`   | `Text`    | yes         | `type`, `color`, `align`, `decoration`; defaults `text16Medium` and `foreground` |
| `src/ui/stack/`  | `Stack`   | yes         | One column of items                                                              |
| `src/ui/flex/`   | `Flex`    | yes         | A row of two or more items                                                       |
| `src/ui/grid/`   | `Grid`    | yes         | `columns`: a count or a CSS track list, per breakpoint                           |
| `src/ui/button/` | `Button`  | yes         | `variant` × `color` (intent) × `size`, optional `prefix`/`suffix`                |
| `src/ui/card/`   | `Card`    | no          | tone, padding, radius, shadow, border                                            |
| `src/ui/badge/`  | `Badge`   | no          | color × variant (`soft`, `solid`, `outline`)                                     |
| `src/ui/input/`  | `Input`   | no          | native `<input>`; `size`, `invalid` (sets `aria-invalid`)                        |
| `src/ui/link/`   | `Link`    | no          | tone, underline; `as` for a router link or a button                              |

"Parity gate: yes" means `tests/parity/<folder>.parity.test.tsx` checks that the component renders the same classes as the harness component in `examples/react-v4`. `Card`, `Badge`, `Input` and `Link` exist only in the plain examples, so their stories are their only check.

## Landing page

`src/App.tsx` is a landing page built from the ten components: a header with `ThemeSwitch`, then `src/sections/` `Hero`, `Features`, `Pricing`, `Cta` and `Footer`. The copy lives in `src/sections/content.ts`. `Section`, `Container` and `SectionHead` are app helpers for patterns the page repeats; one-off layout is `className` on the element. `src/ThemeSwitch.tsx` sets `data-theme="dark"` on `<html>` through `themeAxisAttributes` from `@duydpdev/style-generator/recipes`. Every section has a story under `Sections/`, and the whole page is `Pages/Landing`.

## Add a component

Create `src/ui/<kebab-name>/` with `style.ts` (tables + recipe via `recipeFromTables` from `@duydpdev/style-generator/ui`), `types.ts` (`<Name>OwnProps`, `<Name>Props`), `<Name>.tsx` and `index.ts`. Write classes that no token mapper produces (opacity modifiers such as `bg-primary/10`, `outline-*`) as literal strings in `style.ts`, so Tailwind's scanner finds them; token classes are covered by the generated `@source inline` lines. `yarn check:plain-ui` (repo root) checks the folder layout and the import rule.

## Storybook, tests and the parity gate

- `yarn workspace plain-react-example storybook`: the catalogue at http://localhost:6006 (each `src/ui/<name>/<Name>.stories.tsx`).
- `yarn workspace plain-react-example test`: every story runs as a Vitest browser test, and the parity gate (`tests/parity/`) checks that Box, Text, Stack, Flex, Grid and Button render the same classes as the harness components in `examples/react-v4`. Needs `yarn build:all` and `yarn playwright install chromium` once.
- `node examples/plain-react/scripts/copy-out-smoke.mjs`: proves that `src/ui/button/` plus `src/theme.ts` and `src/theme/theme.json` compile in a fresh project with only `@duydpdev/style-generator`, `class-variance-authority`, `clsx`, `tailwind-merge` and React.

Adding a component: create its folder with a story. Only the six shared components have a parity test, because only they have a harness twin.
