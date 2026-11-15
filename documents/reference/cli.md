# CLI

The `style-gen` command-line tool: `init`, `generate`, `schema`, `doctor`, `tokens` and `budget`.

> **Warning:** Install the package first and always run the CLI through your package manager (`yarn style-gen …`). Never run it through `npx`: the `style-gen` name is unclaimed on the public npm registry, so `npx` can fetch an unrelated package. With npm, use `npm exec --no -- style-gen` so it only resolves your local installation.

## Commands

### `style-gen init`

> **Changed in 5.2.0:** `init` no longer scaffolds `plugins/theme-plugin.ts`, no longer asks for a generator-script location and rejects `--plugin` (unknown option, exit code 1); it prints the bundler wiring below instead and stops writing `plugin` into `style-gen.config.json`. Since 6.0.0 a config that still has `plugin` is rejected like any unknown key (`doctor` stops with `plugin → Unrecognized key: "plugin"`), and `init` drops the key while merging. To migrate, add the printed snippet to your bundler config (or run `style-gen generate`), then delete the script and the `plugin` key.

Scaffold the theme JSON, its JSON Schema and `style-gen.config.json`, then print how to wire them into your stack. `init` never edits a bundler config.

The wizard asks for the theme file location and whether to include a dark-mode template. Non-interactive: `yarn style-gen init --dark`.
It writes the theme, its `theme.schema.json` (for the theme's `"$schema"`) and `style-gen.config.json`
(merging `theme` and `output` into an existing one and keeping its other keys, but dropping a `plugin` key, which 6.0 no longer accepts, and the `extraSources` and `axes` keys, which 7.0 no longer accepts).
For each dropped key it prints ``Removed the `<key>` key from style-gen.config.json: <major> no longer accepts it.`` (`6.0` or `7.0`), and for `extraSources` it also prints one `@source inline("<entry>");` line per entry to paste into the app's CSS.
If the theme or its schema already exists, it asks before overwriting (non-interactive: exits with code 1).

It then looks for a bundler config in the project root, in this order, and prints the snippet to add to it and the CSS lines (two `@import` lines, plus `@source not "<path>/.claude";` when the [agent rules](#agent-rules) file exists):

| Config file found | Printed wiring                                                                                                         | `@import` lines printed for                                      |
| :---------------- | :--------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------- |
| `nuxt.config.*`   | `styleGenVite({ root })` in `vite.plugins` with `root` set to the project folder, and `css: ["~/assets/css/main.css"]` | `app/assets/css/main.css` (`assets/css/main.css` without `app/`) |
| `next.config.*`   | `styleGenNext()(nextConfig)`                                                                                           | `app/globals.css` (`src/app/globals.css` when `src/app/` exists) |
| `vite.config.*`   | `styleGenVite()` before `tailwindcss()` in `plugins`                                                                   | `src/index.css` (`index.css` without `src/`)                     |
| none              | `yarn style-gen generate` (`--watch` while you edit the theme)                                                         | a CSS file next to the generated `theme.css`                     |

`*` is `.ts`, `.mts`, `.cts`, `.js`, `.mjs` or `.cjs`; only files directly in the project root count (symlinks are followed). A framework config wins over `vite.config.*` because Next.js and Nuxt apps often keep one for Vitest. `styleGenVite()` and `styleGenNext()` take no options except `root`, the folder that holds `style-gen.config.json` (default: the Vite root and `process.cwd()`), so the theme, the output, the tokens file and every generator option stay in that one file; a change to the config file is picked up by the running dev server. Nuxt 4 sets Vite's root to `app/`, so the Nuxt snippet passes `root` (the project folder) and the Nuxt theme defaults to `app/assets/css/theme.json`. After wiring, run `yarn style-gen generate` once and commit the generated `theme.tokens.ts`; keep `theme.css` ignored. Every printed or stored path is relative to the project root with `/` separators (an absolute `--theme` inside the root is stored relative), and paths inside printed string literals are JSON-escaped. The snippets use ES module syntax; a CommonJS config (`.cjs`, or `.js` without `"type": "module"`) loads the same functions with `require()`. A JavaScript `next.config.*` gets a JSDoc `@type` comment instead of `import type`.

```bash
yarn style-gen init            # Interactive mode
yarn style-gen init --dark     # Non-interactive, with a themeAxes.theme.dark template
```

| Flag           | Type      | Default             | Description                                |
| :------------- | :-------- | :------------------ | :----------------------------------------- |
| `--theme`      | `string`  | `styles/theme.json` | Path to the theme file                     |
| `--dark`       | `boolean` | `false`             | Include the dark-mode axis template        |
| `--skip-rules` | `boolean` | `false`             | Do not write the agent rules file          |
| `--rules-only` | `boolean` | `false`             | Only write or refresh the agent rules file |

The `--theme` default becomes `src/styles/theme.json` when a `src/` directory exists, and `app/assets/css/theme.json` (`assets/css/theme.json` without `app/`) when `nuxt.config.*` is found. The CSS is written next to the theme (`theme.css`).

#### Agent rules

`init` writes `.claude/rules/style-generator.md`, the [agent contract](../agent-contract.md) for the installed version (its first line names the version). Coding agents that read `.claude/rules/` follow it when they write the theme and components. The file holds example class literals, and Tailwind scans hidden directories, so the printed CSS lines end with `@source not "<path>/.claude";`.

| Rules file in the project                                     | What `init` does                                                                  |
| :------------------------------------------------------------ | :-------------------------------------------------------------------------------- |
| absent                                                        | writes it (`Created .claude/rules/style-generator.md`)                            |
| identical to this version's                                   | leaves it (`Rules up to date: …`)                                                 |
| stamped with another version                                  | replaces it, also without a terminal (`Updated … (7.0.0 → 7.1.0)`)                |
| same version but edited, or no version stamp, interactive     | asks before replacing it; a declined or cancelled prompt keeps it                 |
| same version but edited, or no version stamp, non-interactive | keeps it and says to run `style-gen init --rules-only` in an interactive terminal |

After upgrading, run `style-gen init --rules-only` to refresh the file: it leaves the theme, the schema and `style-gen.config.json` alone, never opens the wizard, prints the CSS lines with the `@source not` line (the CSS path comes from `output` in `style-gen.config.json` when present) and exits 0; it cannot be combined with `--theme`, `--dark` or `--skip-rules` (exit code 1). A plain `init` that keeps the existing theme at the overwrite prompt also updates the rules and prints the next steps again. `--skip-rules` writes no rules file. A build without the rules (a local `yarn build` that skipped the emit step) prints a warning and exits 0.

These are the snippets `init` prints for Next.js and Nuxt (the Vite one is in the [README](../../README.md#quickstart)).

#### Next.js

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
@source not "../.claude";
```

#### Nuxt

Nuxt 4 sets Vite's root to `app/`, so the theme goes to `app/assets/css/theme.json` and the plugin gets `root`, the project folder that holds `style-gen.config.json`. Put the generator options in that file.

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
      // Nuxt 4 sets Vite's root to app/: root is the folder with style-gen.config.json.
      styleGenVite({ root: fileURLToPath(new URL(".", import.meta.url)) }),
      tailwindcss(),
    ],
  },
});
```

Create `app/assets/css/main.css` (`init` does not create it; `css` in `nuxt.config.ts` loads it):

```css
@import "tailwindcss";
@import "./theme.css";
@source not "../../../.claude";
```

### `style-gen generate`

Validate the theme and write the complete CSS (`@theme`, `:root` variables, axis overrides, `@theme inline`, `@utility` blocks, `@source inline`) and the typed `theme.tokens.ts` module next to it. The tokens file is written next to `theme.css`; commit it, keep `theme.css` ignored.

```bash
yarn style-gen generate
yarn style-gen generate --theme ./theme.json --out ./theme.css --watch
```

| Flag            | Type      | Default             | Description                                                                                  |
| :-------------- | :-------- | :------------------ | :------------------------------------------------------------------------------------------- |
| `--theme`       | `string`  | `styles/theme.json` | Path to the theme JSON file                                                                  |
| `--out`         | `string`  | `styles/theme.css`  | Path to the output CSS file                                                                  |
| `-w`, `--watch` | `boolean` | `false`             | Watch mode — auto-regenerate on save                                                         |
| `--check`       | `boolean` | `false`             | Write nothing; exit 1 when `theme.tokens.ts` is missing or differs from the theme and config |

Positional `style-gen generate <theme> <out>` also works; flags take precedence. The file is written atomically and **only when its content changed** (a re-run on an unchanged theme does not touch the file, so file watchers stay quiet). `--theme` may point outside the project (a shared design-system package); `--out` and the config `output` must stay inside it (`output escapes project root: <path>`). An invalid theme (`Invalid theme (<path>):`), invalid options (`Invalid options:`) or theme × options pair (`Invalid theme/options:`), an invalid config file (`Invalid config (<file>):` followed by one `path → message` line per issue, for example `breakpoint` for a typo or `extraSources` for a key removed in 7.0) or a write error leaves the output untouched and exits with code 1. A malformed (not JSON) config file is warned about and the defaults are used.

`--watch` re-runs on every change of the theme **and of the config file** (`style-gen.config.json`, or the `package.json` it came from). The config is re-read on each change, so a new `output`, `breakpoints`, `resetTailwindDefaults` … apply without a restart; an invalid config edit is reported and the **last valid config stays in effect** until the file is fixed. A theme that cannot be read at startup (missing file, a directory) or an invalid config at startup exits with code 1 before any watcher starts; once watching, a theme or write error is logged and watching continues.

`--check` writes nothing and exits 1 when the tokens file is missing or differs from what the theme and config would generate (`<path> does not exist. Run: style-gen generate` / `<path> is out of date. Run: style-gen generate`); it exits 0 otherwise, even when `theme.css` does not exist, and it cannot be combined with `--watch` (exit code 1). The tokens file holds keys, not values: editing only a colour value leaves it current. Run it in CI to catch a theme edit that was committed without regenerating `theme.tokens.ts`.

### `style-gen schema`

Write the theme's JSON Schema (from `z.toJSONSchema(ThemeSchema)`) so editors can autocomplete keys and flag unknown ones when the theme declares `"$schema"`. Without `--out` it writes `theme.schema.json` next to the configured `theme` (default `styles/theme.json`), where `"$schema": "./theme.schema.json"` looks for it; the config file is then read as `generate` reads it, so a schema-invalid config exits with code 1 and writes nothing.

```bash
yarn style-gen schema                            # → styles/theme.schema.json (next to the theme)
yarn style-gen schema --out styles/theme.schema.json
```

### `style-gen doctor`

Check the setup: config file (a malformed `style-gen.config.json` or `package.json["style-gen"]` is an error — `generate` warns and uses the defaults — and so is a schema-invalid one: config keys and option values are validated with the same schema as `generate()`, so both commands give the same verdict, and `doctor` prints `Config (<file>) ❌ Invalid` followed by the issues; **a config error stops `doctor` there**, because every later check would run against the wrong defaults), JSON syntax, `ThemeSchema` validation (each issue printed as `path → message`), **the theme × options pair** (`❌ Invalid theme/options`: `resetTailwindDefaults: ["radius"]` without `borderRadius`, …), and the output file. A theme outside the project is fine; a configured `output` that escapes the project root is an error. It also prints warnings — never errors — for schema-valid keys that collide with a Tailwind utility (for example `none` in `colors`/`shadows`/`borderRadius`, digit-only `borderWidth` keys, `colors` keys whose `ring-`/`outline-`/`divide-` class is a Tailwind static (`inset` → `ring-inset`, `solid` → `outline-solid`, `xReverse` → `divide-x-reverse`) or an integer width/offset (`3` → `ring-3`, `offset2` → `ring-offset-2`), or typography keys such as `textSm`, `h1` → `h-1`, `italic`), and an **alias hint** for every `themeAxes` override whose literal value repeats the value of a different base key of the same category (`Override theme.dark.colors.surface repeats base value #fff → use alias "$white"`): an alias follows the primitive when the base palette changes, a repeated literal does not.

It also scans the source files under the current directory (`.css`, `.scss`, `.ts`, `.tsx`, `.vue`, `.svelte`, `.astro`, `.html`, …) and warns `file:line` about leftover pre-5.0 color variables; build folders, `node_modules`, the config `output` file and files over 1 MiB are skipped.

```bash
yarn style-gen doctor
```

### `style-gen tokens`

Write the theme's design-token **keys** (`DesignTokens.Web`: one array of camelCased keys per category, plus `opacities` (the `coverage.colors.opacities` steps, ascending; `[]` without the option), `breakpoints`, `screens` and `spacingProperties`) as a TypeScript module, so a client bundle can import the key lists without shipping the `./tokens` runtime or the theme JSON (about 2.4 kB gzip together, versus roughly 0.6 kB for the generated keys).

```bash
yarn style-gen tokens                                  # → styles/theme.tokens.ts (beside the configured output)
yarn style-gen tokens --theme styles/theme.json --out src/theme.tokens.ts
```

<!-- snippet: no-check imports the module `style-gen tokens` generates -->

```ts
import { tokens } from "./theme.tokens";
type ColorKey = (typeof tokens.colors)[number];
```

The module is `export const tokens = {…} as const` plus `export type Tokens = typeof tokens`, and `export const themeAxes = {…} as const` (each axis with its variant names, the raw keys of the theme) plus `export type ThemeAxesState`; it is built by the same code as `createDesignTokens()`, with the config's `breakpoints`/`screens`/`spacing`, so the two cannot drift. The theme and options are validated as in `generate`; the default output is the config's `tokensOutput`, else `theme.tokens.ts` beside `output`, and must stay inside the project. `generate` and the bundler plugins write the same file together with the CSS; run `tokens` to write it alone or with `--out`.

### `style-gen budget`

Fail CI when the built CSS grows past a gzip budget: it sums the gzip size (`node:zlib` defaults) of one `.css` file, or of every `.css` file under a directory (walked recursively, e.g. `.next/static/css` or `dist/assets`).

```bash
yarn style-gen budget .next/static/css --max-gzip 14925
```

On success it prints an `OK: …` summary line; over budget it prints `OVER BUDGET: …` and exits 1. Exit codes: `0` within budget, `1` over budget, `2` usage error, unreadable target or no CSS found. `--max-gzip` is required. It replaces the `check-css-budget.mjs` script that consumers used to copy.

### `style-gen --version`

Print the installed CLI version.

### Help and exit codes

`style-gen --help` lists the commands; `style-gen <command> --help` prints that command's options. Flags are parsed strictly: **an unknown flag is an error** (`--them` no longer silently falls back to the default theme), as is an unknown command. Every command exits `0` on success, `--help`, `--version` or a cancelled prompt, and `1` on failure (`budget` uses `2` for usage errors, see above).

## Configuration file

```json
{
  "theme": "styles/theme.json",
  "output": "styles/theme.css",
  "breakpoints": ["md", "lg"],
  "resetTailwindDefaults": ["colors"]
}
```

`breakpoints`, `screens`, `enableResponsive`, `spacing`, `typography`, `coverage` and `resetTailwindDefaults` are forwarded to `generate()`.
Any other key — a typo such as `breakpoint`, a legacy 3.x key such as `responsiveModules`, or a key removed in 7.0 (`extraSources`, `axes`; see the [migration guide](../migration/6.x-to-7.0.md)) — is rejected;
only `$schema`, `theme`, `output` and `tokensOutput` are accepted besides the forwarded keys.
`tokensOutput` is the path of the generated tokens module, relative to the project root and inside it (default: `theme.tokens.ts` beside `output`); it must name a `.ts`, `.mts` or `.cts` file, not a `.d.ts`.
`plugin`, which `init` wrote before 5.2.0 to name the generator script it scaffolded, has been rejected since 6.0.0 (delete it, or run `style-gen init`, which drops it);
`extraSources` and `axes` have been rejected since 7.0.0, and `style-gen init` drops them too (it prints each `extraSources` entry as an `@source inline("<entry>");` line to paste into the app's CSS).
`styleGenVite()` and `styleGenNext()` called **without an argument** read this same file (see [Vite](./vite.md) / [Next](./next.md)). The CLI resolves configuration in this order, per key:

1. command flags
2. `style-gen.config.json`
3. `package.json["style-gen"]`
4. built-in defaults

The two file sources are alternatives, not layers: the CLI reads `style-gen.config.json` when it exists and `package.json["style-gen"]` only when it does not, and never merges the two (a malformed `style-gen.config.json` is reported, not replaced by the `package.json` section). Flags override single keys of whichever file was read, and defaults fill the keys left unset.
