# @duydpdev/style-generator

TypeScript library + CLI that turns a theme JSON into a complete **design system for Tailwind CSS v4**: one generated CSS file (theme variables, dark-mode/palette overrides, typography and spacing utilities, `@source inline` class coverage), typed design tokens, and a JSON Schema for editor autocomplete.

Published on **GitHub Packages** as `@duydpdev/style-generator` (private — requires access, see Installation).

> **Upgrading from 3.x?** 4.0.0 is a breaking release (Tailwind v4 only, `generate()` instead of a plugin + safelist, strict theme schema, `themeAxes`). Read [`documents/migration/3.x-to-4.0.md`](./documents/migration/3.x-to-4.0.md).

## Features

- 🎨 **Flat theme config** — every color in one camelCase namespace, validated by a strict Zod schema (unknown keys and unsafe values are errors).
- 🔗 **Aliases** — `"primary": "$blue500"` emits `var(--sg-blue-500)`; no duplicated hex values.
- 🌗 **Multi-axis theming** — `themeAxes` generates `html[data-theme="dark"]`, `html[data-palette="forest"]`, … that can be toggled independently.
- ⚡ **One call, one file** — `generate(theme)` returns the CSS you `@import` next to `@import "tailwindcss"`; no `@plugin`, no safelist file.
- 🚀 **CSS-variable spacing** — `.sp-*` utilities with `var()` fallback chains instead of thousands of safelisted classes.
- 🧩 **Typed design tokens + CVA helper** — `createVariantMapper` maps token keys to class names (including `hover:`/`active:` state classes).
- 🖥️ **CLI + plugins** — `style-gen` (`init`, `generate`, `schema`, `doctor`), `styleGenVite`, `styleGenNext`.

---

## 1. Installation

This package is published to **GitHub Packages** under a **private** repository.
To install you must be a repository collaborator and authenticate with a GitHub
Personal Access Token (classic) that has the `read:packages` scope.

**1. Configure the `@duydpdev` scope** — add to your project `.npmrc`:

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

Peer dependencies your project must provide:

| Peer          | Range                           | Notes                                                           |
| ------------- | ------------------------------- | --------------------------------------------------------------- |
| `tailwindcss` | `>=4.1.0`                       | Tailwind v3 is not supported. `@source inline(...)` needs 4.1+. |
| `typescript`  | `^5.0.0`                        |                                                                 |
| `vite`        | `^5 \|\| ^6 \|\| ^7` (optional) | Only for `styleGenVite` (also used by Nuxt).                    |

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
import type {
  ThemeConfig,
  ColorVariant,
} from "@duydpdev/style-generator/types";

// Build-tool integrations (Node only)
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { styleGenNext } from "@duydpdev/style-generator/next";
```

Requires `tsconfig.json#compilerOptions.moduleResolution` = `"bundler"`, `"node16"`, or `"nodenext"`. See [`documents/migration/3.x-subpath-exports.md`](./documents/migration/3.x-subpath-exports.md) for the background and [`documents/migration/3.x-to-4.0.md`](./documents/migration/3.x-to-4.0.md) for what changed in 4.0.0.

---

## 2. Quick Start

### Step 1. Scaffold

```bash
npx style-gen init
```

The wizard asks for the theme file location (default `styles/theme.json`), the location of the generator script (default `plugins/theme-plugin.ts`) and whether to include a dark-mode template. Non-interactive: `npx style-gen init --dark`. It writes the theme, its `theme.schema.json` (for the theme's `"$schema"`), a small script that calls `generate()`, and `style-gen.config.json`. The script and `style-gen generate` write the same file, `theme.css` next to the theme; run either one (`node plugins/theme-plugin.ts` needs Node 24, which strips the types). Type-checking the script needs `"module": "esnext"`, `"nodenext"` or `"preserve"` with `resolveJsonModule`, because it imports the theme `with { type: "json" }`.

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
npx style-gen generate            # writes styles/theme.css
npx style-gen generate --watch    # regenerate on save
npx style-gen schema              # writes theme.schema.json (editor autocomplete)
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
npx style-gen init            # Interactive mode
npx style-gen init --dark     # Non-interactive, with a themeAxes.theme.dark template
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
npx style-gen generate
npx style-gen generate --theme ./theme.json --out ./theme.css --watch
```

| Flag            | Type      | Default             | Description                          |
| :-------------- | :-------- | :------------------ | :----------------------------------- |
| `--theme`       | `string`  | `styles/theme.json` | Path to the theme JSON file          |
| `--out`         | `string`  | `styles/theme.css`  | Path to the output CSS file          |
| `-w`, `--watch` | `boolean` | `false`             | Watch mode — auto-regenerate on save |

Positional `style-gen generate <theme> <out>` also works; flags take precedence. The file is written atomically. An invalid theme (`Invalid theme (<path>):`), an invalid config file (`Invalid config (<file>):` followed by one `path → message` line per issue, for example `extraSources.<i>` for a bad `extraSources` entry or `breakpoint` for a typo) or a write error leaves the output untouched and exits with code 1. A config file is read once at startup, so an invalid one also ends `--watch`; once watching has started, a theme or write error is logged and watching continues.

#### `style-gen schema`

Write the theme's JSON Schema (from `z.toJSONSchema(ThemeSchema)`) so editors can autocomplete keys and flag unknown ones when the theme declares `"$schema"`.

```bash
npx style-gen schema                            # → theme.schema.json
npx style-gen schema --out styles/theme.schema.json
```

#### `style-gen doctor`

Check the setup: config file (a malformed `style-gen.config.json` or `package.json["style-gen"]` is an error — `generate` warns and uses the defaults — and so is a schema-invalid one: config keys and option values are validated with the same schema as `generate()`, so both commands give the same verdict, and `doctor` prints `Config (<file>) ❌ Invalid` followed by the issues), JSON syntax, `ThemeSchema` validation (each issue printed as `path → message`), the generator script when `plugin` is configured, and the output file. A `styleGenVite`/`styleGenNext` or CLI-only setup needs no `plugin` entry. It also prints warnings — never errors — for schema-valid keys that collide with a Tailwind utility (for example `none` in `colors`/`shadows`/`borderRadius`, digit-only `borderWidth` keys, or typography keys such as `textSm`, `h1` → `h-1`, `italic`).

```bash
npx style-gen doctor
```

#### `style-gen --version`

Print the installed CLI version.

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

`breakpoints`, `screens`, `enableResponsive`, `spacing`, `typography` and `extraSources` are forwarded to `generate()`. Any other key — a typo such as `breakpoint`, or a legacy 3.x key such as `responsiveModules` — is rejected; only `$schema`, `theme`, `output` and `plugin` are accepted besides the forwarded keys. `plugin` is optional: it names the script `init` scaffolded, and only `doctor` reads it. The CLI resolves configuration in this order:

1. command flags
2. `style-gen.config.json`
3. `package.json["style-gen"]`
4. built-in defaults

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

Every token name, axis name and variant name must start with a letter or digit and then contain only letters, digits or `-`. In particular **`_` is rejected** — use camelCase such as `primaryActive` or kebab-case such as `primary-active` — because `_` would make the class name and the typed token disagree. The CLI, `styleGenVite` and `styleGenNext` print that hint on the offending path (`colors.primary_active → … use camelCase … or kebab-case …`). Two keys in one record that kebab-case to the same name (`blue500` and `blue-500`) are rejected too. Two keys in different categories that produce the same CSS variable (`colors.shadowPrimary` and `shadows.primary` both give `--sg-shadow-primary`) are rejected, and color keys may not produce a `--sg-sp-*` variable (that namespace is reserved for spacing, for example `spP`). Values may not contain `;`, `{`, `}`, `<`, `@`, `\`, `/*` or a line break, quotes must be balanced, and so must parentheses and brackets (`rgb(0 0 0` is rejected at its path).

### Categories

| Theme key       | Generates                                                                | Notes                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `colors`        | `bg-*`, `text-*`, `border-*` via `@theme inline` (`--color-*`)           | Required. Flat, camelCase.                                                                                                                                             |
| `typography`    | `@utility <kebab-key>` (`text16Medium` → `.text-16-medium`)              | Entry: `fontSize`, `lineHeight`, `fontWeight` (number), optional `letterSpacing`/`fontFamily`/`fontStyle`; an absent `letterSpacing` emits no declaration. No aliases. |
| `shadows`       | `shadow-*`                                                               |                                                                                                                                                                        |
| `backDropBlurs` | `backdrop-blur-*`                                                        |                                                                                                                                                                        |
| `borderRadius`  | `rounded-*` (+ `md:`/`lg:` variants for the active breakpoints)          | Falls back to `DEFAULT_ROUNDED_VALUES`.                                                                                                                                |
| `fontFamily`    | `font-*` via Tailwind's `--font-*` namespace                             | Keys may not be Tailwind font-weight names (`bold`, `medium`, …).                                                                                                      |
| `borderWidth`   | `border`, `border-x/y/t/r/b/l` utilities backed by `--sg-border-width-*` | Falls back to Tailwind's own `0/1/2/4` scale when omitted. Replaces the 3.x `border` key.                                                                              |

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

A value `"$<key>"` refers to another key **in the same category** and is emitted as `var(--sg-<key>)`:

```json
{
  "colors": { "blue500": "#3B82F6", "primary": "$blue500" },
  "shadows": { "base": "0 1px 2px rgb(0 0 0 / 0.1)", "card": "$base" }
}
```

The target is the raw key (`$blue500`, not `$blue-500`), it must exist, and the alias graph must be acyclic. Aliases are not allowed inside `typography`.

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
:root { --sg-primary: #3B82F6; … }
html[data-theme="dark"] { --sg-primary: #60A5FA; … }
html[data-palette="forest"] { --sg-primary: #16A34A; }
html[data-palette="high-contrast"] { --sg-primary: #000000; }
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
- **Override keys must already exist in the base** record; an override-only key would produce no utility and is rejected.
- **Compound overrides stay hand-written CSS.** A single override cannot target two axes' attributes at once:

| Axis (source)                                        | Content                                                                              | Handling                                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `theme` (`themeAxes.theme.dark`)                     | override `--sg-*` colors + shadows                                                   | Generated by the library — `html[data-theme="dark"]`                                                                                       |
| `palette` (`themeAxes.palette.{forest,sunset,mono}`) | override `--sg-*` colors                                                             | Generated by the library — `html[data-palette="forest\|sunset\|mono"]`                                                                     |
| compound `[data-theme="dark"][data-palette="…"]`     | cross-axis override (dark × a specific palette)                                      | Hand-written CSS: its `(0,2,0)` specificity beats either single-axis `html[data-…]` rule `(0,1,1)` regardless of source order              |
| `voice`, `geometry`, `surface` (`style-guide.css`)   | `--f-sans`, `--radius-sm`, `--shadow-sm`, and a nested `.sg-glass-target` child rule | Hand-written CSS: variables outside `--sg-*` and nested-child selectors are not representable by a theme override (see `examples/nuxt-v4`) |

The old single-axis key was renamed; a theme still using it is rejected with a message pointing at `themeAxes`. See the [migration guide](./documents/migration/3.x-to-4.0.md) for the exact message and the rewrite.

### Why the `--sg-*` intermediate variables?

`--sg-*` is an internal layer: it exists to break the circular reference that appears when a theme switches a variable that `@theme inline` also defines.

```css
/* Without the intermediate layer: circular! */
@theme inline {
  --color-primary: var(--color-primary);
}

/* With it: theme switching works */
:root {
  --sg-primary: #3b82f6;
}
html[data-theme="dark"] {
  --sg-primary: #60a5fa;
}
@theme inline {
  --color-primary: var(--sg-primary);
}
```

Consumers use standard Tailwind classes and variables, never `--sg-*`:

```html
<div class="bg-primary text-foreground">…</div>
```

```css
.custom {
  color: var(--color-primary);
}
```

### Built-in utility name clashes

A theme key whose class equals a Tailwind utility (`bg-none`, `shadow-none`, `rounded-none`, `border-2`, a typography key that becomes `text-sm`, `h-1` from `h1`, or `italic`, colors named `transparent`/`current`/`inherit`) is not rejected, but which rule wins is up to Tailwind's implementation of that utility. Pick a different name (`clear`, `flat`, `zero`, `heading1`); `style-gen doctor` lists the clashes it recognises.

---

## 5. Build-tool integrations

All of them write the same `theme.css` (the output of `generate()`); pick the one that matches your bundler. In each case, `@import` the file next to `@import "tailwindcss"`.

### Vite (and Nuxt) — `styleGenVite`

Emits `theme.css` on dev start, on build and whenever the theme file changes (HMR-friendly). The file is written synchronously in `configResolved`, before Tailwind scans; the examples list it ahead of `@tailwindcss/vite`:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { Breakpoint } from "@duydpdev/style-generator";

export default defineConfig({
  plugins: [
    styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "src/theme", // must match the @import path in your CSS
      options: { breakpoints: [Breakpoint.MD, Breakpoint.LG] },
    }),
    tailwindcss(),
  ],
});
```

Nuxt runs on Vite: register the same plugin in `nuxt.config.ts` under `vite.plugins` (see `examples/nuxt-v4`). Add `theme.css` to `.gitignore` if the theme JSON is your source of truth.

### Next.js — `styleGenNext`

Works with webpack and Turbopack and does not import `next`, so it adds no peer dependency:

```ts
// next.config.ts
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";

const nextConfig: NextConfig = {};

export default styleGenNext({
  themePath: "app/theme/theme.json",
  outDir: "app/theme",
})(nextConfig);
```

```css
/* app/globals.css */
@import "tailwindcss";
@import "./theme/theme.css";
```

It emits `theme.css` whenever Next evaluates the config and watches the theme file in `next dev`; `styleGenNext(opts)(nextConfig)` returns Next's `(phase) => config` function, so export its result as shown. Limitations: `nextConfig` must be a plain object (the function form `(phase, { defaultConfig }) => config` is not supported), and `themePath`/`outDir` are checked against `process.cwd()` by logical path — a symlink inside the project that points outside it is not detected.

### Anything else — CLI or script

```bash
npx style-gen generate --watch
```

or call `generate()` yourself:

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

Default keys: `p`, `px`, `py`, `pt`, `pb`, `pl`, `pr`, `m`, `mx`, `my`, `mt`, `mb`, `ml`, `mr`, `gap`, `gap-x`, `gap-y`, `top`, `right`, `bottom`, `left` (`SpacingKey`). Disable with `spacing: { enabled: false }`; customise with `spacing: { properties: { … } }`.

### Usage in components

```tsx
import { resolveSpacingProps } from "@duydpdev/style-generator/spacing";

const Box = ({ p, px, m, className, style, children }) => {
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

`generate()` returns them as `tokens`; you can also build them standalone (browser-safe) with `createDesignTokens`:

```ts
import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import theme from "./theme.json";

const { DesignTokens } = createDesignTokens(theme, {
  breakpoints: ["md", "lg"],
});
```

**`DesignTokens.Web`:**

| Token                 | Description                                                     |
| --------------------- | --------------------------------------------------------------- |
| `variantColor`        | All color keys (flat, camelCase)                                |
| `variantText`         | Keys of `typography`                                            |
| `variantShadow`       | Keys of `shadows`                                               |
| `variantBackdropBlur` | Keys of `backDropBlurs`                                         |
| `variantFontFamily`   | Keys of `fontFamily`                                            |
| `borderWidthOption`   | Keys of `borderWidth` (falls back to `0, 1, 2, 4`)              |
| `roundedOption`       | Keys of `borderRadius` (falls back to `DEFAULT_ROUNDED_VALUES`) |
| `spacingProperties`   | List of spacing props                                           |
| `breakpoints`         | Active breakpoints — defaults to `["md", "lg"]`                 |
| `screens`             | Breakpoint → width map                                          |

### `createVariantMapper` for CVA

`createVariantMapper(prefix, tokens)` returns a flat `Record<token, class>`. Classes are always kebab-cased with the same function the registry uses, so every class it returns is one that `@source inline` emits:

```ts
import { cva } from "class-variance-authority";
import {
  createVariantMapper,
  COLOR_STATES,
} from "@duydpdev/style-generator/cva";

const bg = createVariantMapper("bg", DesignTokens.Web.variantColor);
// { primary: "bg-primary", sidebarForeground: "bg-sidebar-foreground", … }

const button = cva("rounded px-4 py-2", { variants: { color: bg } });
button({ color: "primary" }); // → "rounded px-4 py-2 bg-primary"

// prefix "" yields the bare kebab-case token (typography):
createVariantMapper("", DesignTokens.Web.variantText); // { text12Mono: "text-12-mono", … }

// several prefixes at once → nested map
createVariantMapper(
  ["border-x", "border-y"],
  DesignTokens.Web.borderWidthOption,
);
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

### Custom breakpoint intellisense

```ts
import type { ResponsiveValueStrict } from "@duydpdev/style-generator/spacing";

type AppBreakpoints = "mobile" | "tablet" | "laptop" | "desktop"; // "base" is always allowed
export type ResponsiveValue<T> = ResponsiveValueStrict<T, AppBreakpoints>;
```

---

## 8. Options reference

`generate(theme, options)` and the plugins' `options` field take `StyleGeneratorOptions`:

| Option                    | Type                       | Default                      | Description                                                                                                                                                                                |
| :------------------------ | :------------------------- | :--------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `breakpoints`             | `(Breakpoint \| string)[]` | `["md", "lg"]`               | Breakpoints for responsive `@source inline` variants, spacing fallback chains and `DesignTokens.Web.breakpoints`.                                                                          |
| `screens`                 | `Record<string, string>`   | `defaultScreens`             | Custom screen widths (emitted as `@theme { --breakpoint-* }`).                                                                                                                             |
| `enableResponsive`        | `boolean`                  | `true`                       | Generate responsive spacing fallback chains.                                                                                                                                               |
| `spacing.enabled`         | `boolean`                  | `true`                       | Emit the `.sp-*` utilities.                                                                                                                                                                |
| `spacing.properties`      | `SpacingPropertyMap`       | `DEFAULT_SPACING_PROPERTIES` | Override or extend the spacing prop → CSS declaration map.                                                                                                                                 |
| `typography.cssVarDriven` | `boolean`                  | `false`                      | Emit `--typography-<name>-<prop>` variables in `:root` and reference them from each typography utility, so a single token can be overridden in CSS.                                        |
| `extraSources`            | `string[]`                 | `[]`                         | Extra `@source inline("<entry>")` lines for classes built at runtime (brace expansion allowed). Entries: non-empty, ≤ 512 characters, none of `"` `'` `\` `;` `@` `<` `>` or a line break. |

Class names built at runtime (a template literal such as `` `bg-${variant}` ``) are invisible to Tailwind's static scan; list them with `extraSources`, e.g. `extraSources: ["hover:bg-{primary,secondary}"]`.

`generate()` validates every option that reaches the CSS and throws a `ZodError` naming its path: unknown option keys (also inside `spacing` and `typography`) are rejected; `enableResponsive`, `spacing.enabled` and `typography.cssVarDriven` must be booleans; `breakpoints` entries, `screens` and `spacing.properties` keys follow the theme key grammar (letters, digits, `-`); `screens` values must be one length in px, rem or em, and the map merged with the px `defaultScreens` must use a single unit (reported at `screens`); every `breakpoints` entry must name a screen in `defaultScreens` or `screens` (reported at `breakpoints.<i>`); the CSS property names inside `spacing.properties` must be lowercase (`padding`, `column-gap`, `--custom`).

---

## 9. Exports API

| Export                                            | Subpath                                       | Description                                                                                                                                                                        |
| :------------------------------------------------ | :-------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate`                                        | `.`                                           | **Main entry.** Returns `{ css, tokens, schema }` from a Zod-validated theme.                                                                                                      |
| `defineTheme`, `defineOptions`                    | `.`                                           | Type-safe helpers; `defineTheme` also validates at runtime.                                                                                                                        |
| `formatZodError`                                  | `.`                                           | Formats a `ZodError` thrown by `generate()`/`defineTheme()` as one `path → message` line per issue.                                                                                |
| `generateThemeCss`                                | `.`                                           | Just `:root` variables, axis overrides and `@theme inline`; validates the theme like `generate()`.                                                                                 |
| `createDesignTokens`                              | `.`, `./tokens`                               | Typed `DesignTokens.Web.*`.                                                                                                                                                        |
| `createVariantMapper`, `COLOR_STATES`             | `.`, `./cva` (`COLOR_STATES` also `./tokens`) | Token keys → class names for CVA, optional `{ states }`.                                                                                                                           |
| `resolveSpacing`, `resolveSpacingProps`           | `.`, `./spacing`                              | Spacing props → `{ className(s), style }`.                                                                                                                                         |
| `styleGenVite`                                    | `./vite`                                      | Vite plugin writing `theme.css`.                                                                                                                                                   |
| `styleGenNext`                                    | `./next`                                      | Next.js config wrapper writing `theme.css`.                                                                                                                                        |
| `Breakpoint`, `defaultScreens`                    | `.`, `./tokens`                               | Breakpoint enum and default widths.                                                                                                                                                |
| `DEFAULT_ROUNDED_VALUES`, `DEFAULT_BORDER_VALUES` | `.`, `./tokens`                               | Fallback values for `borderRadius` / `borderWidth`.                                                                                                                                |
| `DEFAULT_SPACING_PROPERTIES`                      | `.`, `./spacing`                              | Default spacing prop → CSS declaration map.                                                                                                                                        |
| `roundedProperties`, `borderProperties`           | `.`, `./tokens`                               | Class-prefix lists of the `borderRadius` / `borderWidth` categories.                                                                                                               |
| Types                                             | `./types` (most also `.`)                     | `ThemeConfig`, `ThemeOverride`, `TypographyConfig`, `StyleGeneratorOptions`, `ResponsiveValueStrict`, `SpacingKey` (`./spacing`), the `*Variant<T>` aliases, `DesignTokensResult`. |

---

## 10. Development & CI

### Local (pre-commit)

**Husky** + **lint-staged** run checks before every commit (Husky is installed by `postinstall`):

1. `eslint` & `prettier`
2. `tsc --noEmit`
3. `vitest run`

### Remote (GitHub Actions)

`ci.yml` runs commitlint, lint, `prettier:check`, `tsc`, `build:all`, the `check:*` gates and the unit/type tests, a Playwright job, and a leg that re-resolves Tailwind to the 4.1.x peer floor and runs the unit and e2e suites against it. See [`documents/deploy.md`](./documents/deploy.md) and [`documents/testing.md`](./documents/testing.md).

```bash
yarn test          # Unit tests
yarn test:types    # Type tests (*.test-d.ts)
yarn test:e2e      # Playwright (Chromium + WebKit)
yarn test:coverage # Coverage report
```

---

## 11. Migration

- **3.x → 4.0.0** (breaking): [`documents/migration/3.x-to-4.0.md`](./documents/migration/3.x-to-4.0.md) — every removed API, the new theme fields, CLI changes and a rollback runbook.
- **4.0 → 4.1** (stricter validation): [`documents/migration/4.0-to-4.1.md`](./documents/migration/4.0-to-4.1.md)
- **Subpath exports (3.x)**: [`documents/migration/3.x-subpath-exports.md`](./documents/migration/3.x-subpath-exports.md) — historical; explains `moduleResolution` requirements.
- Older majors: 2 → 3 removed nested color objects and the `DEFAULT` key (flat camelCase keys only, use `createVariantMapper` for CVA); 1 → 2 flattened the `base`/`text`/`common` color buckets.
