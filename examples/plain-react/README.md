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

| Folder    | Component | Notes                                                                            |
| --------- | --------- | -------------------------------------------------------------------------------- |
| `box/`    | `Box`     | Token, size and spacing props; `innerBorder` draws a 1px overlay frame           |
| `text/`   | `Text`    | `type`, `color`, `align`, `decoration`; defaults `text16Medium` and `foreground` |
| `stack/`  | `Stack`   | One column of items                                                              |
| `flex/`   | `Flex`    | A row of two or more items                                                       |
| `grid/`   | `Grid`    | `columns`: a count or a CSS track list, per breakpoint                           |
| `button/` | `Button`  | `variant` × `color` (intent) × `size`, optional `prefix`/`suffix`                |

## Add a component

Create `src/ui/<kebab-name>/` with `style.ts` (tables + recipe via `recipeFromTables` from `@duydpdev/style-generator/ui`), `types.ts` (`<Name>OwnProps`, `<Name>Props`), `<Name>.tsx` and `index.ts`. Write classes that no token mapper produces (opacity modifiers such as `bg-primary/10`, `outline-*`) as literal strings in `style.ts`, so Tailwind's scanner finds them; token classes are covered by the generated `@source inline` lines. `yarn check:plain-ui` (repo root) checks the folder layout and the import rule.

## Storybook, tests and the parity gate

- `yarn workspace plain-react-example storybook`: the catalogue at http://localhost:6006 (each `src/ui/<name>/<Name>.stories.tsx`).
- `yarn workspace plain-react-example test`: every story runs as a Vitest browser test, and the parity gate (`tests/parity/`) checks that Box, Text, Stack, Flex, Grid and Button render the same classes as the harness components in `examples/react-v4`. Needs `yarn build:all` and `yarn playwright install chromium` once.
- `node examples/plain-react/scripts/copy-out-smoke.mjs`: proves that `src/ui/button/` plus `src/theme.ts` and `src/theme/theme.json` compile in a fresh project with only `@duydpdev/style-generator`, `class-variance-authority`, `clsx`, `tailwind-merge` and React.

Adding a component: create its folder with a story. Only the six shared components have a parity test, because only they have a harness twin.
