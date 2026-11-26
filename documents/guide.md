# User Guide

`@duydpdev/style-generator` compiles one theme JSON into **Tailwind CSS v4** utilities, typed design tokens and a JSON Schema, in a single `generate()` call. It supports Tailwind v4 only (`tailwindcss ^4.1.0`). This page is the overview: it shows how the pieces fit and sends you to the page that owns each task.

- [How it works](#how-it-works)
- [The eight steps](#the-eight-steps)
- [Where to find what](#where-to-find-what)
- [Rules that hold everywhere](#rules-that-hold-everywhere)

## How it works

```text
theme.json + style-gen.config.json
        │
        ▼  generate()  (run by the plugin or the CLI)
theme.css          → @import it next to `@import "tailwindcss"`   (git-ignored)
theme.tokens.ts    → typed token keys for app code               (committed)
theme.schema.json  → editor autocomplete for the theme           (optional)
```

- `theme.json` holds the design tokens; only `colors` is required. The theme is checked by a strict schema: unknown keys, unsafe values and broken aliases are rejected before any CSS is written.
- `style-gen.config.json` holds every generator option (`theme`, `output`, `tokensOutput`, `breakpoints`, `coverage`, …). The CLI and both bundler plugins read the same file.
- `theme.css` is one file with the `--sg-*` variables, the `@theme inline` mapping, `@utility` blocks and the `@source inline` lines that keep every token's classes in the build. No `@plugin`, no safelist.
- `theme.tokens.ts` exports `tokens`, `Tokens`, `themeAxes` and `ThemeAxesState`. Components import from it instead of the theme JSON, so the client bundle carries no Zod and no Node code.

## The eight steps

1. **Install** the package and its peers ([README](../README.md#install)).
2. **Write the theme** in `theme.json`: colors first, then typography, shadows, radius, fonts, border widths and `themeAxes` ([Theme config](./reference/theme.md)).
3. **Write `style-gen.config.json`**, or let `yarn style-gen init` scaffold it ([CLI](./reference/cli.md#style-gen-init)).
4. **Wire one call, without arguments**: `styleGenVite()` in `vite.config.ts`, `styleGenNext()(nextConfig)` in `next.config.ts`, or `yarn style-gen generate` when there is no bundler plugin ([Vite and Nuxt](./reference/vite.md), [Next.js](./reference/next.md)).
5. **Import `theme.css`** next to `@import "tailwindcss"` and commit `theme.tokens.ts`.
6. **Build components** over the typed tokens: recipes, `cn`, spacing and layout props ([Build components](./getting-started/build-components.md)).
7. **Switch themes** by putting `data-<axis>="<variant>"` attributes on `<html>` ([Theme axes](./reference/theme.md#multi-axis-theming-themeaxes), [dark mode recipe](./cookbook.md#dark-mode-toggle)).
8. **Guard it in CI**: `style-gen generate --check`, `style-gen doctor` and `style-gen budget` ([CLI](./reference/cli.md)).

## Where to find what

| I want to …                                  | Go to                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| install the package                          | [README → Install](../README.md#install)                                                               |
| set up a React + Vite app                    | [Getting started: React + Vite](./getting-started/react-vite.md)                                       |
| set up a Next.js app                         | [Getting started: Next.js](./getting-started/next.md)                                                  |
| set up a Nuxt app                            | [Getting started: Nuxt + Vue](./getting-started/nuxt-vue.md)                                           |
| write a theme: keys, aliases, states, axes   | [Theme config](./reference/theme.md)                                                                   |
| change which CSS is emitted                  | [Options](./reference/options.md)                                                                      |
| build components from the theme              | [Build components](./getting-started/build-components.md)                                              |
| add a dark mode toggle                       | [Cookbook → Dark mode toggle](./cookbook.md#dark-mode-toggle)                                          |
| use spacing props                            | [Spacing](./reference/spacing.md)                                                                      |
| share one theme between several apps         | [Cookbook → One theme shared by several apps](./cookbook.md#one-theme-shared-by-several-apps-monorepo) |
| fail CI when the CSS grows                   | [Cookbook → Fail CI when the CSS grows](./cookbook.md#fail-ci-when-the-css-grows)                      |
| run the CLI: `init`, `generate`, `doctor`, … | [CLI](./reference/cli.md)                                                                              |
| call `generate()` from my own script         | [Core API → `generate`](./reference/core.md#generate)                                                  |
| understand an error message                  | [Troubleshooting](./troubleshooting.md)                                                                |
| copy ready-made components                   | [Components](./components.md)                                                                          |
| let a coding agent follow the conventions    | [Agent contract](./agent-contract.md)                                                                  |
| look up the peer dependency ranges           | [Core API → Peer dependencies](./reference/core.md#peer-dependencies)                                  |
| upgrade from 8.x                             | [Migration 8.x → 9.0](./migration/8.x-to-9.0.md)                                                       |
| upgrade from 7.x                             | [Migration 7.x → 8.0](./migration/7.x-to-8.0.md)                                                       |

## Rules that hold everywhere

- **Tokens are flat camelCase keys**: `blue500` becomes `--color-blue-500` and `bg-blue-500`; nested objects and `DEFAULT` are not supported. `_` is rejected in every name ([Key rules](./reference/theme.md#key-rules)).
- **Aliases stay inside one category**: `"$blue500"` in `colors` points at `colors.blue500`.
- **Paths**: `theme` may point outside the project (a shared theme package); `output` and `tokensOutput` must stay inside it.
- **Themes switch on `<html>`**: the selector is pinned to `html` and the attribute is `data-<axis-kebab>`; neither is configurable.
- **Commit `theme.tokens.ts`, ignore `theme.css`.**

Control line for the docs-only path.
