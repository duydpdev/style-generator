# CLI

The `style-gen` command-line tool: `init`, `generate`, `schema`, `doctor`, `tokens` and `budget`.

> **Warning:** Install the package first and always run the CLI through your package manager (`yarn style-gen …`). Never run it through `npx`: the `style-gen` name is unclaimed on the public npm registry, so `npx` can fetch an unrelated package. With npm, use `npm exec --no -- style-gen` so it only resolves your local installation.

## Commands

### `style-gen init`

Scaffold the theme JSON, its JSON Schema, a generator script and `style-gen.config.json`.

The wizard asks for the theme file location (default `styles/theme.json`), the location of the generator script (default `plugins/theme-plugin.ts`) and whether to include a dark-mode template. Non-interactive: `yarn style-gen init --dark`. It writes the theme, its `theme.schema.json` (for the theme's `"$schema"`), a small script that calls `generate()`, and `style-gen.config.json` (merging `theme`, `plugin` and `output` into an existing one and keeping its other keys). If the theme, its schema or the script already exists, it asks before overwriting (non-interactive: exits with code 1). The script and `style-gen generate` write the same file, `theme.css` next to the theme; run either one (`node plugins/theme-plugin.ts` needs Node >= 22.18, which strips the types). Type-checking the script needs `"module": "esnext"`, `"nodenext"` or `"preserve"` with `resolveJsonModule`, because it imports the theme `with { type: "json" }`.

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

### `style-gen generate`

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

### `style-gen schema`

Write the theme's JSON Schema (from `z.toJSONSchema(ThemeSchema)`) so editors can autocomplete keys and flag unknown ones when the theme declares `"$schema"`. Without `--out` it writes `theme.schema.json` next to the configured `theme` (default `styles/theme.json`), where `"$schema": "./theme.schema.json"` looks for it; the config file is then read as `generate` reads it, so a schema-invalid config exits with code 1 and writes nothing.

```bash
yarn style-gen schema                            # → styles/theme.schema.json (next to the theme)
yarn style-gen schema --out styles/theme.schema.json
```

### `style-gen doctor`

Check the setup: config file (a malformed `style-gen.config.json` or `package.json["style-gen"]` is an error — `generate` warns and uses the defaults — and so is a schema-invalid one: config keys and option values are validated with the same schema as `generate()`, so both commands give the same verdict, and `doctor` prints `Config (<file>) ❌ Invalid` followed by the issues; **a config error stops `doctor` there**, because every later check would run against the wrong defaults), JSON syntax, `ThemeSchema` validation (each issue printed as `path → message`), **the theme × options pair** (`❌ Invalid theme/options`: a stale `$`-alias holder under `axes.scope: "element"`, two axes sharing an attribute, `resetTailwindDefaults: ["radius"]` without `borderRadius`, …), the generator script when `plugin` is configured, and the output file. A theme outside the project is fine; a configured `output` (or `plugin`) that escapes the project root is an error. A `styleGenVite`/`styleGenNext` or CLI-only setup needs no `plugin` entry. It also prints warnings — never errors — for schema-valid keys that collide with a Tailwind utility (for example `none` in `colors`/`shadows`/`borderRadius`, digit-only `borderWidth` keys, or typography keys such as `textSm`, `h1` → `h-1`, `italic`), and an **alias hint** for every `themeAxes` override whose literal value repeats the value of a different base key of the same category (`Override theme.dark.colors.surface repeats base value #fff → use alias "$white"`): an alias follows the primitive when the base palette changes, a repeated literal does not.

It also scans the source files under the current directory (`.css`, `.scss`, `.ts`, `.tsx`, `.vue`, `.svelte`, `.astro`, `.html`, …) and warns `file:line` about leftover pre-5.0 color variables; build folders, `node_modules`, the config `output` file and files over 1 MiB are skipped.

```bash
yarn style-gen doctor
```

### `style-gen tokens`

Write the theme's design-token **keys** (`DesignTokens.Web`: one array of camelCased keys per category, plus `breakpoints`, `screens` and `spacingProperties`) as a TypeScript module, so a client bundle can import the key lists without shipping the `./tokens` runtime or the theme JSON (about 2.4 kB gzip together, versus roughly 0.6 kB for the generated keys).

```bash
yarn style-gen tokens                                  # → styles/theme.tokens.ts (next to the theme)
yarn style-gen tokens --theme styles/theme.json --out src/theme.tokens.ts
```

<!-- snippet: no-check imports the module `style-gen tokens` generates -->

```ts
import { tokens } from "./theme.tokens";
type ColorKey = (typeof tokens.colors)[number];
```

The module is `export const tokens = {…} as const` plus `export type Tokens = typeof tokens`; it is built by the same code as `createDesignTokens()`, with the config's `breakpoints`/`screens`/`spacing`, so the two cannot drift. The theme and options are validated as in `generate`; the default output is next to the theme and must stay inside the project, so a theme outside it needs `--out`. Re-run it (or put it next to `generate` in your script) when the theme's keys change.

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
  "plugin": "plugins/theme-plugin.ts",
  "breakpoints": ["md", "lg"],
  "extraSources": ["hover:bg-{primary,secondary}"]
}
```

`breakpoints`, `screens`, `enableResponsive`, `spacing`, `typography`, `extraSources`, `coverage`, `axes` and `resetTailwindDefaults` are forwarded to `generate()`. Any other key — a typo such as `breakpoint`, or a legacy 3.x key such as `responsiveModules` — is rejected; only `$schema`, `theme`, `output` and `plugin` are accepted besides the forwarded keys. `plugin` is optional: it names the script `init` scaffolded, and only `doctor` reads it. `styleGenVite()` and `styleGenNext()` called **without an argument** read this same file (see [Vite](./vite.md) / [Next](./next.md)). The CLI resolves configuration in this order, per key:

1. command flags
2. `style-gen.config.json`
3. `package.json["style-gen"]`
4. built-in defaults

The two file sources are alternatives, not layers: the CLI reads `style-gen.config.json` when it exists and `package.json["style-gen"]` only when it does not, and never merges the two (a malformed `style-gen.config.json` is reported, not replaced by the `package.json` section). Flags override single keys of whichever file was read, and defaults fill the keys left unset.
