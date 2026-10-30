# User Guide

How to integrate `@duydpdev/style-generator` 5.0 into a **Tailwind CSS v4** project. The full reference (options, exports, CLI) is in [`README.md`](../README.md); if you are upgrading from 4.x read [`migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md), and from 3.x read [`migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md).

## Table of contents

1. [Installation](#installation)
2. [Creating the theme config](#creating-the-theme-config)
3. [Generating CSS and importing it into Tailwind](#generating-css-and-importing-it-into-tailwind)
4. [Multi-axis theming](#multi-axis-theming)
5. [Spacing Helpers](#spacing-helpers)
6. [Build components](#build-components)
7. [TypeScript Tips](#typescript-tips)
8. [Upgrading from older versions](#upgrading-from-older-versions)

---

## Installation

The package is published to GitHub Packages. Configure the `@duydpdev` scope in the file your package manager reads (Yarn Berry reads `.yarnrc.yml` and ignores `.npmrc`); how to create a `read:packages` PAT is covered in the Install section of [`README.md`](../README.md#install).

Yarn Berry — `.yarnrc.yml`:

```yaml
npmScopes:
  duydpdev:
    npmRegistryServer: "https://npm.pkg.github.com"
    npmAlwaysAuth: true
    npmAuthToken: "${GITHUB_PAT}"
```

npm, pnpm, Yarn Classic — `.npmrc`:

```ini
@duydpdev:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PAT}
```

Then install:

```bash
yarn add @duydpdev/style-generator
```

**Peer dependencies:** `tailwindcss ^4.1.0` (Tailwind v3 is no longer supported); `typescript ^5 || ^6` (optional, to type-check against the package's `.d.ts`) and `vite ^5 || ^6 || ^7 || ^8` (optional, only when you use `styleGenVite`). The versions CI verifies are listed in the peer table in [`README.md`](../README.md). `zod` is a regular dependency of the package — no separate install needed.

```bash
yarn add tailwindcss typescript
```

---

## Creating the theme config

Create `styles/theme.json` holding all your design tokens. Only `colors` is required; every other field is optional. The theme is checked by a **strict** Zod schema: unknown keys, unsafe values and broken aliases are all rejected before any CSS is generated.

```json
{
  "$schema": "./theme.schema.json",
  "colors": {
    "blue500": "#3B82F6",
    "primary": "$blue500",
    "primaryForeground": "#FFFFFF",
    "sidebarForeground": "#111827",
    "background": "#FFFFFF",
    "muted": "#8E8E93"
  },
  "typography": {
    "text16Medium": {
      "fontSize": "16px",
      "fontWeight": 500,
      "lineHeight": "150%",
      "letterSpacing": "0px"
    }
  },
  "shadows": { "sm": "0px 1px 2px rgba(0, 0, 0, 0.05)" },
  "backDropBlurs": { "sm": "4px" },
  "borderRadius": { "md": "8px" },
  "fontFamily": { "sans": "\"Inter\", system-ui, sans-serif" },
  "borderWidth": { "thin": "1px" }
}
```

| Field           | Generates                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `colors`        | `bg-*`, `text-*`, `border-*` (required)                                                                                               |
| `typography`    | `@utility <kebab-key>` (`text16Medium` → `.text-16-medium`)                                                                           |
| `shadows`       | `shadow-*`                                                                                                                            |
| `backDropBlurs` | `backdrop-blur-*`                                                                                                                     |
| `borderRadius`  | `rounded-*` (+ `md:`/`lg:` variants for the enabled breakpoints)                                                                      |
| `fontFamily`    | `font-*` through Tailwind's `--font-*` namespace                                                                                      |
| `borderWidth`   | `border`, `border-x/y/t/r/b/l/s/e`, `divide-x/y` through Tailwind's `--border-width-*` namespace (replaces the `border` key from 3.x) |
| `themeAxes`     | per-axis overrides (see [Multi-axis theming](#multi-axis-theming))                                                                    |

### Key conventions

Color keys are **camelCase** (or kebab-case); the library converts them to kebab-case for CSS variables and classes:

| Theme key           | CSS variable                 | Tailwind class            |
| ------------------- | ---------------------------- | ------------------------- |
| `primaryForeground` | `--color-primary-foreground` | `text-primary-foreground` |
| `sidebarForeground` | `--color-sidebar-foreground` | `bg-sidebar-foreground`   |
| `blue500`           | `--color-blue-500`           | `border-blue-500`         |
| `primary`           | `--color-primary`            | `text-primary`            |

- A letter→digit boundary adds a dash (`blue500` → `blue-500`); keys that start with a digit are preserved (`2xl`). Two keys that kebab-case to the same name (`blue500` and `blue-500`) are rejected.
- Keys may contain only letters, digits and `-`, and must start with a letter or digit. **`_` is rejected in every name position** (token, axis name, variant name): use `primaryActive` or `primary-active`. Reason: `toKebabCase` keeps `_` while the camelCase token drops it, so the class generated by the mapper would not exist. The CLI prints the error as `colors.primary_active → … camelCase … kebab-case …`.
- Values must not contain `;`, `{`, `}`, `<`, `@`, `\`, `/*` or a line break; quotes must be balanced, and parentheses `(`/`[` outside quoted strings must be balanced too (`rgb(0 0 0` is rejected at its own path).
- A typography key must kebab-case to a valid `@utility` name (not starting with a digit or dash): `heading1` → `.heading-1`.
- A `fontFamily` key must not match a Tailwind font-weight name (`thin`, `light`, `normal`, `medium`, `bold`, `black`, …).
- Each category owns its own `--sg-<category>-` variable namespace (`--sg-color-*`, `--sg-shadow-*`, `--sg-sp-*`, …), so keys in two different categories never collide on a variable (`colors.shadowPrimary` → `--sg-color-shadow-primary`, `shadows.primary` → `--sg-shadow-primary`).
- A `typography` key must not kebab-case to `sp-*` or `font-*` (it would shadow the spacing and font utilities); `fontWeight` must be a number from 1 to 1000 (decimals are valid for variable fonts).
- A key that starts with a run of two or more capital letters (`CTA`, `ABtn`, `HTMLParser`) is rejected with a rename hint (`cta`): the class produced by the typed token (`c-ta`) differs from the class in the CSS (`cta`). A single capital (`Blue`) or an inner capital run (`primaryCTA`) is still valid.
- A `borderWidth` key must not kebab-case to the same name as a `colors` key (both would generate the class `border-<key>`).
- A summary of all naming rules, with rejected and valid examples: [Key rules](./reference/theme.md#key-rules).

### `$key` aliases

A value `"$<key>"` points to another key **in the same category** and is emitted as `var(--<cssVarPrefix>-<kebab-key>)`, so you do not repeat hex codes. The prefix belongs to the category (`sg-color` for `colors`, `sg-shadow` for `shadows`, `sg-backdrop-blur`, `sg-radius`, `sg-font`, `sg-border-width`), so the alias `"$base"` in `shadows` becomes `var(--sg-shadow-base)`, not `var(--sg-base)`:

```json
{
  "colors": { "blue500": "#3B82F6", "primary": "$blue500" },
  "shadows": { "base": "0 1px 2px rgb(0 0 0 / 0.1)", "card": "$base" }
}
```

The target is the **raw key** (`$blue500`, not `$blue-500`); it must exist and the alias graph must not contain cycles. Aliases are not supported in `typography`.

### Hover/active states

Declare sibling keys next to the base color: `primary`, `primaryHover`, `primaryActive`. The registry generates `hover:bg-primary-hover` and `active:bg-primary-active` (and the `text-`/`border-` forms) automatically, and `createVariantMapper(..., { states: COLOR_STATES })` merges them into a single class string (see [Build components](#build-components)). State names are kebab-cased (`focusVisible` → `focus-visible:`).

### Editor autocomplete

```bash
yarn style-gen schema        # writes theme.schema.json next to the theme file
```

Add `"$schema": "./theme.schema.json"` to the theme so the editor suggests keys and warns about unknown ones.

---

## Generating CSS and importing it into Tailwind

`generate(theme, options)` returns `{ css, tokens, schema }`. `css` is **a single file** to `@import` next to Tailwind — no `@plugin`, no safelist file:

```css
@import "tailwindcss";
@import "./theme.css";
```

Pick one way to write `theme.css`:

### Option 1: Vite plugin (recommended)

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "./style-gen.options"; // one shared source of options, see "Build components"

export default defineConfig({
  plugins: [
    react(),
    styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "src/theme", // must match the @import path in your CSS
      options,
    }),
    tailwindcss(),
  ],
});
```

The plugin writes `theme.css` (atomically, only when the content changes) in the `buildStart` hook, i.e. when the dev server starts and when a build begins; the theme is registered with Rollup (`this.addWatchFile`), so `vite build --watch` also rebuilds when the theme changes. In dev, every time you save the theme JSON the plugin rewrites the file (debounced) and only full-reloads the browser when the CSS actually changed. An error in `buildStart` fails the build with a per-stage message (`Invalid JSON in …`, `Invalid options:`, `Invalid theme (<path>):`, `Invalid theme/options:`, `Cannot write …`). `themePath` may be an absolute path or sit outside the root (a theme shared across a monorepo); `outDir` must be inside the root. Add `theme.css` to `.gitignore` if the theme JSON is the source of truth.

Two notes about the dev server:

- **Vite 5 needs `listen()`.** The dev server's `buildStart` only runs when `server.listen()` (or `middlewareMode`) is called; with `createServer()` followed by `ssrLoadModule` and no `listen()`, `theme.css` is not yet written on Vite 5. The plugin sets `perEnvironmentStartEndDuringDev`, so from Vite 6 onwards `buildStart` also runs in that case.
- **The plugin reads the config only once**, when Vite loads its config. Editing `style-gen.config.json` (the no-argument form) while the dev server is running has no effect yet: restart the dev server. Only the theme JSON file is watched.

Nuxt runs on Vite, so register the same plugin in `nuxt.config.ts → vite.plugins`. Nuxt 4 sets Vite's `root` to `app/` (`srcDir`), so relative paths are resolved from `app/`; use absolute paths:

```typescript
// nuxt.config.ts
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "./style-gen.options";

export default defineNuxtConfig({
  css: ["~/assets/css/globals.css"],
  vite: {
    plugins: [
      styleGenVite({
        themePath: fileURLToPath(new URL("./theme.json", import.meta.url)),
        outDir: fileURLToPath(new URL("./app/assets/css", import.meta.url)),
        options,
      }),
      tailwindcss(),
    ],
  },
});
```

Complete examples: `examples/react-v4` (Vite + React), `examples/nuxt-v4` (Nuxt 4) and `examples/next-v4` (Next 16) share the theme and options from `examples/design-system`; see [`examples/design-system/README.md`](../examples/design-system/README.md).

**No arguments:** `styleGenVite()` reads `style-gen.config.json` (or `package.json["style-gen"]`) at the Vite root — `theme`, `output` (the CSS file to write) and every `generate()` option — so the CLI and the bundler share a single source of configuration. A broken config or one that fails the schema throws `[style-gen-vite] Invalid config (<file>):` followed by each error line, and never silently falls back to defaults. When arguments are passed the config file is not read. The config file is read **once**, when the bundler loads its config (see above).

### Option 2: Next.js

```typescript
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

Works with both webpack and Turbopack, and does not import `next`, so it adds no peer dependency. It writes `theme.css` only when Next loads the config in `phase-development-server` (`next dev`, with a watcher) or `phase-production-build` (`next build`); other phases (`next start`, export, …) return the config without reading the theme. `nextConfig` can be an object or a function `(phase, { defaultConfig }) => config` (called with Next's own arguments). The no-argument `styleGenNext()` reads `style-gen.config.json` from `process.cwd()` like Vite does, and also only **once** when Next loads the config (after editing the config file, restart `next dev`). The `next dev` watcher does not die when the theme is temporarily invalid (the error is logged and the old `theme.css` is kept) and is replaced when the config reloads with a different theme/output. `themePath` may be absolute or outside the project, while `outDir` must be inside the project; a leading `/` is no longer rewritten into a relative path. Limitation: the path guard does not `realpath` symlinks. When the theme and options live in a workspace package (like `examples/design-system`), add that package to Next's `transpilePackages`. See `examples/next-v4`.

### Option 3: CLI

```bash
yarn style-gen init                 # scaffold theme + theme.schema.json + generate() script + style-gen.config.json
yarn style-gen generate             # writes styles/theme.css
yarn style-gen generate --watch     # regenerates when theme or style-gen.config.json is saved
yarn style-gen doctor               # checks config, schema, theme × options; warns about utility collisions, suggests $alias and flags leftover 4.x-style --sg-<color> variables (scans source files under the current directory)
yarn style-gen schema               # writes theme.schema.json next to the theme
yarn style-gen tokens               # writes theme.tokens.ts: only the DesignTokens.Web keys, for client bundles
yarn style-gen budget .next/static/css --max-gzip 14925   # CI: fail when built CSS exceeds the gzip budget
```

Do not run the CLI through `npx`: the name `style-gen` is not held by anyone on public npm, so `npx` could download a stranger's package. With npm, run `npm exec --no -- style-gen`.

`style-gen --help` lists the commands, and `style-gen <command> --help` prints that command's own flags. Flags are parsed **strictly**: an unknown flag (`--them`) is an error rather than being ignored. Exit codes: `0` success / `--help` / `--version` / prompt cancelled, `1` error (`budget` uses `2` for syntax errors, see below).

`generate` flags: `--theme <path>`, `--out <path>`, `-w`/`--watch`. Configuration is resolved per key in this order: flags → config file → defaults (`styles/theme.json` → `styles/theme.css`). The config file is one of two sources, chosen _either/or_: `style-gen.config.json` if it exists, otherwise `package.json["style-gen"]`; the two sources are never merged (a broken `style-gen.config.json` is reported as an error rather than falling through to `package.json`). The config file is validated with the same schema as the `generate()` options: a mistyped key (`breakpoint` instead of `breakpoints`) or an invalid value makes `generate` print `Invalid config (<file>):` followed by each `path → message` line, write no file and exit with code 1; `doctor` reports `Config (<file>) ❌ Invalid`, stops there (later steps would run on wrong defaults) and exits with code 1. A config file that is not parseable JSON (broken) makes `generate` warn and then use the defaults. `--theme` may point outside the project; `--out` and `output` must be inside the project.

`--watch` watches both the theme **and the config file** and re-reads the config on every change, so changes to `output`, `breakpoints`, `resetTailwindDefaults`… take effect without a restart. Editing the config into an invalid state only reports an error and **the last valid config is kept** until you fix it. A theme that cannot be read at startup (missing file, is a directory) or an invalid config at startup exits with code 1 before the watcher is created; once watching, theme/write errors are only logged.

`tokens` writes `theme.tokens.ts` (`export const tokens = {…} as const`) containing only the **keys** of `DesignTokens.Web` (one array of camelCase keys per category, plus `breakpoints`, `screens`, `spacingProperties`), so client bundles do not have to carry the `./tokens` runtime and the theme JSON (about 2.4 kB gzip versus about 0.6 kB). By default it is written next to the theme and must be inside the project (a theme outside the project needs `--out`); re-run it when the theme's keys change.

`budget <file.css|dir> --max-gzip <bytes>` sums the gzip size of every `.css` file (recursively if given a directory) and prints `OK: …` or `OVER BUDGET: …`. Exit code `0` within budget, `1` over budget, `2` for a syntax error / unreadable input / no CSS. This command replaces the `check-css-budget.mjs` script that consumers used to copy.

The script generated by `init` and the one written by `style-gen generate` are the same file (`output` in the config); run either one (`node plugins/theme-plugin.ts` needs Node >= 22.18). `doctor` only checks the script when the config has `plugin` — a `styleGenVite`/`styleGenNext` setup or a CLI-only setup does not need it. `doctor` also checks the theme × options pair (`❌ Invalid theme/options`), treats an `output`/`plugin` that escapes the root as an error, and prints an `$alias` suggestion when an override in `themeAxes` repeats the literal value of another key in the base.

### Option 4: Custom script

```typescript
import { writeFileSync } from "node:fs";
import {
  generate,
  defineTheme,
  defineOptions,
  Breakpoint,
} from "@duydpdev/style-generator";
import themeJson from "./theme.json";

const theme = defineTheme(themeJson); // type-checked AND validated at runtime
const options = defineOptions({
  screens: { md: "800px" },
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
});

const { css, tokens } = generate(theme, options);
writeFileSync("styles/theme.css", css, "utf8");
export { tokens };
```

### Classes built at runtime

Every color always gets `bg-*`/`text-*`/`border-*` thanks to the `@source inline` lines the registry generates. Classes you assemble with template literals cannot be scanned by Tailwind — declare them with `extraSources`:

```typescript
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, { extraSources: ["hover:bg-{primary,secondary}"] });
```

### Narrowing `@source inline` per category (`coverage`)

By default each category has one `@source inline` line covering every key (colors: all three prefixes `bg-`/`text-`/`border-`). A large palette makes that line long; `coverage` narrows it per category (`colors`, `typography`, `shadows`, `backDropBlurs`, `borderRadius`, `fontFamily`, `borderWidth`):

| `coverage.<category>` | Effect                                                                                                                                                                                                                                                                                                        |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| absent, `true`, `{}`  | Output as before, byte for byte.                                                                                                                                                                                                                                                                              |
| `false`               | Emits no `@source inline` line for the category, state lines (`hover:`, `active:`) included.                                                                                                                                                                                                                  |
| `{ prefixes: [...] }` | Keeps only the listed class prefixes (`bg`, `rounded-t`, …). Each prefix must belong to that category, otherwise `generate()` throws; typography has no prefixes (the key is the class).                                                                                                                      |
| `{ keys: "aliased" }` | Keeps only keys whose value is an alias `"$<key>"` (_alias-holding_ keys) in the base or in any `themeAxes` override; the primitives they point to need no class. The state line follows: `hover:bg-x-hover` remains only when both `x` and `xHover` remain. Not usable for `typography` (it has no aliases). |
| `{ keys: "all" }`     | Default: every key.                                                                                                                                                                                                                                                                                           |

`prefixes` and `keys` can be combined; the `prefixes` list must be non-empty. With `keys: "aliased"`, if the category has no alias-holding key (or declares no keys), nothing is emitted: the default value is not an alias. `coverage` only trims `@source inline`: `@theme inline`, `@utility` and the typed `DesignTokens` stay unchanged, so a class that is still used but no longer covered must appear literally in the source or be declared through `extraSources`.

```typescript
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, {
  coverage: {
    colors: { prefixes: ["bg", "text"], keys: "aliased" },
    shadows: false,
  },
});
```

### Clearing Tailwind's default namespaces (`resetTailwindDefaults`)

By default Tailwind keeps its own color scale, `rounded-*` and `shadow-*` next to your tokens. `resetTailwindDefaults` clears each namespace so only the theme's tokens remain:

```typescript
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, { resetTailwindDefaults: ["colors", "radius", "shadow"] });
```

Each name adds a `--color-*: initial;`, `--radius-*: initial;` or `--shadow-*: initial;` line at the **start** of the `@theme inline` block. `"colors"` also removes `--color-white`/`--color-black` (declare them yourself in `colors` if you still use them). Static utilities such as `rounded-full`, `rounded-none`, `shadow-none` and the `inset-`/`drop-`/`text-shadow` families are untouched. Each name demands a non-empty replacement in the theme: `"colors"` demands `colors` (non-empty; the schema still accepts `colors: {}`), `"radius"` demands `borderRadius`, `"shadow"` demands `shadows` (otherwise `generate()` throws at `resetTailwindDefaults.<i>`, because clearing the defaults without a replacement makes `bg-red-500`/`rounded-md`/`shadow-md` compile to nothing); `doctor` reports this error too. Duplicate names or a different order do not change the output. Also usable in `style-gen.config.json`.

### Classes that collide with built-in Tailwind utilities

A key whose class collides with a Tailwind utility (`none` in `colors`/`shadows`/`borderRadius`, a typography key that becomes `text-sm`, `h-1` (from `h1`), `italic`…, the colors `transparent`/`current`/`inherit`) is not rejected by the schema, but which rule wins is decided by Tailwind. Pick another name (`clear`, `flat`, `zero`, `heading1`); `style-gen doctor` lists the collisions it recognizes (warnings only). An all-digit `borderWidth` key (`2`) is the exception, not an ambiguous collision: since 5.0 the theme value replaces Tailwind's built-in `border-2`, `border-x-2`, `divide-x-2` (Tailwind looks up the theme before the default scale); `doctor` still warns so you can confirm that it is deliberate.

---

## Multi-axis theming

`themeAxes` maps an **axis name** → its **variants**; each variant lists only the values that differ from the base. Several axes can be active at once:

```json
{
  "colors": {
    "primary": "#007AFF",
    "background": "#FFFFFF",
    "foreground": "#1C1C20"
  },
  "shadows": { "sm": "0px 1px 2px rgba(0, 0, 0, 0.05)" },
  "themeAxes": {
    "theme": {
      "dark": {
        "colors": {
          "primary": "#0A84FF",
          "background": "#000000",
          "foreground": "#FFFFFF"
        },
        "shadows": { "sm": "0px 1px 2px rgba(255, 255, 255, 0.1)" }
      }
    },
    "palette": {
      "forest": { "colors": { "primary": "#16A34A" } },
      "highContrast": { "colors": { "primary": "#000000" } }
    }
  }
}
```

The generated CSS (after `:root`, in declaration order):

```css
html[data-theme="dark"] { … }
html[data-palette="forest"] { … }
html[data-palette="high-contrast"] { … }
```

Activate on the `<html>` element:

```html
<html data-theme="dark" data-palette="high-contrast">
  …
</html>
```

Rules to remember:

- **The selector is pinned to `html`** (default, `axes.scope: "root"`). An attribute placed on another wrapping element has no effect: a `var()` alias is evaluated at the element that _declares_ the variable (`:root`), so an override on a child element never reaches the alias value. For a local theme set `axes.scope: "element"` (see [Changing the attribute and scope](#changing-the-attribute-and-scope-axes)).
- **The attribute value is the kebab form of the key**: variant `highContrast` → `data-palette="high-contrast"`; axis `colorScheme` → `data-color-scheme`.
- **Precedence = declaration order**: two axes overriding the same token have equal specificity, and the axis declared **later** wins.
- **Axis/variant names must not be integers** (`100`, `2024`): JS enumerates number-like keys first and breaks the order. Use `contrast100`.
- **An override key must exist in the base** — a key that exists only in an override produces no utility and is rejected at parse time.
- **Overrides combined across axes** (`[data-theme="dark"][data-palette="forest"]`) and variables outside `--sg-*` are still hand-written CSS; see the scope table in [`examples/design-system/README.md`](../examples/design-system/README.md).

`--sg-*` is an intermediate variable layer that avoids reference cycles when switching themes. In application code, prefer standard Tailwind classes (`bg-primary`) or `var(--color-primary)`. The variables the library emits (`--sg-color-<key>`, `--sg-shadow-<key>`, `--sg-radius-<key>`, …, and spacing's `--sg-sp-*`) are public output: aliases point into them and hand-written CSS may read or override them; renaming one is a breaking change. Version 5.0 renamed the color variables from `--sg-<color>` to `--sg-color-<key>`; `style-gen doctor` warns with `file:line` for every leftover `var(--sg-<colorKey>)` or `--sg-<colorKey>:` declaration (see [`migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md)).

### Changing the attribute and scope (`axes`)

By default the selector is `html[data-<axis-kebab>="<variant-kebab>"]`. `options.axes` renames the attribute per axis and lets you unpin `html`:

```typescript
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, {
  axes: {
    attribute: { theme: "data-mode" }, // axis → attribute name; axes not listed keep data-<axis-kebab>
    scope: "element", // "root" (default) | "element"
  },
});
```

```css
[data-mode="dark"] { … }            /* scope: "element" — no html */
html[data-palette="forest"] { … }   /* scope: "root" — default */
```

- **`attribute` is a map**, not a function: `style-gen.config.json` can express it. Names must match `[a-z][a-z0-9-]*` (lowercase like the default `data-<axis-kebab>`; it is embedded into the selector). `themeAxisAttributes(state, { attribute })` from `./recipes` reads exactly this map so the DOM and the CSS never drift apart.
- **`scope: "root"`** keeps the selector pinned to `html` as in the rule above. **`scope: "element"`** drops `html`, so the attribute can be placed on any element (a local theme for one region).
- **Alias rules when `scope: "element"`.** An alias `"$<key>"` is still evaluated at the element that _declares_ it (`:root`), so it keeps the base value inside the element that carries the attribute. `generate()` therefore throws a `ZodError` when a variant overrides a key `T` that another entry `H` aliases to (directly or through an alias chain, in any category), unless that variant re-declares `H` itself (with a literal value or `"$<key>"`). `H`'s alias is looked up in the base theme **and** in every other variant of every axis (for example `dark` writes `primary: "$brand"` while `light` overrides `brand` without re-declaring `primary`). The error is located at the overridden key (`themeAxes.<axis>.<variant>.<category>.<key>`); with an alias chain, each old link is reported as a separate error at the same path. Fix it by re-declaring the alias-holding entry in the variant, or use `scope: "root"`.
- **The attribute check runs for every `scope`:** a key in `attribute` must be the name of an axis in `themeAxes` (error at `axes.attribute.<axis>`), and two axes must not resolve to the same attribute name (for example `attribute: { theme: "data-palette" }` when a `palette` axis exists; error at `axes.attribute.<axis>`).
- **A variant named `base` is reserved:** `"base"` means "no override" (`ThemeAxesState`, `themeAxisAttributes`), so `ThemeSchema` rejects `themeAxes.<axis>.base`. Pick another name (`default`, `standard`). An axis named `base` is still valid.
- `generateThemeCss(theme, options)` accepts the same `options` as its second parameter.

---

## Spacing Helpers

The library pre-generates the `.sp-*` utilities (one `@utility` per key, with the breakpoint fallback chain inside the utility itself) — no per-value safelist needed. Components only set the inline `--sg-sp-*` variables with `resolveSpacingProps`:

```tsx
import {
  resolveSpacingProps,
  type ResponsiveValueStrict,
} from "@duydpdev/style-generator/spacing";
import type { CSSProperties, ReactNode } from "react";

interface BoxProps {
  p?: ResponsiveValueStrict<number>;
  px?: ResponsiveValueStrict<number>;
  py?: ResponsiveValueStrict<number>;
  m?: ResponsiveValueStrict<number>;
  mx?: ResponsiveValueStrict<number>;
  my?: ResponsiveValueStrict<number>;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const Box = ({
  p,
  px,
  py,
  m,
  mx,
  my,
  className,
  style,
  children,
}: BoxProps) => {
  const spacing = resolveSpacingProps({ p, px, py, m, mx, my });

  return (
    <div
      className={[spacing.classNames, className].filter(Boolean).join(" ")}
      style={{ ...spacing.style, ...style }}
    >
      {children}
    </div>
  );
};
```

<!-- snippet: no-check shows rendered output, not code -->

```tsx
<Box p={4} />
// → class="sp-p" style="--sg-sp-p: 1rem"

<Box p={{ base: 2, md: 4, lg: 8 }} />
// → class="sp-p" style="--sg-sp-p: 0.5rem; --sg-sp-p-md: 1rem; --sg-sp-p-lg: 2rem"

<Box p={13.5} />
// → class="sp-p" style="--sg-sp-p: 3.375rem"

<Box gap={{ base: 4, md: 8 }} gapX={2} />
// resolveSpacingProps({ gap: …, "gap-x": 2 }) → class="sp-gap sp-gap-x"
```

- `classNames` is a **string** (joined with spaces), not an array.
- **Same-element rule:** the `--sg-sp-*` variables are registered with `inherits: false`, so an `sp-*` class only reads variables declared on that very element; a parent's values do not leak down to children.
- Valid props are `SpacingKey`: `p`, `px`, `py`, `pt`, `pb`, `pl`, `pr`, `m`, `mx`, `my`, `mt`, `mb`, `ml`, `mr`, `gap`, `gap-x`, `gap-y`, `top`, `right`, `bottom`, `left`. `resolveSpacing(prop, value, unit?)` handles a single prop; `unit` defaults to `0.25` rem.
- Only the breakpoints in `options.breakpoints` (default `["md", "lg"]`) get a fallback chain. The default types also accept only `md`/`lg` (`DefaultBreakpointKeys`); when you set a different `options.breakpoints`, pass the same keys as the type argument: `resolveSpacingProps<"md" | "lg" | "xl">(…)`, `ResponsiveValueStrict<number, "md" | "lg" | "xl">`.
- Disable with `spacing: { enabled: false }`; customize with `spacing: { properties: { inset: ["top", "bottom"] } }` (spacing key → the list of CSS properties it sets; the value is always `var(--sg-sp-<key>)`, so it needs no declaration).
- `generate()` checks every option with a strict schema and throws a `ZodError` with a path: unknown keys are rejected (including inside `spacing` and `typography`); `enableResponsive`, `spacing.enabled`, `typography.cssVarDriven` must be booleans; `breakpoints` elements, `screens` keys and `spacing.properties` follow the theme key grammar (letters, digits, `-`); each `screens` value must be a single px/rem/em length, and the map merged with `defaultScreens` (px) may use only one unit (the error is reported at `screens`); each `breakpoints` element must be the name of a screen in `defaultScreens` or `screens` (the error is reported at `breakpoints.<i>`); CSS property names in `spacing.properties` must be lowercase (`padding`, `column-gap`, `--custom`).

---

## Build components

This section goes from theme to component, following the order of the files in `examples/design-system` (a workspace package shared by the three sample apps `react-v4`, `next-v4`, `nuxt-v4`; details in [`examples/design-system/README.md`](../examples/design-system/README.md)). Each step imports only from browser-safe subpaths (`./tokens`, `./cva`, `./recipes`, `./types`), never pulling Zod or Node into the client bundle.

```text
src/theme.json         → theme (source of truth)
src/style-gen.options.ts → shared options (bundler, tokens, recipe)
src/tokens.ts          → createDesignTokens(theme, options)
src/recipes/*.ts       → headless recipes (cva + createVariantMapper)
src/cn.ts              → clsx + tailwind-merge aware of the theme's tokens
src/axes.ts            → themeAxisAttributes<Theme>
```

### 1. Theme

A single JSON file as in [Creating the theme config](#creating-the-theme-config). Import it as a module (`resolveJsonModule`) to keep the literal type of each key:

```typescript
import themeJson from "./theme.json";

export type Theme = typeof themeJson; // input of ColorVariant<Theme>, ThemeAxesState<Theme>, …
export const theme = themeJson;
```

### 2. Shared options: `style-gen.options.ts`

Every place that calls `generate()` (Vite plugin, Next plugin, `createDesignTokens`, the recipe types) must see the **same** options, otherwise `@source inline` and the tokens drift apart. Put them in a module with no dependencies:

```typescript
// src/style-gen.options.ts
import type { StyleGeneratorOptions } from "@duydpdev/style-generator/types";

export const options = {
  breakpoints: ["md", "lg"],
} as const satisfies StyleGeneratorOptions;
```

Use `as const satisfies` with `import type`, not `defineOptions()`: `defineOptions` exists only at the root `.` (it pulls Zod into the browser bundle), while this file is loaded both by the bundler config under Node (type stripping) and in the browser. The literal `breakpoints` tuple is what narrows `BreakpointKeys<typeof options>` to `"md" | "lg"`. If the project also uses the CLI (`style-gen generate`), `style-gen.config.json` must repeat these values; the example has a test so the two copies do not drift apart.

### 3. Tokens

`generate()` returns `tokens`; to use them on the client, build a separate, browser-safe set with `createDesignTokens` from `./tokens`:

```typescript
// src/tokens.ts
import { createDesignTokens } from "@duydpdev/style-generator/tokens";

import { options } from "./style-gen.options";
import themeJson from "./theme.json";

export const tokens = createDesignTokens(themeJson, options).DesignTokens.Web;
```

**Tokens in `DesignTokens.Web`:**

| Token               | Description                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `colors`            | All color keys (flat, camelCase)                                                              |
| `typography`        | Keys of `typography`                                                                          |
| `shadows`           | Keys of `shadows`                                                                             |
| `backDropBlurs`     | Keys of `backDropBlurs`                                                                       |
| `fontFamily`        | Keys of `fontFamily`                                                                          |
| `borderWidth`       | Keys of `borderWidth` (default `0, 1, 2, 4` when absent or `{}`)                              |
| `borderRadius`      | Keys of `borderRadius` (default `DEFAULT_ROUNDED_VALUES` when absent or `{}`)                 |
| `spacingProperties` | List of spacing props — keys of `options.spacing.properties` or the default                   |
| `breakpoints`       | Breakpoints in use — default `["md", "lg"]`                                                   |
| `screens`           | Breakpoint → width map: the default screens plus the keys of `options.screens`                |
| `aliasedColors`     | `colors` keys whose value is an alias `"$<key>"` in the base record or a `themeAxes` override |

Each array's name matches the corresponding `ThemeConfig` field (`DesignTokens.Web.colors` holds the keys of `theme.colors`); `spacingProperties`, `breakpoints`, `screens` come from options. Every array is `readonly`, and options are inferred as literals (`generate`, `createDesignTokens`, `defineOptions` take a `const O`): `breakpoints: ["md", "xl"]` gives `DesignTokens.Web.breakpoints` the type `readonly ("md" | "xl")[]`. When options are declared with the type `StyleGeneratorOptions`, or with an explicit type argument for the theme only (`createDesignTokens<typeof theme>(theme, { breakpoints: ["xl"] })`), those two fields widen to `readonly string[]`; drop the type argument to keep the literals. When `options` is not passed the defaults are used (`readonly ("md" | "lg")[]`). `aliasedColors` is computed at runtime from the base record and every override; its type keeps each key whose value is a literal `$…` or `string`. Related types: `DesignTokensWeb<TTheme, O>`, `DesignTokensResult<TTheme, O>`; `ThemeAxisName`, `ThemeAxisVariant`, `ThemeAxesState` type the `data-<axis>` attributes (keys and values are the raw keys in the theme, while the generated attribute/selector is kebab-case: `colorMode` + `high-contrast` → `html[data-color-mode="high-contrast"]`).

### 4. Recipe: `createVariantMapper` + `COLOR_STATES`

For sibling keys `primaryHover`/`primaryActive` in the theme, `{ states }` merges them into the base key's class:

```typescript
import {
  createVariantMapper,
  COLOR_STATES,
} from "@duydpdev/style-generator/cva";

const bg = createVariantMapper(
  "bg",
  ["primary", "primaryHover", "primaryActive", "danger"] as const,
  { states: COLOR_STATES },
);
// primary: "bg-primary hover:bg-primary-hover active:bg-primary-active"
// primaryHover: "bg-primary-hover", primaryActive: "bg-primary-active", danger: "bg-danger"
```

Always pass `COLOR_STATES` instead of typing `["hover", "active"]` by hand — it is the list the `@source inline` lines use as well. Pass camelCase keys like the ones `DesignTokens.Web.colors` provides (`primaryHover`, not `primary-hover`).

`prefix` has the type `RegistryPrefix | ""` (the prefixes the registry emits `@source inline` for; `""` is for typography), so `createVariantMapper("ring", …)` or a prefix held in a `string`-typed variable is a type error: they map to classes that no `@source inline` line keeps. To bypass the check for a single prefix, pass `{ allowUnregisteredPrefix: true }` as the third argument and declare the classes in `extraSources`. This cannot be combined with `{ states }` or an array of prefixes.

A headless recipe composes the mappers with `cva`; framework components (React, Vue) just wrap it. The DX anchor is `satisfies` on the intent list: rename or delete a color in `theme.json` and the compiler flags exactly that line, instead of emitting a class that no longer exists.

<!-- snippet: no-check imports ../tokens from src/recipes/button.ts, type-checked by the design-system example -->

```typescript
// src/recipes/button.ts (abridged)
import { cva } from "class-variance-authority";
import {
  COLOR_STATES,
  createVariantMapper,
} from "@duydpdev/style-generator/cva";
import type { ColorVariant } from "@duydpdev/style-generator/types";

import { tokens, type Theme } from "../tokens";

export const intents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<Theme>[];

const bg = createVariantMapper("bg", tokens.colors, { states: COLOR_STATES });

export const buttonRecipe = cva("inline-flex items-center", {
  variants: { color: bg },
});
```

The example's eight recipes (`button`, `input`, `card`, `badge`, `stack`, `dialog`, `text`, `box`) all follow this pattern. Classes with opacity (`bg-primary/10`) are outside the registry's `@source inline` coverage, so write them out literally in a source file so Tailwind's scanner finds them.

### 5. `cn`: merging classes with awareness of the theme's tokens

By default `tailwind-merge` does not know your theme's `text-16-medium`, `shadow-md` or `rounded-pill`, so it may keep the wrong class. `createTailwindMergeExtension` (from `./recipes`) registers them in the right class groups; `tailwind-merge` remains a dependency of the application:

```typescript
// src/cn.ts
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { createTailwindMergeExtension } from "@duydpdev/style-generator/recipes";

import { tokens } from "./tokens";

const twMerge = extendTailwindMerge(createTailwindMergeExtension(tokens));

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
```

`cn("text-16-medium", "text-32-bold")` keeps the latter class, and so does `cn("rounded-md", "rounded-pill")`. Components call `cn(buttonRecipe({ … }), className)`.

### 6. Enabling theme axes on the DOM: `themeAxisAttributes`

`themeAxisAttributes<Theme>(state, attributes?)` returns the `data-*` attributes of the active axes, typed from `theme.json`; `"base"` or an omitted axis emits nothing. By default the attribute is `data-<axis>`; when `options.axes.attribute` renames attributes, pass the same map as the second argument so the DOM and the CSS selectors do not drift apart:

```typescript
// src/axes.ts
import { themeAxisAttributes } from "@duydpdev/style-generator/recipes";
import type { ThemeAxesState } from "@duydpdev/style-generator/types";

import type { Theme } from "./tokens";

export const axisAttributes = (state: ThemeAxesState<Theme>) =>
  themeAxisAttributes<Theme>(state);

axisAttributes({ theme: "highContrast", palette: "forest" });
// { "data-theme": "high-contrast", "data-palette": "forest" }
```

Spread the result onto `<html>` (React: `<html {...axisAttributes(state)}>`; Nuxt: `useHead({ htmlAttrs: axisAttributes(state) })`). If `options.axes.attribute` renames attributes, pass the same map as the second parameter (`{ attribute }`).

### 7. Spacing props: `splitSpacingProps`

A component that accepts spacing props (`p`, `px`, `gap`, …, a number or `{ base, md, lg }`) separates them from the rest with `splitSpacingProps` from `./recipes`; the type `SpacingProps<BreakpointKeys<typeof options>>` takes its breakpoint keys from options, so `{ xl: 4 }` is a type error when `xl` is not in `breakpoints`:

```typescript
import { splitSpacingProps } from "@duydpdev/style-generator/recipes";
import { tokens } from "./tokens";

declare const props: {
  p: number;
  mx: { base: number; md: number };
  id: string;
};

const { spacing, rest } = splitSpacingProps(props, tokens.spacingProperties);
// with props = { p: 4, mx: { base: 2, md: 4 }, id: "x" }:
// spacing.className → "sp-p sp-mx"
// spacing.style     → { "--sg-sp-p": "1rem", "--sg-sp-mx": "0.5rem", "--sg-sp-mx-md": "1rem" }
// rest → the remaining props (className, children, …)
```

---

## TypeScript Tips

### `defineTheme()` — type-check and validate

```typescript
import { defineTheme } from "@duydpdev/style-generator";

const theme = defineTheme({
  colors: { primary: "#007AFF", background: "#FFFFFF" },
  typography: {
    body: {
      fontSize: "16px",
      lineHeight: "150%",
      fontWeight: 400,
      letterSpacing: "0px",
    },
  },
});
```

TypeScript reports an error right away when `colors` is missing; at runtime `defineTheme` throws a `ZodError` (with a `path`) for unknown keys or unsafe values. It exists only in the root barrel `.` — not in `./tokens`, so Zod does not leak into the subpaths used in the browser. `generate()` always re-validates, so `defineTheme` is optional. To print readable errors, wrap the call in `catch` and pass the `ZodError` to `formatZodError` (also exported from `.`): it returns one `path → message` line per issue.

### Semantic type aliases

```typescript
import type {
  ColorVariant,
  TextVariant,
  BorderWidthVariant,
} from "@duydpdev/style-generator/types";
import theme from "./theme.json";

type Theme = typeof theme;

type ButtonProps = {
  color?: ColorVariant<Theme>;
  borderWidth?: BorderWidthVariant<Theme>;
  textStyle?: TextVariant<Theme>;
};
```

Available aliases: `ColorVariant`, `TextVariant`, `ShadowVariant`, `BackdropBlurVariant`, `FontFamilyVariant`, `BorderWidthVariant`, `RoundedVariant`, plus the mapped type `DesignTokenKeys<T>`.

### Responsive value — strict mode only

`ResponsiveValueStrict` is the only responsive type; a mistyped breakpoint (`{ typo: 4 }`) is a type error, and `base` is always allowed:

```typescript
import type { ResponsiveValueStrict } from "@duydpdev/style-generator/spacing";

// "base" is always valid; every other key must be declared in `options.breakpoints`
// and present in `screens` (or `defaultScreens`), otherwise there is no matching CSS.
type AppBreakpoints = "mobile" | "tablet" | "laptop" | "desktop";
export type ResponsiveValue<T> = ResponsiveValueStrict<T, AppBreakpoints>;
```

---

## Upgrading from older versions

- **4.x → 5.0.0** (breaking: `--sg-color-*`, `borderWidth` through `@theme`, `spacing.properties` as an array, renamed `DesignTokens.Web` keys, stricter typography, Node runner: emit in `buildStart`, no-argument plugin, `resolveProjectPath`, CLI exit codes + strict flags, `tokens`/`budget` commands, `resetTailwindDefaults`, reserved `base` variant, `.d.cts` declarations): [`migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md).
- **3.x → 4.0.0** (breaking: Tailwind v4 only, `generate()` replaces the plugin + safelist, strict schema, `themeAxes`, `borderWidth`, `--sg-sp-*`): [`migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md), including a before/after table and a rollback runbook.
- The 3.x subpath exports rollout (historical, still carries the `moduleResolution` requirement): [`migration/3.x-subpath-exports.md`](./migration/3.x-subpath-exports.md).
- The single-axis `themes` key was renamed to `themeAxes`; a theme that still uses the old name is rejected with a message explaining the rename (verbatim in the migration guide).
- Older majors: 2 → 3 removed nested color objects and the `DEFAULT` key (only flat camelCase keys remain); 1 → 2 flattened the `base`/`text`/`common` color groups.
