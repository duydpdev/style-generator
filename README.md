# @duydpdev/style-generator

**English** · [Tiếng Việt](https://github.com/duydpdev/style-generator/blob/main/documents/vi/README.md)

TypeScript library + CLI that turns a theme JSON into a complete **design system for Tailwind CSS v4**: one generated CSS file (theme variables, dark-mode/palette overrides, typography and spacing utilities, `@source inline` class coverage), typed design tokens, and a JSON Schema for editor autocomplete.

Published on the public npm registry as `@duydpdev/style-generator`; installing needs no token (see [Install](#install)).

> **Upgrading?** Read the migration guides: [6.x → 7.0](https://github.com/duydpdev/style-generator/blob/main/documents/migration/6.x-to-7.0.md), [5.x → 6.0](https://github.com/duydpdev/style-generator/blob/main/documents/migration/5.x-to-6.0.md), [4.x → 5.0](https://github.com/duydpdev/style-generator/blob/main/documents/migration/4.x-to-5.0.md), [3.x → 4.0](https://github.com/duydpdev/style-generator/blob/main/documents/migration/3.x-to-4.0.md).

## Features

- 🎨 **Flat theme config** — every color in one camelCase namespace, validated by a strict Zod schema (unknown keys and unsafe values are errors).
- 🔗 **Aliases** — `"primary": "$blue500"` emits `var(--sg-color-blue-500)`; no duplicated hex values.
- 🌗 **Multi-axis theming** — `themeAxes` generates `html[data-theme="dark"]`, `html[data-palette="forest"]`, … that can be toggled independently.
- ⚡ **One call, one file** — `generate(theme)` returns the CSS you `@import` next to `@import "tailwindcss"`; no `@plugin`, no safelist file.
- 🚀 **CSS-variable spacing** — `.sp-*` utilities with `var()` fallback chains instead of thousands of safelisted classes.
- 🧩 **Typed design tokens + CVA helper** — `createVariantMapper` maps token keys to class names (including `hover:`/`active:` state classes).
- 🖥️ **CLI + plugins** — `style-gen` (`init`, `generate`, `schema`, `tokens`, `doctor`, `budget`), `styleGenVite`, `styleGenNext`.

## Install

The package is on the public npm registry, so no token and no registry configuration are needed:

```bash
yarn add @duydpdev/style-generator
```

> **Installed it from GitHub Packages before (7.1.1 and earlier)?** Remove the `@duydpdev` scope from your project, otherwise the install keeps resolving against GitHub Packages, which gets no new versions:
> delete the `npmScopes.duydpdev` block from `.yarnrc.yml` (Yarn Berry) or the `@duydpdev:registry=https://npm.pkg.github.com` and `//npm.pkg.github.com/:_authToken=…` lines from `.npmrc` (npm, pnpm, Yarn Classic), then run `yarn add @duydpdev/style-generator@latest`.

Peer dependencies and the versions CI tests: [reference/core.md](https://github.com/duydpdev/style-generator/blob/main/documents/reference/core.md#peer-dependencies).

## Quickstart

Start from an app that already builds with Tailwind CSS v4, then:

```bash
yarn style-gen init
```

> **Warning:** Install the package first and always run the CLI through your package manager (`yarn style-gen …`). Never run it through `npx`: the `style-gen` name is unclaimed on the public npm registry, so `npx` can fetch an unrelated package. With npm, use `npm exec --no -- style-gen` so it only resolves your local installation.

`init` writes the theme JSON, its `theme.schema.json` and `style-gen.config.json`, looks for `nuxt.config.*`, `next.config.*` or `vite.config.*` in the project root and prints the snippet for that file and the CSS `@import` lines. It never edits your config: copy the snippet in. For a Vite project it prints this.

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
@source not "../.claude";
```

`@source not` keeps Tailwind from scanning `.claude/rules/style-generator.md`, the [agent contract](https://github.com/duydpdev/style-generator/blob/main/documents/agent-contract.md) `init` writes for coding agents.

Next.js and Nuxt print their own snippets: see [`style-gen init`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/cli.md#style-gen-init), or follow [Next.js](https://github.com/duydpdev/style-generator/blob/main/documents/getting-started/next.md) and [Nuxt + Vue](https://github.com/duydpdev/style-generator/blob/main/documents/getting-started/nuxt-vue.md) step by step.

### No bundler plugin

Without a bundler config, `init` prints the CLI route. The theme goes to `styles/theme.json`:

```bash
yarn style-gen generate            # writes styles/theme.css
yarn style-gen generate --watch    # regenerate on save
```

Import `./theme.css` next to `@import "tailwindcss";` in a CSS file of `styles/`.

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

That is the whole wiring: no `@plugin`, no safelist file. `bg-primary`, `text-primary`, `border-primary`, typography utilities named after the kebab-cased keys (`heading1` → `.heading-1`), `shadow-sm`, `rounded-md`, `.sp-*` spacing utilities and the rest are available. Opacity modifiers such as `bg-primary/10` need steps in `coverage.colors.opacities` ([`options`](https://github.com/duydpdev/style-generator/blob/main/documents/reference/options.md)).

## Documentation

- [Documents index](https://github.com/duydpdev/style-generator/blob/main/documents/README.md)
- [CLI](https://github.com/duydpdev/style-generator/blob/main/documents/reference/cli.md): `init`, `generate`, `doctor`, `schema`, `tokens`, `budget`, flags and the configuration file
- [Subpaths](https://github.com/duydpdev/style-generator/blob/main/documents/reference/core.md#all-exports-by-subpath): the root entry point holds the generator; tokens, CVA, spacing, recipes, plugins and the UI kit live in `./tokens`, `./cva`, `./spacing`, `./recipes`, `./vite`, `./next`, `./ui`, `./ui-react`, `./types`
- [Getting started](https://github.com/duydpdev/style-generator/blob/main/documents/getting-started/react-vite.md): React + Vite, Next.js, Nuxt + Vue
- [Guide](https://github.com/duydpdev/style-generator/blob/main/documents/guide.md) and [cookbook](https://github.com/duydpdev/style-generator/blob/main/documents/cookbook.md)
- [Reference](https://github.com/duydpdev/style-generator/blob/main/documents/reference/core.md): one page per subpath, plus `theme`, `options` and `cli`
- [Migration guides](https://github.com/duydpdev/style-generator/blob/main/documents/README.md#migration)

## Examples

Working apps for React (`plain-react`, `harness`) and Nuxt (`plain-nuxt`) live in [`examples/`](https://github.com/duydpdev/style-generator/blob/main/examples/README.md); the landing site in `site/` uses the same components.

## Contributing

Commit format, branches and releases: [`documents/deploy.md`](https://github.com/duydpdev/style-generator/blob/main/documents/deploy.md). Test layers and the CI pipeline: [`documents/testing.md`](https://github.com/duydpdev/style-generator/blob/main/documents/testing.md).
