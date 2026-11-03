# @duydpdev/style-generator

TypeScript library + CLI that turns a theme JSON into a complete **design system for Tailwind CSS v4**: one generated CSS file (theme variables, dark-mode/palette overrides, typography and spacing utilities, `@source inline` class coverage), typed design tokens, and a JSON Schema for editor autocomplete.

Published on **GitHub Packages** as `@duydpdev/style-generator` (installing needs a token, see [Install](#install)).

> **New in 5.2.0:** `style-gen init` detects Vite, Next.js or Nuxt and prints the plugin snippet for your config instead of scaffolding `plugins/theme-plugin.ts`; `--plugin` is gone. A `plugin` key in an existing `style-gen.config.json` still loads. See [`style-gen init`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/cli.md#style-gen-init).
>
> **Upgrading from 4.x?** 5.0.0 is a breaking release (color variables `--sg-<color>` → `--sg-color-<color>`, `@theme`-driven `borderWidth`, array-form `spacing.properties`, `DesignTokens.Web` keys renamed to the theme keys, readonly and options-typed token arrays, stricter typography). Read [`documents/migration/4.x-to-5.0.md`](https://github.com/duydpdev/style-generator/blob/main/documents/migration/4.x-to-5.0.md).
>
> **Upgrading from 3.x?** 4.0.0 is a breaking release (Tailwind v4 only, `generate()` instead of a plugin + safelist, strict theme schema, `themeAxes`). Read [`documents/migration/3.x-to-4.0.md`](https://github.com/duydpdev/style-generator/blob/main/documents/migration/3.x-to-4.0.md).

## Features

- 🎨 **Flat theme config** — every color in one camelCase namespace, validated by a strict Zod schema (unknown keys and unsafe values are errors).
- 🔗 **Aliases** — `"primary": "$blue500"` emits `var(--sg-color-blue-500)`; no duplicated hex values.
- 🌗 **Multi-axis theming** — `themeAxes` generates `html[data-theme="dark"]`, `html[data-palette="forest"]`, … that can be toggled independently.
- ⚡ **One call, one file** — `generate(theme)` returns the CSS you `@import` next to `@import "tailwindcss"`; no `@plugin`, no safelist file.
- 🚀 **CSS-variable spacing** — `.sp-*` utilities with `var()` fallback chains instead of thousands of safelisted classes.
- 🧩 **Typed design tokens + CVA helper** — `createVariantMapper` maps token keys to class names (including `hover:`/`active:` state classes).
- 🖥️ **CLI + plugins** — `style-gen` (`init`, `generate`, `schema`, `tokens`, `doctor`, `budget`), `styleGenVite`, `styleGenNext`.

---

## Install

This package is published to **GitHub Packages**. To install, authenticate with a
GitHub Personal Access Token (classic) that has the `read:packages` scope.

**1. Configure the `@duydpdev` scope** — use the file your package manager reads. Yarn Berry (v2 and later) reads `.yarnrc.yml` and ignores `.npmrc`.

Yarn Berry — add to your project `.yarnrc.yml`:

```yaml
npmScopes:
  duydpdev:
    npmRegistryServer: "https://npm.pkg.github.com"
    npmAlwaysAuth: true
    npmAuthToken: "${GITHUB_PAT}"
```

npm, pnpm and Yarn Classic — add to your project `.npmrc`:

```ini
@duydpdev:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PAT}
```

Set `GITHUB_PAT` in your environment (do not commit the token):

```bash
export GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxx
```

**2. Install:**

```bash
yarn add @duydpdev/style-generator
```

> Access is granted per collaborator. If install returns `404`/`401`, your token
> lacks `read:packages` or you have not been added to the repository.

Peer dependencies and the versions CI tests: [reference/core.md](https://github.com/duydpdev/style-generator/blob/main/documents/reference/core.md#peer-dependencies).

---

## Quickstart

Start from an app that already builds with Tailwind CSS v4, then:

```bash
yarn style-gen init
```

> **Warning:** Install the package first and always run the CLI through your package manager (`yarn style-gen …`). Never run it through `npx`: the `style-gen` name is unclaimed on the public npm registry, so `npx` can fetch an unrelated package. With npm, use `npm exec --no -- style-gen` so it only resolves your local installation.

`init` writes the theme JSON, its `theme.schema.json` and `style-gen.config.json`, looks for `nuxt.config.*`, `next.config.*` or `vite.config.*` in the project root and prints the snippet for that file and the CSS `@import` lines. It never edits your config: copy the snippet in. These are the snippets it prints for a new project.

### Vite

With a `src/` directory the theme goes to `src/styles/theme.json`. Add the plugin before `tailwindcss()`; without arguments it reads `style-gen.config.json`:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

export default defineConfig({
  // No arguments: reads style-gen.config.json (theme, output, options).
  plugins: [styleGenVite(), tailwindcss()],
});
```

The CSS entry your `src/main.*` imports, `src/index.css`:

```css
@import "tailwindcss";
@import "./styles/theme.css";
```

### Next.js

The theme goes to `styles/theme.json` (`src/styles/theme.json` with a `src/` directory). Tailwind runs through `@tailwindcss/postcss` (`postcss.config.mjs`), as in `create-next-app --tailwind`. Wrap your config; `styleGenNext()` reads `style-gen.config.json` and works with webpack and Turbopack:

```ts
// next.config.ts
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";

const nextConfig: NextConfig = {
  /* config options here */
};

// No arguments: reads style-gen.config.json (theme, output, options).
export default styleGenNext()(nextConfig);
```

`app/globals.css`, imported by `app/layout.tsx`:

```css
@import "tailwindcss";
@import "../styles/theme.css";
```

### Nuxt

Nuxt 4 sets Vite's root to `app/`, so the theme goes to `app/assets/css/theme.json` and the plugin gets absolute paths. With explicit paths it does not read `style-gen.config.json` (that file then serves only the CLI): put generator options in `options`.

```ts
// nuxt.config.ts
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [
      // Absolute paths: Nuxt 4 sets Vite's root to app/.
      styleGenVite({
        themePath: fileURLToPath(
          new URL("./app/assets/css/theme.json", import.meta.url),
        ),
        outDir: fileURLToPath(new URL("./app/assets/css", import.meta.url)),
        options: {}, // style-gen.config.json is NOT read when paths are passed; put generate() options here
      }),
      tailwindcss(),
    ],
  },
});
```

Create `app/assets/css/main.css` (`init` does not create it; `css` in `nuxt.config.ts` loads it):

```css
@import "tailwindcss";
@import "./theme.css";
```

### No bundler plugin

Without a bundler config, `init` prints the CLI route. The theme goes to `styles/theme.json`:

```bash
yarn style-gen generate            # writes styles/theme.css
yarn style-gen generate --watch    # regenerate on save
```

A CSS file in `styles/`:

```css
@import "tailwindcss";
@import "./theme.css";
```

### The theme

Colors are a **flat object**; only `colors` is required:

```json
{
  "$schema": "./theme.schema.json",
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#6366F1",
    "background": "#FFFFFF",
    "foreground": "#111827",
    "muted": "#6B7280"
  }
}
```

That is the whole wiring — there is no `@plugin` and no safelist file. `bg-primary`, `text-primary`, `border-primary`, typography utilities named after the kebab-cased keys (`heading1` → `.heading-1`, `text16Medium` → `.text-16-medium`), `shadow-sm`, `rounded-md`, `.sp-*` spacing utilities and the rest are available.

Need opacity modifiers such as `bg-primary/10`? List the steps in `coverage.colors.opacities`, for example `"coverage": { "colors": { "opacities": [10, 20] } }` in `style-gen.config.json` (Nuxt: in the snippet's `options`); see [`documents/reference/options.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/options.md).

---

## Commands

Run each as `yarn style-gen <command>`; flags are in [`documents/reference/cli.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/cli.md).

| Command    | What it does                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------ |
| `init`     | Scaffold the theme, its JSON Schema and `style-gen.config.json`; print the wiring for your stack |
| `generate` | Validate the theme and write `theme.css`                                                         |
| `doctor`   | Check the config, the theme × options pair, utility name clashes and pre-5.0 leftovers           |
| `schema`   | Write `theme.schema.json` for editor autocomplete                                                |
| `tokens`   | Write a keys-only `theme.tokens.ts` for client bundles                                           |
| `budget`   | Fail when the gzip size of the built CSS exceeds a budget                                        |

---

## Subpaths

| Import       | What it holds                                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.`          | `generate`, `defineTheme`, `defineOptions`, `formatZodError` and most other exports; pulls in Zod                                                                    |
| `./tokens`   | `createDesignTokens`, `Breakpoint`, `COLOR_STATES`: browser-safe token constants                                                                                     |
| `./cva`      | `createVariantMapper`, `toKebabCase`: token keys → class names for CVA                                                                                               |
| `./spacing`  | `resolveSpacing`, `resolveSpacingProps`: spacing props → `.sp-*` classes and style                                                                                   |
| `./recipes`  | `createTailwindMergeExtension`, `splitSpacingProps`, `themeAxisAttributes` (not in `.`)                                                                              |
| `./types`    | Types only: `ThemeConfig`, `StyleGeneratorOptions`, the variant types                                                                                                |
| `./vite`     | `styleGenVite`, the Vite plugin (also for Nuxt); Node only                                                                                                           |
| `./next`     | `styleGenNext`, the Next.js config wrapper; Node only                                                                                                                |
| `./ui`       | `recipeFromTables`, `createCn`, `splitLayout`, `mergeStyle`, …: the styleless component kit; needs `class-variance-authority`, `clsx`, `tailwind-merge` (not in `.`) |
| `./ui-react` | Types only: `Polymorphic` for React components; needs `@types/react`                                                                                                 |

Import a subpath as `@duydpdev/style-generator/<name>`; every export by subpath: [`documents/reference/core.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/core.md#all-exports-by-subpath).

---

## Documentation

| Page                                                                                                                                             | What it covers                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`documents/getting-started/react-vite.md`](https://github.com/duydpdev/style-generator/blob/main/documents/getting-started/react-vite.md)       | Getting started: React + Vite                                                                                                                                                                                                                                                                                                                                                                                                               |
| [`documents/getting-started/next.md`](https://github.com/duydpdev/style-generator/blob/main/documents/getting-started/next.md)                   | Getting started: Next.js                                                                                                                                                                                                                                                                                                                                                                                                                    |
| [`documents/getting-started/nuxt-vue.md`](https://github.com/duydpdev/style-generator/blob/main/documents/getting-started/nuxt-vue.md)           | Getting started: Nuxt + Vue                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [`documents/components.md`](https://github.com/duydpdev/style-generator/blob/main/documents/components.md)                                       | Using and authoring the example UI components                                                                                                                                                                                                                                                                                                                                                                                               |
| [`documents/cookbook.md`](https://github.com/duydpdev/style-generator/blob/main/documents/cookbook.md)                                           | Task-sized recipes                                                                                                                                                                                                                                                                                                                                                                                                                          |
| [`documents/guide.md`](https://github.com/duydpdev/style-generator/blob/main/documents/guide.md)                                                 | Step-by-step walkthrough                                                                                                                                                                                                                                                                                                                                                                                                                    |
| [`documents/reference/core.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/core.md)                               | Root barrel: `generate`, `defineTheme`, `defineOptions`, all exports by subpath, peer dependencies                                                                                                                                                                                                                                                                                                                                          |
| [`documents/reference/theme.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/theme.md)                             | Theme config: key grammar, categories, aliases, `themeAxes`, `--sg-*` variables                                                                                                                                                                                                                                                                                                                                                             |
| [`documents/reference/options.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/options.md)                         | `StyleGeneratorOptions`, including `coverage`                                                                                                                                                                                                                                                                                                                                                                                               |
| [`documents/reference/cli.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/cli.md)                                 | `style-gen` commands, flags and the configuration file                                                                                                                                                                                                                                                                                                                                                                                      |
| [`documents/reference/vite.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/vite.md)                               | `styleGenVite` (also used by Nuxt)                                                                                                                                                                                                                                                                                                                                                                                                          |
| [`documents/reference/next.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/next.md)                               | `styleGenNext`                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [`documents/reference/spacing.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/spacing.md)                         | `.sp-*` utilities and `resolveSpacingProps`                                                                                                                                                                                                                                                                                                                                                                                                 |
| [`documents/reference/tokens.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/tokens.md)                           | `createDesignTokens` and the token constants                                                                                                                                                                                                                                                                                                                                                                                                |
| [`documents/reference/cva.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/cva.md)                                 | `createVariantMapper`, `COLOR_STATES`, `toKebabCase`                                                                                                                                                                                                                                                                                                                                                                                        |
| [`documents/reference/types.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/types.md)                             | Exported types                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [`documents/reference/recipes.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/recipes.md)                         | `createTailwindMergeExtension`, `splitSpacingProps`, `themeAxisAttributes`                                                                                                                                                                                                                                                                                                                                                                  |
| [`documents/reference/ui.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/ui.md)                                   | `recipeFromTables`, `createCn`, `splitLayout`, `mergeStyle` and the kit types                                                                                                                                                                                                                                                                                                                                                               |
| [`documents/reference/ui-react.md`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/ui-react.md)                       | `Polymorphic`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| [`documents/migration/4.x-to-5.0.md`](https://github.com/duydpdev/style-generator/blob/main/documents/migration/4.x-to-5.0.md)                   | **4.x → 5.0.0** (breaking): `--sg-color-*`, `borderWidth` via `@theme`, array-form `spacing.properties`, renamed `DesignTokens.Web` keys, readonly/options-typed tokens (`### Types`), typography bounds, the Node runner (`buildStart` emit, no-argument plugins, `resolveProjectPath`), CLI exit codes and strict flags, the `tokens` and `budget` commands, `resetTailwindDefaults`, the reserved `base` variant, `.d.cts` declarations. |
| [`documents/migration/3.x-to-4.0.md`](https://github.com/duydpdev/style-generator/blob/main/documents/migration/3.x-to-4.0.md)                   | **3.x → 4.0.0** (breaking): every removed API, the new theme fields, CLI changes and a rollback runbook.                                                                                                                                                                                                                                                                                                                                    |
| [`documents/migration/4.0-to-4.1.md`](https://github.com/duydpdev/style-generator/blob/main/documents/migration/4.0-to-4.1.md)                   | **4.0 → 4.1** (stricter validation)                                                                                                                                                                                                                                                                                                                                                                                                         |
| [`documents/migration/3.x-subpath-exports.md`](https://github.com/duydpdev/style-generator/blob/main/documents/migration/3.x-subpath-exports.md) | **Subpath exports (3.x)**: historical; explains `moduleResolution` requirements.                                                                                                                                                                                                                                                                                                                                                            |
| [`documents/architecture.md`](https://github.com/duydpdev/style-generator/blob/main/documents/architecture.md)                                   | Source layout, public exports per subpath, CLI commands                                                                                                                                                                                                                                                                                                                                                                                     |
| [`documents/testing.md`](https://github.com/duydpdev/style-generator/blob/main/documents/testing.md)                                             | Test layers and the CI pipeline                                                                                                                                                                                                                                                                                                                                                                                                             |
| [`documents/deploy.md`](https://github.com/duydpdev/style-generator/blob/main/documents/deploy.md)                                               | Commit format, branches and releases                                                                                                                                                                                                                                                                                                                                                                                                        |

Older majors: 2 → 3 removed nested color objects and the `DEFAULT` key (flat camelCase keys only, use `createVariantMapper` for CVA); 1 → 2 flattened the `base`/`text`/`common` color buckets.

---

## Examples

Working apps for Vite + React, Next.js and Nuxt live in [`examples/`](https://github.com/duydpdev/style-generator/blob/main/examples/README.md); the landing site in `site/` uses the same components.

## Contributing

Commit format, branches and releases: [`documents/deploy.md`](https://github.com/duydpdev/style-generator/blob/main/documents/deploy.md). Test layers and the CI pipeline: [`documents/testing.md`](https://github.com/duydpdev/style-generator/blob/main/documents/testing.md).
