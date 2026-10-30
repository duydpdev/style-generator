# @duydpdev/style-generator

TypeScript library + CLI that turns a theme JSON into a complete **design system for Tailwind CSS v4**: one generated CSS file (theme variables, dark-mode/palette overrides, typography and spacing utilities, `@source inline` class coverage), typed design tokens, and a JSON Schema for editor autocomplete.

Published on **GitHub Packages** as `@duydpdev/style-generator` (installing needs a token, see [Install](#install)).

> **Upgrading from 4.x?** 5.0.0 is a breaking release (color variables `--sg-<color>` → `--sg-color-<color>`, `@theme`-driven `borderWidth`, array-form `spacing.properties`, `DesignTokens.Web` keys renamed to the theme keys, readonly and options-typed token arrays, stricter typography). Read [`documents/migration/4.x-to-5.0.md`](./documents/migration/4.x-to-5.0.md).
>
> **Upgrading from 3.x?** 4.0.0 is a breaking release (Tailwind v4 only, `generate()` instead of a plugin + safelist, strict theme schema, `themeAxes`). Read [`documents/migration/3.x-to-4.0.md`](./documents/migration/3.x-to-4.0.md).

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
# or
npm install @duydpdev/style-generator
```

> Access is granted per collaborator. If install returns `404`/`401`, your token
> lacks `read:packages` or you have not been added to the repository.

Peer dependencies and the versions CI tests: [reference/core.md](./documents/reference/core.md#peer-dependencies).

---

## Quickstart

```bash
yarn style-gen init
```

> **Warning:** Install the package first and always run the CLI through your package manager (`yarn style-gen …`). Never run it through `npx`: the `style-gen` name is unclaimed on the public npm registry, so `npx` can fetch an unrelated package. With npm, use `npm exec --no -- style-gen` so it only resolves your local installation.

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

```bash
yarn style-gen generate            # writes styles/theme.css
yarn style-gen generate --watch    # regenerate on save
yarn style-gen schema              # writes theme.schema.json next to the theme (editor autocomplete)
```

```css
@import "tailwindcss";
@import "./theme.css";
```

That is the whole wiring — there is no `@plugin` and no safelist file. `bg-primary`, `text-primary`, `border-primary`, typography utilities named after the kebab-cased keys (`heading1` → `.heading-1`, `text16Medium` → `.text-16-medium`), `shadow-sm`, `rounded-md`, `.sp-*` spacing utilities and the rest are available.

Prefer no CLI step? Use [`styleGenVite`](./documents/reference/vite.md) or [`styleGenNext`](./documents/reference/next.md), which write the same file for you.

---

## Documentation

| Page                                                                                         | What it covers                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`documents/getting-started/react-vite.md`](./documents/getting-started/react-vite.md)       | Getting started: React + Vite                                                                                                                                                                                                                                                                                                                                                                                                               |
| [`documents/getting-started/next.md`](./documents/getting-started/next.md)                   | Getting started: Next.js                                                                                                                                                                                                                                                                                                                                                                                                                    |
| [`documents/getting-started/nuxt-vue.md`](./documents/getting-started/nuxt-vue.md)           | Getting started: Nuxt + Vue                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [`documents/components.md`](./documents/components.md)                                       | Using and authoring the example UI components                                                                                                                                                                                                                                                                                                                                                                                               |
| [`documents/cookbook.md`](./documents/cookbook.md)                                           | Task-sized recipes                                                                                                                                                                                                                                                                                                                                                                                                                          |
| [`documents/guide.md`](./documents/guide.md)                                                 | Step-by-step walkthrough                                                                                                                                                                                                                                                                                                                                                                                                                    |
| [`documents/reference/core.md`](./documents/reference/core.md)                               | Root barrel: `generate`, `defineTheme`, `defineOptions`, all exports by subpath, peer dependencies                                                                                                                                                                                                                                                                                                                                          |
| [`documents/reference/theme.md`](./documents/reference/theme.md)                             | Theme config: key grammar, categories, aliases, `themeAxes`, `--sg-*` variables                                                                                                                                                                                                                                                                                                                                                             |
| [`documents/reference/options.md`](./documents/reference/options.md)                         | `StyleGeneratorOptions`, including `coverage`                                                                                                                                                                                                                                                                                                                                                                                               |
| [`documents/reference/cli.md`](./documents/reference/cli.md)                                 | `style-gen` commands, flags and the configuration file                                                                                                                                                                                                                                                                                                                                                                                      |
| [`documents/reference/vite.md`](./documents/reference/vite.md)                               | `styleGenVite` (also used by Nuxt)                                                                                                                                                                                                                                                                                                                                                                                                          |
| [`documents/reference/next.md`](./documents/reference/next.md)                               | `styleGenNext`                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [`documents/reference/spacing.md`](./documents/reference/spacing.md)                         | `.sp-*` utilities and `resolveSpacingProps`                                                                                                                                                                                                                                                                                                                                                                                                 |
| [`documents/reference/tokens.md`](./documents/reference/tokens.md)                           | `createDesignTokens` and the token constants                                                                                                                                                                                                                                                                                                                                                                                                |
| [`documents/reference/cva.md`](./documents/reference/cva.md)                                 | `createVariantMapper`, `COLOR_STATES`, `toKebabCase`                                                                                                                                                                                                                                                                                                                                                                                        |
| [`documents/reference/types.md`](./documents/reference/types.md)                             | Exported types                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [`documents/reference/recipes.md`](./documents/reference/recipes.md)                         | `createTailwindMergeExtension`, `splitSpacingProps`, `themeAxisAttributes`                                                                                                                                                                                                                                                                                                                                                                  |
| [`documents/migration/4.x-to-5.0.md`](./documents/migration/4.x-to-5.0.md)                   | **4.x → 5.0.0** (breaking): `--sg-color-*`, `borderWidth` via `@theme`, array-form `spacing.properties`, renamed `DesignTokens.Web` keys, readonly/options-typed tokens (`### Types`), typography bounds, the Node runner (`buildStart` emit, no-argument plugins, `resolveProjectPath`), CLI exit codes and strict flags, the `tokens` and `budget` commands, `resetTailwindDefaults`, the reserved `base` variant, `.d.cts` declarations. |
| [`documents/migration/3.x-to-4.0.md`](./documents/migration/3.x-to-4.0.md)                   | **3.x → 4.0.0** (breaking): every removed API, the new theme fields, CLI changes and a rollback runbook.                                                                                                                                                                                                                                                                                                                                    |
| [`documents/migration/4.0-to-4.1.md`](./documents/migration/4.0-to-4.1.md)                   | **4.0 → 4.1** (stricter validation)                                                                                                                                                                                                                                                                                                                                                                                                         |
| [`documents/migration/3.x-subpath-exports.md`](./documents/migration/3.x-subpath-exports.md) | **Subpath exports (3.x)**: historical; explains `moduleResolution` requirements.                                                                                                                                                                                                                                                                                                                                                            |
| [`documents/architecture.md`](./documents/architecture.md)                                   | Source layout, public exports per subpath, CLI commands                                                                                                                                                                                                                                                                                                                                                                                     |
| [`documents/testing.md`](./documents/testing.md)                                             | Test layers and the CI pipeline                                                                                                                                                                                                                                                                                                                                                                                                             |
| [`documents/deploy.md`](./documents/deploy.md)                                               | Commit format, branches and releases                                                                                                                                                                                                                                                                                                                                                                                                        |

Older majors: 2 → 3 removed nested color objects and the `DEFAULT` key (flat camelCase keys only, use `createVariantMapper` for CVA); 1 → 2 flattened the `base`/`text`/`common` color buckets.

---

## Examples

Working apps for Vite + React, Next.js and Nuxt live in [`examples/`](./examples/README.md); the landing site in `site/` uses the same components.

## Contributing

Commit format, branches and releases: [`documents/deploy.md`](./documents/deploy.md). Test layers and the CI pipeline: [`documents/testing.md`](./documents/testing.md).
