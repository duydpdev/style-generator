# @duydpdev/style-generator

TypeScript library + CLI that turns a theme JSON into a complete **design system for Tailwind CSS v4**: one generated CSS file (theme variables, dark-mode/palette overrides, typography and spacing utilities, `@source inline` class coverage), typed design tokens, and a JSON Schema for editor autocomplete.

Published on **GitHub Packages** as `@duydpdev/style-generator` (private — requires access, see Installation).

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

## 1. Installation

This package is published to **GitHub Packages** under a **private** repository.
To install you must be a repository collaborator and authenticate with a GitHub
Personal Access Token (classic) that has the `read:packages` scope.

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

Peer dependencies (`typescript` and `vite` are optional: install them only if you type-check against the package or use `styleGenVite`):

| Peer          | Range                                   | Tested in CI                      | Notes                                                                                             |
| ------------- | --------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `node`        | `^20.19.0 \|\| >=22.12.0`               | 20.19.0 (built-package smoke), 22 | Unflagged `require(esm)`, so the CJS entries can load the ESM-only `chokidar@5`.                  |
| `tailwindcss` | `>=4.1.0`                               | 4.1.x, 4.3.0                      | Tailwind v3 is not supported. `@source inline(...)` needs 4.1+.                                   |
| `typescript`  | `^5 \|\| ^6` (optional)                 | 5.9, 6.0                          | For type-checking against the package's `.d.ts`. TypeScript 7 (native port) is not supported yet. |
| `vite`        | `^5 \|\| ^6 \|\| ^7 \|\| ^8` (optional) | 5.4, 6.4, 7.3, 8.3                | Only for `styleGenVite` (also used by Nuxt).                                                      |

CI runs the latest release of each major in "Tested in CI"; the floor of a range (for example `vite@5.0.0`) is not tested. The `check` job covers the lockfile versions (Vite 7.3, TypeScript 5.9). The `peer-matrix` job covers Vite 5, 6 and 8 and TypeScript 6: it builds `examples/react-v4`, runs a Vite dev server that re-emits on a theme edit, and type-checks the example and `dist/*.d.ts`. A failing leg for a published major fails CI. TypeScript 7 runs as an experimental leg that may fail; it currently stops at install, because Yarn's built-in `compat/typescript` patch does not apply to `typescript@7`, so it makes no compatibility claim either way (see [`documents/testing.md`](./documents/testing.md)).

`zod` is a regular dependency of the package; you do not install it yourself.

### Subpath exports

For tree-shaking, import from subpaths instead of the root barrel:

```ts
// Generator + validated theme helpers (pulls in Zod) — root barrel only
import {
  generate,
  defineTheme,
  defineOptions,
} from "@duydpdev/style-generator";

// Browser-safe (no Zod, no Node built-ins)
import {
  createDesignTokens,
  COLOR_STATES,
} from "@duydpdev/style-generator/tokens";
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import { resolveSpacingProps } from "@duydpdev/style-generator/spacing";

// Component-side recipes (no Zod; tailwind-merge stays your own dependency)
import {
  createTailwindMergeExtension,
  splitSpacingProps,
  themeAxisAttributes,
} from "@duydpdev/style-generator/recipes";
import type {
  ThemeConfig,
  ColorVariant,
} from "@duydpdev/style-generator/types";

// Build-tool integrations (Node only)
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { styleGenNext } from "@duydpdev/style-generator/next";
```

Requires `tsconfig.json#compilerOptions.moduleResolution` = `"bundler"`, `"node16"`, or `"nodenext"`; **`"node10"` (the legacy `"node"`) is unsupported**: the package has no `typesVersions`, so the subpaths do not resolve there. The ESM and CJS builds each ship their own declaration file (`.d.ts` for `import`, `.d.cts` for `require`), so a CommonJS consumer under `node16`/`nodenext` resolves types instead of hitting the "masquerading as ESM" mismatch (`yarn check:types-pack` verifies it with `@arethetypeswrong/cli`). `dist/*.d.cts` is its `.d.ts` with one rewrite: the `vite` import becomes a type-only `import type { Plugin } from 'vite' assert { 'resolution-mode': 'import' }`, because Vite has no usable CommonJS types (5/6 ship an `export = any` stub, 7/8 are ESM-only). `yarn typecheck:dist` type-checks the `.d.cts` as a CommonJS consumer (`module: node16`, `skipLibCheck: false`). On TypeScript 5.0–5.2 that one `assert` line is reported (`TS4125`) when a CommonJS consumer sets `skipLibCheck: false`; `skipLibCheck: true`, the default in most setups, and TypeScript >= 5.3 are unaffected. See [`documents/migration/3.x-subpath-exports.md`](./documents/migration/3.x-subpath-exports.md) for the background and [`documents/migration/3.x-to-4.0.md`](./documents/migration/3.x-to-4.0.md) for what changed in 4.0.0.

---

## 2. Quick Start

### Step 1. Scaffold

```bash
yarn style-gen init
```

> **Warning:** Install the package first and always run the CLI through your package manager (`yarn style-gen …`). Never run it through `npx`: the `style-gen` name is unclaimed on the public npm registry, so `npx` can fetch an unrelated package. With npm, use `npm exec --no -- style-gen` so it only resolves your local installation.

The wizard asks for the theme file location (default `styles/theme.json`), the location of the generator script (default `plugins/theme-plugin.ts`) and whether to include a dark-mode template. Non-interactive: `yarn style-gen init --dark`. It writes the theme, its `theme.schema.json` (for the theme's `"$schema"`), a small script that calls `generate()`, and `style-gen.config.json` (merging `theme`, `plugin` and `output` into an existing one and keeping its other keys). If the theme, its schema or the script already exists, it asks before overwriting (non-interactive: exits with code 1). The script and `style-gen generate` write the same file, `theme.css` next to the theme; run either one (`node plugins/theme-plugin.ts` needs Node >= 22.18, which strips the types). Type-checking the script needs `"module": "esnext"`, `"nodenext"` or `"preserve"` with `resolveJsonModule`, because it imports the theme `with { type: "json" }`.

### Step 2. Edit the theme

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
  },
  "typography": {
    "heading1": {
      "fontSize": "32px",
      "lineHeight": "120%",
      "fontWeight": 700,
      "letterSpacing": "-0.02em"
    }
  },
  "shadows": { "sm": "0px 1px 2px rgba(0, 0, 0, 0.05)" },
  "borderRadius": { "sm": "4px", "md": "8px", "lg": "12px" }
}
```

### Step 3. Generate the CSS

```bash
yarn style-gen generate            # writes styles/theme.css
yarn style-gen generate --watch    # regenerate on save
yarn style-gen schema              # writes theme.schema.json next to the theme (editor autocomplete)
```

### Step 4. Import it next to Tailwind

```css
@import "tailwindcss";
@import "./theme.css";
```

That is the whole wiring — there is no `@plugin` and no safelist file. `bg-primary`, `text-primary`, `border-primary`, typography utilities named after the kebab-cased keys (`heading1` → `.heading-1`, `text16Medium` → `.text-16-medium`), `shadow-sm`, `rounded-md`, `.sp-*` spacing utilities and the rest are available.

Prefer no CLI step? Use [`styleGenVite`](#5-build-tool-integrations) or [`styleGenNext`](#5-build-tool-integrations), which write the same file for you.

---

## 3. CLI Reference

### Commands

#### `style-gen init`

Scaffold the theme JSON, its JSON Schema, a generator script and `style-gen.config.json`.

```bash
yarn style-gen init            # Interactive mode
yarn style-gen init --dark     # Non-interactive, with a themeAxes.theme.dark template
```

| Flag       | Type      | Default                   | Description                         |
| :--------- | :-------- | :------------------------ | :---------------------------------- |
| `--theme`  | `string`  | `styles/theme.json`       | Path to the theme file              |
| `--plugin` | `string`  | `plugins/theme-plugin.ts` | Path to the generator script        |
| `--dark`   | `boolean` | `false`                   | Include the dark-mode axis template |

(Both defaults become `src/…` when a `src/` directory exists.)

#### `style-gen generate`

Validate the theme and write the complete CSS (`@theme`, `:root` variables, axis overrides, `@theme inline`, `@utility` blocks, `@source inline`).

```bash
yarn style-gen generate
yarn style-gen generate --theme ./theme.json --out ./theme.css --watch
```

| Flag            | Type      | Default             | Description                          |
| :-------------- | :-------- | :------------------ | :----------------------------------- |
| `--theme`       | `string`  | `styles/theme.json` | Path to the theme JSON file          |
| `--out`         | `string`  | `styles/theme.css`  | Path to the output CSS file          |
| `-w`, `--watch` | `boolean` | `false`             | Watch mode — auto-regenerate on save |

Positional `style-gen generate <theme> <out>` also works; flags take precedence. The file is written atomically and **only when its content changed** (a re-run on an unchanged theme does not touch the file, so file watchers stay quiet). `--theme` may point outside the project (a shared design-system package); `--out` and the config `output` must stay inside it (`output escapes project root: <path>`). An invalid theme (`Invalid theme (<path>):`), invalid options (`Invalid options:`) or theme × options pair (`Invalid theme/options:`), an invalid config file (`Invalid config (<file>):` followed by one `path → message` line per issue, for example `extraSources.<i>` for a bad `extraSources` entry or `breakpoint` for a typo) or a write error leaves the output untouched and exits with code 1. A malformed (not JSON) config file is warned about and the defaults are used.

`--watch` re-runs on every change of the theme **and of the config file** (`style-gen.config.json`, or the `package.json` it came from). The config is re-read on each change, so a new `output`, `breakpoints`, `resetTailwindDefaults` … apply without a restart; an invalid config edit is reported and the **last valid config stays in effect** until the file is fixed. A theme that cannot be read at startup (missing file, a directory) or an invalid config at startup exits with code 1 before any watcher starts; once watching, a theme or write error is logged and watching continues.

#### `style-gen schema`

Write the theme's JSON Schema (from `z.toJSONSchema(ThemeSchema)`) so editors can autocomplete keys and flag unknown ones when the theme declares `"$schema"`. Without `--out` it writes `theme.schema.json` next to the configured `theme` (default `styles/theme.json`), where `"$schema": "./theme.schema.json"` looks for it; the config file is then read as `generate` reads it, so a schema-invalid config exits with code 1 and writes nothing.

```bash
yarn style-gen schema                            # → styles/theme.schema.json (next to the theme)
yarn style-gen schema --out styles/theme.schema.json
```

#### `style-gen doctor`

Check the setup: config file (a malformed `style-gen.config.json` or `package.json["style-gen"]` is an error — `generate` warns and uses the defaults — and so is a schema-invalid one: config keys and option values are validated with the same schema as `generate()`, so both commands give the same verdict, and `doctor` prints `Config (<file>) ❌ Invalid` followed by the issues; **a config error stops `doctor` there**, because every later check would run against the wrong defaults), JSON syntax, `ThemeSchema` validation (each issue printed as `path → message`), **the theme × options pair** (`❌ Invalid theme/options`: a stale `$`-alias holder under `axes.scope: "element"`, two axes sharing an attribute, `resetTailwindDefaults: ["radius"]` without `borderRadius`, …), the generator script when `plugin` is configured, and the output file. A theme outside the project is fine; a configured `output` (or `plugin`) that escapes the project root is an error. A `styleGenVite`/`styleGenNext` or CLI-only setup needs no `plugin` entry. It also prints warnings — never errors — for schema-valid keys that collide with a Tailwind utility (for example `none` in `colors`/`shadows`/`borderRadius`, digit-only `borderWidth` keys, or typography keys such as `textSm`, `h1` → `h-1`, `italic`), and an **alias hint** for every `themeAxes` override whose literal value repeats the value of a different base key of the same category (`Override theme.dark.colors.surface repeats base value #fff → use alias "$white"`): an alias follows the primitive when the base palette changes, a repeated literal does not.

It also scans the source files under the current directory (`.css`, `.scss`, `.ts`, `.tsx`, `.vue`, `.svelte`, `.astro`, `.html`, …) and warns `file:line` about leftover pre-5.0 color variables; build folders, `node_modules`, the config `output` file and files over 1 MiB are skipped.

```bash
yarn style-gen doctor
```

#### `style-gen tokens`

Write the theme's design-token **keys** (`DesignTokens.Web`: one array of camelCased keys per category, plus `breakpoints`, `screens` and `spacingProperties`) as a TypeScript module, so a client bundle can import the key lists without shipping the `./tokens` runtime or the theme JSON (about 2.4 kB gzip together, versus roughly 0.6 kB for the generated keys).

```bash
yarn style-gen tokens                                  # → styles/theme.tokens.ts (next to the theme)
yarn style-gen tokens --theme styles/theme.json --out src/theme.tokens.ts
```

```ts
import { tokens } from "./theme.tokens";
type ColorKey = (typeof tokens.colors)[number];
```

The module is `export const tokens = {…} as const` plus `export type Tokens = typeof tokens`; it is built by the same code as `createDesignTokens()`, with the config's `breakpoints`/`screens`/`spacing`, so the two cannot drift. The theme and options are validated as in `generate`; the default output is next to the theme and must stay inside the project, so a theme outside it needs `--out`. Re-run it (or put it next to `generate` in your script) when the theme's keys change.

#### `style-gen budget`

Fail CI when the built CSS grows past a gzip budget: it sums the gzip size (`node:zlib` defaults) of one `.css` file, or of every `.css` file under a directory (walked recursively, e.g. `.next/static/css` or `dist/assets`).

```bash
yarn style-gen budget .next/static/css --max-gzip 14925
```

On success it prints an `OK: …` summary line; over budget it prints `OVER BUDGET: …` and exits 1. Exit codes: `0` within budget, `1` over budget, `2` usage error, unreadable target or no CSS found. `--max-gzip` is required. It replaces the `check-css-budget.mjs` script that consumers used to copy.

#### `style-gen --version`

Print the installed CLI version.

#### Help and exit codes

`style-gen --help` lists the commands; `style-gen <command> --help` prints that command's options. Flags are parsed strictly: **an unknown flag is an error** (`--them` no longer silently falls back to the default theme), as is an unknown command. Every command exits `0` on success, `--help`, `--version` or a cancelled prompt, and `1` on failure (`budget` uses `2` for usage errors, see above).

### Configuration file

```json
{
  "theme": "styles/theme.json",
  "output": "styles/theme.css",
  "plugin": "plugins/theme-plugin.ts",
  "breakpoints": ["md", "lg"],
  "extraSources": ["hover:bg-{primary,secondary}"]
}
```

`breakpoints`, `screens`, `enableResponsive`, `spacing`, `typography`, `extraSources`, `coverage`, `axes` and `resetTailwindDefaults` are forwarded to `generate()`. Any other key — a typo such as `breakpoint`, or a legacy 3.x key such as `responsiveModules` — is rejected; only `$schema`, `theme`, `output` and `plugin` are accepted besides the forwarded keys. `plugin` is optional: it names the script `init` scaffolded, and only `doctor` reads it. `styleGenVite()` and `styleGenNext()` called **without an argument** read this same file (see [§5](#5-build-tool-integrations)). The CLI resolves configuration in this order, per key:

1. command flags
2. `style-gen.config.json`
3. `package.json["style-gen"]`
4. built-in defaults

The two file sources are alternatives, not layers: the CLI reads `style-gen.config.json` when it exists and `package.json["style-gen"]` only when it does not, and never merges the two (a malformed `style-gen.config.json` is reported, not replaced by the `package.json` section). Flags override single keys of whichever file was read, and defaults fill the keys left unset.

---

## 4. Theme Config

`ThemeSchema` is a strict Zod schema: unknown keys, unsafe values and invalid references throw a `ZodError` with the offending path. `generate()`, `defineTheme()`, the CLI, `styleGenVite` and `styleGenNext` all validate independently.

### Minimal config

Only `colors` is required. Everything else is optional:

```ts
import { generate } from "@duydpdev/style-generator";

const { css } = generate({
  colors: { primary: "#3B82F6", background: "#FFFFFF" },
});
```

### Key grammar

Every token name, axis name and variant name must start with a letter or digit and then contain only letters, digits or `-`. In particular **`_` is rejected** — use camelCase such as `primaryActive` or kebab-case such as `primary-active` — because `_` would make the class name and the typed token disagree. The CLI, `styleGenVite` and `styleGenNext` print that hint on the offending path (`colors.primary_active → … use camelCase … or kebab-case …`). Two keys in one record that kebab-case to the same name (`blue500` and `blue-500`) are rejected too. Each category owns a distinct `--sg-<category>-` variable namespace (`--sg-color-*`, `--sg-shadow-*`, `--sg-sp-*`, …), so keys in different categories never collide (`colors.shadowPrimary` → `--sg-color-shadow-primary`, `shadows.primary` → `--sg-shadow-primary`). A `typography` key may not kebab-case to `sp-*` or `font-*`, and `fontWeight` must be a number from 1 to 1000. Values may not contain `;`, `{`, `}`, `<`, `@`, `\`, `/*` or a line break, quotes must be balanced, and so must parentheses and brackets (`rgb(0 0 0` is rejected at its path).

### Key rules

Everything the schema rejects about a name, in one place (every rule is reported as `path → message`):

| Rule                                                                                                                                                                             | Applies to                                   | Rejected                                                            | Accepted                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------- |
| Start with a letter or digit, then only letters, digits or `-`                                                                                                                   | every token, axis and variant name           | `-primary`, `my color`                                              | `primary`, `2xl`, `primary-active` |
| `_` is never allowed                                                                                                                                                             | every token, axis and variant name           | `primary_active`                                                    | `primaryActive`, `primary-active`  |
| No leading run of two or more uppercase letters: the class the typed tokens produce (`cTA` → `c-ta`) would differ from the class the CSS emits (`cta`). A single capital is fine | every token, axis and variant name           | `CTA`, `ABtn`, `HTMLParser` (rename to `cta`, `abtn`, `htmlparser`) | `Blue`, `primaryCTA`, `primaryFG`  |
| Keys of one record that kebab-case to the same name                                                                                                                              | each category and `typography`               | `blue500` + `blue-500`                                              | `blue500` + `blue600`              |
| A `typography` key must kebab-case to a valid Tailwind `@utility` name: lowercase letter first, so no leading digit or dash                                                      | `typography`                                 | `2xl`, `12Mono`                                                     | `text2xl`, `heading1`              |
| `fontFamily` keys may not kebab-case to a Tailwind font-weight name (`thin`, `extralight`, `light`, `normal`, `medium`, `semibold`, `bold`, `extrabold`, `black`)                | `fontFamily` (also in `themeAxes` overrides) | `bold`, `extrabold`                                                 | `sans`, `display`                  |
| A `borderWidth` key may not kebab-case to a `colors` key (both emit `border-<key>`)                                                                                              | `borderWidth` vs `colors`, per scope         | `colors.thinLine` + `borderWidth.thin-line`                         | `colors.line` + `borderWidth.thin` |
| A `typography` key may not kebab-case to `sp-*` or `font-*` (it would shadow the spacing and font utilities)                                                                     | `typography`                                 | `spBody`, `sp-body`, `fontBold`                                     | `body`, `spacious`                 |
| Axis and variant names may not be canonical integers                                                                                                                             | `themeAxes`                                  | `100`, `2024`                                                       | `contrast100`, `007`               |

The CLI, `styleGenVite` and `styleGenNext` print the rename hint on the offending path (for example `colors.CTA → Key "CTA" yields class "cta" in the CSS but "c-ta" through the typed tokens; rename it to "cta" …`).

### Categories

| Theme key       | Generates                                                                                                                      | Notes                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `colors`        | `bg-*`, `text-*`, `border-*` via `@theme inline` (`--color-*`)                                                                 | Required. Flat, camelCase.                                                                                                                                                     |
| `typography`    | `@utility <kebab-key>` (`text16Medium` → `.text-16-medium`)                                                                    | Entry: `fontSize`, `lineHeight`, `fontWeight` (number, 1–1000), optional `letterSpacing`/`fontFamily`/`fontStyle`; an absent `letterSpacing` emits no declaration. No aliases. |
| `shadows`       | `shadow-*`                                                                                                                     |                                                                                                                                                                                |
| `backDropBlurs` | `backdrop-blur-*`                                                                                                              |                                                                                                                                                                                |
| `borderRadius`  | `rounded-*` (+ `md:`/`lg:` variants for the active breakpoints)                                                                | Falls back to `DEFAULT_ROUNDED_VALUES`.                                                                                                                                        |
| `fontFamily`    | `font-*` via Tailwind's `--font-*` namespace                                                                                   | Keys may not be Tailwind font-weight names (`bold`, `medium`, …).                                                                                                              |
| `borderWidth`   | `border`, `border-x/y/t/r/b/l/s/e`, `divide-x/y` via Tailwind's `--border-width-*` namespace (backed by `--sg-border-width-*`) | Falls back to Tailwind's own `0/1/2/4` scale when omitted or empty (`{}`). Replaces the 3.x `border` key.                                                                      |

### Colors — camelCase keys

Keys use **camelCase** (or kebab-case); the library converts them to kebab-case variables and classes. Nested objects and a `DEFAULT` key are not supported.

| Theme key           | CSS variable                 | Tailwind class            |
| ------------------- | ---------------------------- | ------------------------- |
| `primaryForeground` | `--color-primary-foreground` | `text-primary-foreground` |
| `sidebarForeground` | `--color-sidebar-foreground` | `bg-sidebar-foreground`   |
| `blue500`           | `--color-blue-500`           | `border-blue-500`         |
| `primary`           | `--color-primary`            | `text-primary`            |

> **Rule:** a letter→digit boundary adds a dash (`blue500` → `blue-500`). Digit-prefix values stay unchanged (`2xl` → `2xl`).

### Aliases (`$key`)

A value `"$<key>"` refers to another key **in the same category** and is emitted as `var(--<cssVarPrefix>-<kebab-key>)`, where the prefix belongs to the category (`sg-color` for `colors`, `sg-shadow` for `shadows`, `sg-backdrop-blur`, `sg-radius`, `sg-font`, `sg-border-width`):

```json
{
  "colors": { "blue500": "#3B82F6", "primary": "$blue500" },
  "shadows": { "base": "0 1px 2px rgb(0 0 0 / 0.1)", "card": "$base" }
}
```

The target is the raw key (`$blue500`, not `$blue-500`), it must exist, and the alias graph must be acyclic. Aliases are not allowed inside `typography`. The example above emits:

```css
:root {
  --sg-color-blue-500: #3b82f6;
  --sg-color-primary: var(--sg-color-blue-500);
  --sg-shadow-base: 0 1px 2px rgb(0 0 0 / 0.1);
  --sg-shadow-card: var(--sg-shadow-base);
}
```

### Interactive states (`primaryHover`, `primaryActive`)

Declare flat sibling keys next to a color and the registry emits the state utilities for them:

```json
{
  "colors": {
    "blue600": "#2563EB",
    "blue700": "#1D4ED8",
    "primary": "#3B82F6",
    "primaryHover": "$blue600",
    "primaryActive": "$blue700"
  }
}
```

`primary` now opts into `hover:bg-primary-hover` and `active:bg-primary-active` (and the `text-`/`border-` forms). The state list is the exported constant `COLOR_STATES` (`["hover", "active"]`); feed it to `createVariantMapper(prefix, tokens, { states: COLOR_STATES })` to get the class string, see [section 7](#7-design-tokens--cva). State names are kebab-cased (`focusVisible` → `focus-visible:`).

### Multi-axis theming (`themeAxes`)

`themeAxes` maps an **axis name** to its **variants**; each variant only lists the values that differ from the base. Several axes can be active at once:

```json
{
  "colors": {
    "primary": "#3B82F6",
    "background": "#FFFFFF",
    "foreground": "#111827"
  },
  "shadows": { "sm": "0 1px 2px rgba(0,0,0,0.1)" },
  "themeAxes": {
    "theme": {
      "dark": {
        "colors": {
          "primary": "#60A5FA",
          "background": "#111827",
          "foreground": "#F9FAFB"
        },
        "shadows": { "sm": "0 1px 2px rgba(255,255,255,0.1)" }
      }
    },
    "palette": {
      "forest": { "colors": { "primary": "#16A34A" } },
      "highContrast": { "colors": { "primary": "#000000" } }
    }
  }
}
```

Generated selectors (after `:root`, in declaration order):

```css
:root { --sg-color-primary: #3B82F6; … }
html[data-theme="dark"] { --sg-color-primary: #60A5FA; … }
html[data-palette="forest"] { --sg-color-primary: #16A34A; }
html[data-palette="high-contrast"] { --sg-color-primary: #000000; }
```

```html
<html data-theme="dark" data-palette="high-contrast">
  …
</html>
```

Rules:

- **Selectors are pinned to `html`.** A `data-*` attribute on a wrapper element has no effect. The reason is aliases: a `var()` alias resolves at the element that _declares_ the custom property (`:root`), so an override on any other element never reaches an alias's value.
- **Attribute values are the kebab form of the key**: variant `highContrast` → `data-palette="high-contrast"`; axis `colorScheme` → `data-color-scheme`.
- **Precedence is declaration order.** The selectors have equal specificity, so when two axes override the same token the axis declared **later** in the JSON wins.
- **Axis and variant names cannot be canonical integers** (`100`, `2024`): JavaScript enumerates integer-like keys first, which would silently break declaration order. Use `contrast100` instead.
- **A variant cannot be named `base`**: `"base"` is the "no override" value of `ThemeAxesState` and `themeAxisAttributes`, so a variant of that name could never be switched on. `ThemeSchema` rejects `themeAxes.<axis>.base`; name it `default` or `standard`. (An axis named `base` is fine.)
- **Override keys must already exist in the base** record; an override-only key would produce no utility and is rejected.
- **Compound overrides stay hand-written CSS.** A single override cannot target two axes' attributes at once:

| Axis (source)                                        | Content                                                                              | Handling                                                                                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `theme` (`themeAxes.theme.dark`)                     | override `--sg-*` colors + shadows                                                   | Generated by the library — `html[data-theme="dark"]`                                                                                                                                             |
| `palette` (`themeAxes.palette.{forest,sunset,mono}`) | override `--sg-*` colors                                                             | Generated by the library — `html[data-palette="forest\|sunset\|mono"]`                                                                                                                           |
| compound `[data-theme="dark"][data-palette="…"]`     | cross-axis override (dark × a specific palette)                                      | Hand-written CSS: its `(0,2,0)` specificity beats either single-axis `html[data-…]` rule `(0,1,1)` regardless of source order                                                                    |
| `voice`, `geometry`, `surface` (`style-guide.css`)   | `--f-sans`, `--radius-sm`, `--shadow-sm`, and a nested `.sg-glass-target` child rule | Hand-written CSS: variables outside `--sg-*` and nested-child selectors are not representable by a theme override (see [`examples/design-system/README.md`](./examples/design-system/README.md)) |

The old single-axis key was renamed; a theme still using it is rejected with a message pointing at `themeAxes`. See the [migration guide](./documents/migration/3.x-to-4.0.md) for the exact message and the rewrite.

### The `--sg-*` intermediate variables

`--sg-*` is an intermediate layer: it exists to break the circular reference that appears when a theme switches a variable that `@theme inline` also defines.

```css
/* Without the intermediate layer: circular! */
@theme inline {
  --color-primary: var(--color-primary);
}

/* With it: theme switching works */
:root {
  --sg-color-primary: #3b82f6;
}
html[data-theme="dark"] {
  --sg-color-primary: #60a5fa;
}
@theme inline {
  --color-primary: var(--sg-color-primary);
}
```

Prefer standard Tailwind classes and the `--color-*` variables in application code:

```html
<div class="bg-primary text-foreground">…</div>
```

```css
.custom {
  color: var(--color-primary);
}
```

**Public contract.** The variables the generator emits (`--sg-color-<key>`, `--sg-shadow-<key>`, `--sg-radius-<key>`, `--sg-font-<key>`, `--sg-border-width-<key>`, `--sg-backdrop-blur-<key>`, and the inline `--sg-sp-*` spacing variables) are part of the public output: aliases resolve to them, and hand-written CSS may read or override them. Renaming one is a breaking change — 5.0 renamed the color variables from `--sg-<color>` to `--sg-color-<key>`. `style-gen doctor` warns (`file:line`) about leftover `var(--sg-<colorKey>)` references or `--sg-<colorKey>:` declarations; see the [4.x → 5.0 guide](./documents/migration/4.x-to-5.0.md).

### Built-in utility name clashes

A theme key whose class equals a Tailwind utility (`bg-none`, `shadow-none`, `rounded-none`, a typography key that becomes `text-sm`, `h-1` from `h1`, or `italic`, colors named `transparent`/`current`/`inherit`) is not rejected, but which rule wins is up to Tailwind's implementation of that utility. Pick a different name (`clear`, `flat`, `zero`, `heading1`); `style-gen doctor` lists the clashes it recognises. A digit-only `borderWidth` key (`2`) is different: since 5.0 the theme value replaces Tailwind's built-in `border-2`, `border-x-2` and `divide-x-2` (Tailwind looks up the theme before its default scale); `doctor` still reports it so you confirm the override is intended.

---

## 5. Build-tool integrations

All of them write the same `theme.css` (the output of `generate()`); pick the one that matches your bundler. In each case, `@import` the file next to `@import "tailwindcss"`.

### Vite (and Nuxt) — `styleGenVite`

Emits `theme.css` when a dev server starts and when a build starts (`buildStart`), and again whenever the theme file changes (a debounced re-emit; the browser full-reloads only when the CSS actually changed). The theme is registered with Rollup (`this.addWatchFile`), so `vite build --watch` rebuilds on theme edits too. The file is written before Tailwind scans; the examples list the plugin ahead of `@tailwindcss/vite`. A failure at `buildStart` fails the build with a staged message (`Invalid JSON in …`, `Invalid options:`, `Invalid theme (<path>):`, `Invalid theme/options:`, `Cannot write …`). `themePath` may be absolute or outside the project root (a shared theme package); `outDir` must stay inside it.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "./style-gen.options"; // one shared options module, see §7

export default defineConfig({
  plugins: [
    styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "src/theme", // must match the @import path in your CSS
      options,
    }),
    tailwindcss(),
  ],
});
```

Nuxt runs on Vite: register the same plugin in `nuxt.config.ts` under `vite.plugins`. Nuxt 4 sets the Vite `root` to `app/`, so a relative `themePath` would resolve from there; pass absolute paths (`fileURLToPath(new URL("./theme.json", import.meta.url))`). The three examples (`examples/react-v4`, `examples/next-v4`, `examples/nuxt-v4`) share one theme and one `options` module from [`examples/design-system`](./examples/design-system/README.md). Add `theme.css` to `.gitignore` if the theme JSON is your source of truth.

**Dev-server notes.** On Vite 5, `buildStart` of a dev server runs on `server.listen()` (or in `middlewareMode`), so a `createServer()` that never calls `listen()` does not write `theme.css`; from Vite 6 the plugin sets `perEnvironmentStartEndDuringDev` and `buildStart` also runs for `createServer()` + `ssrLoadModule`. The plugin reads `style-gen.config.json` **once**, when Vite loads its config: restart the dev server after editing it (only the theme file is watched).

**No arguments.** `styleGenVite()` (and `styleGenNext()`) read `style-gen.config.json` (else `package.json["style-gen"]`) from the Vite root (Next: `process.cwd()`): `theme`, `output` (the CSS file to write, default `styles/theme.css`) and every `generate()` option in it, so the CLI and the bundler share one source of truth. An invalid or malformed config throws `[style-gen-vite] Invalid config (<file>):` followed by the issues — it never falls back to defaults silently. With arguments, the config file is not read. Both no-argument forms read the file once, when the bundler loads its config (restart `vite`/`next dev` after editing it).

### Next.js — `styleGenNext`

Works with webpack and Turbopack and does not import `next`, so it adds no peer dependency:

```ts
// next.config.ts
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";
import { options } from "./style-gen.options";

const nextConfig: NextConfig = {};

export default styleGenNext({
  themePath: "app/theme/theme.json",
  outDir: "app/theme",
  options,
})(nextConfig);
```

```css
/* app/globals.css */
@import "tailwindcss";
@import "./theme/theme.css";
```

It emits `theme.css` only when Next loads the config in `phase-development-server` (`next dev`, which also watches the theme file) or `phase-production-build` (`next build`, and other commands that load the config in that phase); every other phase (`next start`, export, info, test) returns the config without reading the theme, so a production image need not ship it. `styleGenNext(opts)(nextConfig)` returns Next's `(phase, ctx) => config` function, so export its result as shown. `nextConfig` may be a plain object or the function form `(phase, { defaultConfig }) => config`, which is called with Next's arguments. The dev watcher keeps running when an edit makes the theme invalid (the error is logged and the last good `theme.css` stays), and is replaced when the config is reloaded with another theme or output path. `themePath` may be absolute or outside the project; `outDir` must stay inside it (`[style-gen-next] outDir escapes project root: <path>`) and a leading `/` is **not** rewritten to a relative path any more. Limitation: the paths are checked against `process.cwd()` by logical path — a symlink inside the project that points outside it is not detected.

### Anything else — CLI or script

The CLI-only flow needs no bundler plugin: generate `theme.css` before the dev server and the build, and keep a watcher running during development:

```json
{
  "scripts": {
    "predev": "style-gen generate",
    "dev": "vite",
    "prebuild": "style-gen generate",
    "build": "vite build"
  }
}
```

```bash
yarn style-gen generate --watch   # second terminal: regenerates on every theme or style-gen.config.json edit
```

npm runs the `pre*` scripts automatically; Yarn Berry does not, so chain them there (`"dev": "style-gen generate && vite"`). `style-gen.config.json` carries the `theme`, `output` and generator options (`examples/design-system/style-gen.config.json` is a working one). Or call `generate()` yourself:

```ts
import { writeFileSync } from "node:fs";
import {
  generate,
  defineTheme,
  defineOptions,
  Breakpoint,
} from "@duydpdev/style-generator";
import themeJson from "./theme.json";

const theme = defineTheme(themeJson); // type-checks AND validates at runtime
const options = defineOptions({ breakpoints: [Breakpoint.MD, Breakpoint.LG] });

const { css, tokens } = generate(theme, options);
writeFileSync("styles/theme.css", css, "utf8");
```

`defineTheme()` throws a `ZodError` with the offending path for unknown keys or unsafe values, and TypeScript rejects a missing `colors` at compile time. `formatZodError` turns that error into one `path → message` line per issue:

```ts
import { ZodError } from "zod";

try {
  generate(theme, options);
} catch (e) {
  if (e instanceof ZodError) console.error(formatZodError(e));
  throw e;
}
```

---

## 6. Spacing — CSS custom properties

Spacing utilities are generated once as `@utility sp-<key>` blocks; components only set inline variables. A `--sg-sp-<key>[-<breakpoint>]` variable is registered with `@property … { syntax: "*"; inherits: false }`, and each utility carries its own breakpoint fallback chain:

```css
@utility sp-p {
  padding: var(--sg-sp-p);
  @media (width >= 768px) {
    padding: var(--sg-sp-p-md, var(--sg-sp-p));
  }
  @media (width >= 1024px) {
    padding: var(--sg-sp-p-lg, var(--sg-sp-p-md, var(--sg-sp-p)));
  }
}
```

Default keys: `p`, `px`, `py`, `pt`, `pb`, `pl`, `pr`, `m`, `mx`, `my`, `mt`, `mb`, `ml`, `mr`, `gap`, `gap-x`, `gap-y`, `top`, `right`, `bottom`, `left` (`SpacingKey`). Disable with `spacing: { enabled: false }`; customise with `spacing: { properties: { inset: ["top", "bottom"] } }` (a spacing key → the CSS properties it sets).

### Usage in components

```tsx
import {
  resolveSpacingProps,
  type ResponsiveValueStrict,
} from "@duydpdev/style-generator/spacing";
import type { CSSProperties, ReactNode } from "react";

interface BoxProps {
  p?: ResponsiveValueStrict<number>;
  px?: ResponsiveValueStrict<number>;
  m?: ResponsiveValueStrict<number>;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const Box = ({ p, px, m, className, style, children }: BoxProps) => {
  const spacing = resolveSpacingProps({ p, px, m });
  return (
    <div
      className={[spacing.classNames, className].filter(Boolean).join(" ")}
      style={{ ...spacing.style, ...style }}
    >
      {children}
    </div>
  );
};

<Box p={4} />;
// → class="sp-p" style="--sg-sp-p: 1rem"

<Box p={{ base: 2, md: 4, lg: 8 }} />;
// → class="sp-p" style="--sg-sp-p: 0.5rem; --sg-sp-p-md: 1rem; --sg-sp-p-lg: 2rem"
```

- `classNames` is a **string** (space-joined), not an array.
- **Same-element rule:** the variables do not inherit, so the class and the `style` variables must be on the **same element**; a parent's `--sg-sp-p` never leaks into a child.
- Only breakpoints listed in `options.breakpoints` (default `["md","lg"]`) have a fallback chain; a variable for any other breakpoint has no effect.
- `resolveSpacing(prop, value, unit?)` resolves a single prop; `unit` defaults to `0.25` (rem per step).
- Responsive values use `ResponsiveValueStrict<T, B>`: a typo like `{ typo: 4 }` is a type error, and `base` is always allowed. `B` defaults to `md | lg`, the breakpoints the default spacing CSS covers; with custom `options.breakpoints`, pass the same keys as the type argument (`resolveSpacingProps<"md" | "lg" | "xl">(…)`, `ResponsiveValueStrict<number, "md" | "lg" | "xl">`).

---

## 7. Design tokens & CVA

### Typed design tokens

`generate()` returns them as `tokens`, the `{ Web }` object; you can also build the same object standalone (browser-safe) with `createDesignTokens`, which returns it as `DesignTokens`:

```ts
import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import theme from "./theme.json";

const { DesignTokens } = createDesignTokens(theme, {
  breakpoints: ["md", "lg"],
});
```

**`DesignTokens.Web`:**

| Token               | Description                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `colors`            | All color keys (flat, camelCase)                                                                                                           |
| `typography`        | Keys of `typography`                                                                                                                       |
| `shadows`           | Keys of `shadows`                                                                                                                          |
| `backDropBlurs`     | Keys of `backDropBlurs`                                                                                                                    |
| `fontFamily`        | Keys of `fontFamily`                                                                                                                       |
| `borderWidth`       | Keys of `borderWidth` (falls back to `0, 1, 2, 4` when omitted or empty)                                                                   |
| `borderRadius`      | Keys of `borderRadius` (falls back to `DEFAULT_ROUNDED_VALUES` when omitted or empty)                                                      |
| `spacingProperties` | List of spacing props — the keys of `options.spacing.properties`, or the defaults                                                          |
| `breakpoints`       | Active breakpoints — defaults to `["md", "lg"]`                                                                                            |
| `screens`           | Breakpoint → width map: the default screens plus the keys of `options.screens`                                                             |
| `aliasedColors`     | The `colors` keys whose value is a `"$<key>"` alias in the base record or any `themeAxes` override (what `coverage.keys: "aliased"` keeps) |

Each array is named after its `ThemeConfig` field (`DesignTokens.Web.colors` holds the keys of `theme.colors`); `spacingProperties`, `breakpoints` and `screens` come from the options. Every array is `readonly`, and the options are inferred as literals (`generate`, `createDesignTokens` and `defineOptions` take `const O`): `createDesignTokens(theme, { breakpoints: ["md", "xl"] }).DesignTokens.Web.breakpoints` is `readonly ("md" | "xl")[]`. Options annotated as `StyleGeneratorOptions` widen those to `readonly string[]`, and so does an explicit type argument for the theme only (`createDesignTokens<typeof theme>(theme, { breakpoints: ["xl"] })`): drop the type argument to keep the literals. Without `options` the defaults apply (`readonly ("md" | "lg")[]`). `aliasedColors` is computed at runtime from the base record and every override; its type keeps each key whose value is a `$…` literal or a plain `string`. The types are `DesignTokensWeb<TTheme, O>` and `DesignTokensResult<TTheme, O>`.

**One options module.** The bundler plugin, `createDesignTokens` and the recipe types must see the same options, or the `@source inline` coverage and the token arrays drift apart. Keep them in a dependency-free module, typed with `as const satisfies` and a type-only import (`defineOptions` lives in the root entry, which pulls Zod into a browser bundle):

```ts
// style-gen.options.ts
import type { StyleGeneratorOptions } from "@duydpdev/style-generator/types";

export const options = {
  breakpoints: ["md", "lg"],
} as const satisfies StyleGeneratorOptions;
```

Import it in `vite.config.ts` / `next.config.ts` (§5) and in `createDesignTokens(theme, options)`; `style-gen.config.json` must repeat the same values if you also use the CLI. See [`examples/design-system`](./examples/design-system/README.md).

### `createVariantMapper` for CVA

`createVariantMapper(prefix, tokens)` returns a flat `Record<token, class>`. Classes are always kebab-cased with the same function the registry uses, so every class it returns is one that `@source inline` emits:

```ts
import { cva } from "class-variance-authority";
import {
  createVariantMapper,
  COLOR_STATES,
} from "@duydpdev/style-generator/cva";

const bg = createVariantMapper("bg", DesignTokens.Web.colors);
// { primary: "bg-primary", sidebarForeground: "bg-sidebar-foreground", … }

const button = cva("rounded px-4 py-2", { variants: { color: bg } });
button({ color: "primary" }); // → "rounded px-4 py-2 bg-primary"

// prefix "" yields the bare kebab-case token (typography):
createVariantMapper("", DesignTokens.Web.typography); // { text12Mono: "text-12-mono", … }

// several prefixes at once → nested map
createVariantMapper(["border-x", "border-y"], DesignTokens.Web.borderWidth);
```

**State classes.** With sibling keys `primaryHover` / `primaryActive` in the theme, `{ states }` collapses them into one class string per base token:

```ts
const tokens = ["primary", "primaryHover", "primaryActive", "danger"] as const;
const bgStates = createVariantMapper("bg", tokens, { states: COLOR_STATES });
// {
//   primary: "bg-primary hover:bg-primary-hover active:bg-primary-active",
//   primaryHover: "bg-primary-hover",
//   primaryActive: "bg-primary-active",
//   danger: "bg-danger",
// }
```

Always pass `COLOR_STATES` rather than hard-coding the array — it is the same list the generated `@source inline` state lines come from.

**Prefix constraint.** `prefix` is typed `RegistryPrefix | ""` (the prefixes the registry emits `@source inline` for; `""` is typography), so `createVariantMapper("ring", …)` and a prefix held in a `string` variable are type errors: they would map to classes no `@source inline` line keeps. To opt out for a single prefix, pass `{ allowUnregisteredPrefix: true }` as the third argument and list the classes in `extraSources`. The opt-out does not combine with `{ states }` or with an array of prefixes.

### Semantic type aliases

Skip the `(typeof DesignTokens.Web.X)[number]` boilerplate:

```ts
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";
import themeJson from "./theme.json";

type Theme = typeof themeJson;

interface BoxProps {
  backgroundColor?: ColorVariant<Theme>;
}
interface TextProps {
  type?: TextVariant<Theme>;
  color?: ColorVariant<Theme>;
}
```

Aliases: `ColorVariant`, `TextVariant`, `ShadowVariant`, `BackdropBlurVariant`, `FontFamilyVariant`, `BorderWidthVariant`, `RoundedVariant`, plus the mapped type `DesignTokenKeys<T>`.

Theme axes: `ThemeAxisName<T>` (`"theme" | "palette"`), `ThemeAxisVariant<T, A>` (`"dark" | "light"`) and `ThemeAxesState<T>` (every axis optional, each `"base"` or a declared variant) type the `data-<axis>` attributes you set at runtime. Their keys and values are the raw theme keys, while the generated attribute and selector are kebab-cased: the variant `high-contrast` of the axis `colorMode` is `html[data-color-mode="high-contrast"]`, so map the state to `toKebabCase(axis)` / `toKebabCase(variant)` when you set it. `BreakpointKeys<O>` and `SpacingKeys<O>` give the literal keys of an options object, e.g. for `ResponsiveValueStrict<number, BreakpointKeys<typeof options>>`.

### Custom breakpoint intellisense

```ts
import type { ResponsiveValueStrict } from "@duydpdev/style-generator/spacing";

// "base" is always allowed; every other key must be declared in `options.breakpoints`
// and exist in `screens` (or `defaultScreens`), or it has no CSS behind it.
type AppBreakpoints = "mobile" | "tablet" | "laptop" | "desktop";
export type ResponsiveValue<T> = ResponsiveValueStrict<T, AppBreakpoints>;
```

---

## 8. Options reference

`generate(theme, options)` and the plugins' `options` field take `StyleGeneratorOptions`:

| Option                    | Type                                                                            | Default                            | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| :------------------------ | :------------------------------------------------------------------------------ | :--------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `breakpoints`             | `readonly (Breakpoint \| string)[]`                                             | `["md", "lg"]`                     | Breakpoints for responsive `@source inline` variants, spacing fallback chains and `DesignTokens.Web.breakpoints`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `screens`                 | `Record<string, string>`                                                        | `defaultScreens`                   | Custom screen widths (emitted as `@theme { --breakpoint-* }`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `enableResponsive`        | `boolean`                                                                       | `true`                             | Generate responsive spacing fallback chains.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `spacing.enabled`         | `boolean`                                                                       | `true`                             | Emit the `.sp-*` utilities.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `spacing.properties`      | `SpacingPropertyMap`                                                            | `DEFAULT_SPACING_PROPERTIES`       | Replace the spacing key → CSS properties map (`{ p: ["padding"] }`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `typography.cssVarDriven` | `boolean`                                                                       | `false`                            | Emit `--typography-<name>-<prop>` variables in `:root` and reference them from each typography utility, so a single token can be overridden in CSS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `extraSources`            | `readonly string[]`                                                             | `[]`                               | Extra `@source inline("<entry>")` lines for classes built at runtime (brace expansion allowed). Entries: non-empty, ≤ 512 characters, none of `"` `'` `\` `;` `@` `<` `>` or a line break.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `coverage`                | `Partial<Record<CategoryKey, boolean \| CoverageRule>>`                         | all categories fully covered       | Trim a category's `@source inline` lines: `false`, `{ prefixes }`, `{ keys: "aliased" }`. See [`coverage`](#coverage-trim-the-source-inline-lines-per-category).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `axes`                    | `{ attribute?: Readonly<Record<string, string>>; scope?: "root" \| "element" }` | `{ attribute: {}, scope: "root" }` | How `themeAxes` variants are switched on. `attribute`: axis → DOM attribute name (`{ theme: "data-mode" }` → `html[data-mode="dark"]`; unlisted axes keep `data-<axis-kebab>`; names match `[a-z][a-z0-9-]*`). For every scope `generate()` rejects an `attribute` key that names no `themeAxes` axis and two axes that resolve to the same attribute name (at `axes.attribute.<axis>`). `scope: "element"` drops the `html` anchor (`[data-mode="dark"]`); `generate()` then also rejects a variant that overrides an alias target without re-declaring each `$`-alias holder (looked up in the base theme and in every other variant of every axis). See [Multi-axis theming](./documents/guide.md#multi-axis-theming).                                                                                                                  |
| `resetTailwindDefaults`   | `readonly ("colors" \| "radius" \| "shadow")[]`                                 | `[]`                               | Clear Tailwind's built-in default namespaces so only the theme's tokens exist. Each name adds `--color-*: initial;`, `--radius-*: initial;` or `--shadow-*: initial;` as the **first** lines of `@theme inline`. `"colors"` also removes `--color-white`/`--color-black` (declare them in `colors` if you use them); static utilities such as `rounded-full`, `rounded-none`, `shadow-none` and the `inset-`/`drop-`/`text-shadow` families are untouched. Each name needs a non-empty replacement in the theme: `"colors"` requires `colors` (non-empty), `"radius"` a `borderRadius` and `"shadow"` `shadows` (`generate()` throws `resetTailwindDefaults.<i>` otherwise: clearing the defaults with no replacement would make `bg-red-500`/`rounded-md`/`shadow-md` compile to nothing). Duplicates and order do not change the output. |

Class names built at runtime (a template literal such as `` `bg-${variant}` ``) are invisible to Tailwind's static scan; list them with `extraSources`, e.g. `extraSources: ["hover:bg-{primary,secondary}"]`.

`generate()` validates every option that reaches the CSS and throws a `ZodError` naming its path: unknown option keys (also inside `spacing` and `typography`) are rejected; `enableResponsive`, `spacing.enabled` and `typography.cssVarDriven` must be booleans; `breakpoints` entries, `screens` and `spacing.properties` keys follow the theme key grammar (letters, digits, `-`); `screens` values must be one length in px, rem or em, and the map merged with the px `defaultScreens` must use a single unit (reported at `screens`); every `breakpoints` entry must name a screen in `defaultScreens` or `screens` (reported at `breakpoints.<i>`); the CSS property names inside `spacing.properties` must be lowercase (`padding`, `column-gap`, `--custom`).

#### `coverage`: trim the `@source inline` lines per category

By default every category gets a `@source inline` line covering all its keys (and every `bg-`/`text-`/`border-` prefix for colors). That is the safe default, but a large palette makes the line big. `coverage` trims it, per category (`colors`, `typography`, `shadows`, `backDropBlurs`, `borderRadius`, `fontFamily`, `borderWidth`):

| `coverage.<category>` | Effect                                                                                                                                                                                                                                                                                                      |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| absent, `true`, `{}`  | Today's output, byte for byte.                                                                                                                                                                                                                                                                              |
| `false`               | No `@source inline` line for the category, and none of its state lines (`hover:`, `active:`).                                                                                                                                                                                                               |
| `{ prefixes: [...] }` | Keep only the listed class prefixes (`bg`, `rounded-t`, …). Each must be a prefix of that category, else `generate()` throws; typography has no prefixes (its keys are the class names).                                                                                                                    |
| `{ keys: "aliased" }` | Keep only the keys whose value is a `"$<key>"` alias (the alias holders), in the base record or in any `themeAxes` override. The primitives they point to need no class. The state lines follow: `hover:bg-x-hover` survives only when both `x` and `xHover` do. Not allowed for `typography` (no aliases). |
| `{ keys: "all" }`     | The default: every key.                                                                                                                                                                                                                                                                                     |

`prefixes` and `keys` combine; a `prefixes` list must be non-empty. With `keys: "aliased"` and no alias holder in the category (or no declared keys at all), nothing is emitted: the built-in defaults are never aliases. `coverage` only trims `@source inline`: `@theme inline`, `@utility` blocks and the typed `DesignTokens` are unchanged, so a class you still use that is no longer covered must appear literally in your source or in `extraSources`.

```ts
generate(theme, {
  coverage: {
    colors: { prefixes: ["bg", "text"], keys: "aliased" },
    borderRadius: { prefixes: ["rounded"] },
    shadows: false,
  },
});
```

---

## 9. Exports API

| Export                                                                                                                                      | Subpath                                       | Description                                                                                                                                                                                                                           |
| :------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `generate`                                                                                                                                  | `.`                                           | **Main entry.** Returns `{ css, tokens, schema }` from a Zod-validated theme.                                                                                                                                                         |
| `defineTheme`, `defineOptions`                                                                                                              | `.`                                           | Type-safe helpers; `defineTheme` also validates at runtime.                                                                                                                                                                           |
| `formatZodError`                                                                                                                            | `.`                                           | Formats a `ZodError` thrown by `generate()`/`defineTheme()` as one `path → message` line per issue.                                                                                                                                   |
| `generateThemeCss`                                                                                                                          | `.`                                           | Just `:root` variables, axis overrides and `@theme inline`; validates the theme (and the optional second-argument `options`, of which only `axes` and `resetTailwindDefaults` matter) like `generate()`.                              |
| `createDesignTokens`                                                                                                                        | `.`, `./tokens`                               | Typed `DesignTokens.Web.*`.                                                                                                                                                                                                           |
| `createVariantMapper`, `COLOR_STATES`, `toKebabCase`                                                                                        | `.`, `./cva` (`COLOR_STATES` also `./tokens`) | Token keys → class names for CVA, optional `{ states }`; `toKebabCase` is the function the registry and mapper use.                                                                                                                   |
| `resolveSpacing`, `resolveSpacingProps`                                                                                                     | `.`, `./spacing`                              | Spacing props → `{ className(s), style }`.                                                                                                                                                                                            |
| `createTailwindMergeExtension`, `splitSpacingProps`, `themeAxisAttributes`, `SpacingProps`, `TailwindMergeExtension`, `TailwindMergeTokens` | `./recipes` (not in `.`)                      | Component-side recipes, see [Recipes](#recipes).                                                                                                                                                                                      |
| `styleGenVite`                                                                                                                              | `./vite`                                      | Vite plugin writing `theme.css`.                                                                                                                                                                                                      |
| `styleGenNext`                                                                                                                              | `./next`                                      | Next.js config wrapper writing `theme.css`.                                                                                                                                                                                           |
| `Breakpoint`, `defaultScreens`                                                                                                              | `.`, `./tokens`                               | `Breakpoint` const + type and default widths.                                                                                                                                                                                         |
| `DEFAULT_ROUNDED_VALUES`, `DEFAULT_BORDER_VALUES`                                                                                           | `.`, `./tokens`                               | Fallback values for `borderRadius` / `borderWidth`.                                                                                                                                                                                   |
| `DEFAULT_SPACING_PROPERTIES`                                                                                                                | `.`, `./spacing`                              | Default spacing key → CSS properties map.                                                                                                                                                                                             |
| `roundedProperties`, `borderProperties`                                                                                                     | `.`, `./tokens`                               | Class-prefix lists of the `borderRadius` / `borderWidth` categories.                                                                                                                                                                  |
| Types                                                                                                                                       | `./types` (most also `.`)                     | `ThemeConfig`, `ThemeOverride`, `TypographyConfig`, `StyleGeneratorOptions`, `CoverageRule`, `CategoryKey`, `CategoryTokenKey`, `ResponsiveValueStrict`, `SpacingKey` (`./spacing`), the `*Variant<T>` aliases, `DesignTokensResult`. |

### Recipes

`@duydpdev/style-generator/recipes` is browser-safe and not re-exported from `.`. It imports nothing from `tailwind-merge`; use `tailwind-merge` 3.x as your app's own dependency (the extension hard-codes the v3 group ids and the `radius` theme key).

```tsx
import { extendTailwindMerge } from "tailwind-merge";
import {
  createTailwindMergeExtension,
  splitSpacingProps,
  themeAxisAttributes,
  type SpacingProps,
} from "@duydpdev/style-generator/recipes";
import type { BreakpointKeys } from "@duydpdev/style-generator/types";

// `theme` is your theme JSON, `options` the const object shared with the bundler
// plugin, `tokens` = createDesignTokens(theme, options).DesignTokens.Web
import { options, theme, tokens } from "./design-system";

// 1. `twMerge` that knows your custom tokens (`border-thin` is a width, not a color)
export const twMerge = extendTailwindMerge(
  createTailwindMergeExtension(tokens),
);

// 2. Typed spacing props → `sp-*` class + inline `--sg-sp-*` style
type BoxProps = SpacingProps<BreakpointKeys<typeof options>> & { id?: string };
export const Box = (props: BoxProps) => {
  const { spacing, rest } = splitSpacingProps(props, tokens.spacingProperties);
  return <div {...rest} className={spacing.className} style={spacing.style} />;
};

// 3. DOM attributes of the active theme axes (pass `{ attribute }` as the second
//    argument when `options.axes.attribute` renames them)
export const Root = () => (
  <html {...themeAxisAttributes<typeof theme>({ theme: "dark" })} />
);
```

A complete, tested version of this (`cn`, `axisAttributes`, eight headless CVA recipes, shared CSS) lives in [`examples/design-system`](./examples/design-system/README.md); [`documents/guide.md`](./documents/guide.md#build-components) walks through it step by step.

- `createTailwindMergeExtension` covers `typography`, `shadows`, `backDropBlurs`, `borderRadius` and `borderWidth` tokens; colors and font families already match tailwind-merge's default `color`/`font-family` groups. `borderRadius` extends tailwind-merge's `radius` theme scale, so side, logical and corner utilities (`rounded-tl-pill`, `rounded-s-pill`) merge with their `rounded-*` siblings. A later typography class removes earlier `font-size`/`font-weight`/`leading`/`tracking` classes; a later single-property utility refines it.
- `splitSpacingProps` type-checks `props` against `SpacingProps<BKeys, K>`: `{ p: "4" }` and `{ p: { tablet: 4 } }` are errors. `BKeys` defaults to `md | lg` and is not inferred; props typed with `SpacingProps<BreakpointKeys<typeof options>>` are accepted as they are, and `splitSpacingProps<K, Props, BKeys>(…)` also checks object literals against your own breakpoints. It removes every spacing key from `rest` (even an `undefined` one), so `p={undefined}` never reaches the DOM.
- `themeAxisAttributes` emits no attribute for an axis that is `"base"` or `undefined`. React removes a prop that disappears between renders; an imperative caller must `removeAttribute` for an omitted axis.

---

## 10. Development & CI

### Local (pre-commit)

**Husky** + **lint-staged** run checks before every commit (Husky is installed by `postinstall`):

1. `eslint` & `prettier`
2. `tsc --noEmit`
3. `vitest run`

### Remote (GitHub Actions)

`ci.yml` runs commitlint, `build:all`, lint (type-aware ESLint also covers `examples/**`, which need the built library), `prettier:check`, `tsc`, the `check:*` gates and the unit/type tests, a Playwright job, a leg that re-resolves Tailwind to the 4.1.x peer floor and runs the unit and e2e suites against it, a Node 20.19.0 smoke leg, and the `peer-matrix` legs (Vite 5/6/8 and TypeScript 6 gate CI; TypeScript 7 is experimental). See [`documents/deploy.md`](./documents/deploy.md) and [`documents/testing.md`](./documents/testing.md).

```bash
yarn test          # Unit tests
yarn test:types    # Type tests (*.test-d.ts)
yarn test:e2e      # Playwright (Chromium + WebKit)
yarn test:coverage # Coverage report
```

---

## 11. Migration

- **4.x → 5.0.0** (breaking): [`documents/migration/4.x-to-5.0.md`](./documents/migration/4.x-to-5.0.md) — `--sg-color-*`, `borderWidth` via `@theme`, array-form `spacing.properties`, renamed `DesignTokens.Web` keys, readonly/options-typed tokens (`### Types`), typography bounds, the Node runner (`buildStart` emit, no-argument plugins, `resolveProjectPath`), CLI exit codes and strict flags, the `tokens` and `budget` commands, `resetTailwindDefaults`, the reserved `base` variant, `.d.cts` declarations.
- **3.x → 4.0.0** (breaking): [`documents/migration/3.x-to-4.0.md`](./documents/migration/3.x-to-4.0.md) — every removed API, the new theme fields, CLI changes and a rollback runbook.
- **4.0 → 4.1** (stricter validation): [`documents/migration/4.0-to-4.1.md`](./documents/migration/4.0-to-4.1.md)
- **Subpath exports (3.x)**: [`documents/migration/3.x-subpath-exports.md`](./documents/migration/3.x-subpath-exports.md) — historical; explains `moduleResolution` requirements.
- Older majors: 2 → 3 removed nested color objects and the `DEFAULT` key (flat camelCase keys only, use `createVariantMapper` for CVA); 1 → 2 flattened the `base`/`text`/`common` color buckets.
