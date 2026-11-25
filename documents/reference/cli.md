# CLI

The `style-gen` command-line tool: `init`, `generate`, `schema`, `doctor`, `tokens` and `budget`.

> **Warning:** Install the package first and always run the CLI through your package manager (`yarn style-gen …`). Never run it through `npx`: the `style-gen` name is unclaimed on the public npm registry, so `npx` can fetch an unrelated package. With npm, use `npm exec --no -- style-gen` so it only resolves your local installation.

The commands the CLI prints in its hints (`Run: … style-gen init`, `💡 Fix it first: … style-gen doctor`) follow the project's package manager: the one that started the run (`npm_config_user_agent`), else the nearest lockfile up to the directory that holds `.git`, else npm. They read `yarn style-gen`, `pnpm exec style-gen`, `bun run style-gen` or `npm exec --no -- style-gen`.

## Commands

### `style-gen init`

Scaffold the theme JSON, its JSON Schema, `style-gen.config.json` and the config's JSON Schema, then print how to wire them into your stack. `init` never edits a bundler config.

The wizard asks for the theme file location and whether to include a dark-mode template. Without a terminal, or to skip the wizard: `yarn style-gen init --dark`, `--theme`, or `--yes`.
It writes the theme, its `theme.schema.json` (for the theme's `"$schema"`), `style-gen.config.json` and `style-gen.config.schema.json` (for the config's `"$schema"`). `init` adds that `$schema` as the first key of a config it writes or merges into, never to a config it keeps as it is.
A valid config that already names the theme `init` works on is left as it is, `output` included (`package.json#style-gen` is such a config too: no `style-gen.config.json` is created next to it). Otherwise (another theme chosen in the wizard or with `--theme`) `init` merges `theme` and `$schema` into the existing config, adds `output` only when the config has none, and keeps its other keys as they are, including a `$schema` and a custom `output` it already has; a `package.json#style-gen` section is then copied into a new `style-gen.config.json`.
If the theme or either schema file already exists, it asks before overwriting (non-interactive: `Files already exist. Run interactively to confirm overwrite.` and exit code 1; with `--yes`: keeps the files and exits 0). Declining the prompt keeps the files that exist and still writes what is missing, the config included, so `generate` works afterwards (`Existing files kept; writing only what is missing.`). An existing config is never rewritten under `--yes`: see [`init --yes`](#init---yes).

A config that `generate` rejects (a 7.x config that still has `extraSources`, say) still declares its `theme` and `output`, and `init` keeps them instead of redirecting the project to the stack's default: the wizard offers the declared theme, a run without the wizard works on it (a theme that does not exist yet is scaffolded at that path, and the config stays byte for byte as it was), and `--rules-only` prints the declared `output`. A config without a `theme` key means `styles/theme.json`, as `generate` reads it. When `init` leaves such a config as it is, it says so: `<file> is invalid and init left it as it is; generate rejects it:`, the issues and `💡 Fix it: … style-gen doctor`. When `--theme` or the wizard names another theme, `init` merges only that `theme` into it, keeps every other key, and warns `style-gen.config.json is invalid and init only merged the theme into it; generate rejects it:`. Declining the overwrite prompt on an invalid config writes nothing except the agent rules. Without a terminal, a config that declares a theme that exists exits 1 with `Files already exist`, the same as a valid config does.

When the `theme` key is present but is not a non-empty string, or the `package.json#style-gen` section is not a JSON object, the declared theme cannot be read. Without a terminal and without `--theme`, `init` then exits 1 with `<file> is invalid and its "theme" cannot be read:`, the issues and `💡 Fix it first: … style-gen doctor, or pass --theme <path>`; `--theme` or a wizard answer names the theme instead. A `style-gen.config.json` that is not valid JSON stops `init` with exit code 1 before it writes anything, also under `--yes`: `<file> is not valid JSON (<parser message>).` and `💡 Fix it, or delete it and run init again.`

`init` refuses a theme path that names a file it writes or merges into: either schema file, `style-gen.config.json` or `package.json`, however the path is spelled (another case on a case-insensitive volume, a symlink, a `./` prefix). It exits 1 with `init writes or merges into <path>: the theme would overwrite it.` and `💡 Pass another --theme <path>`, and writes nothing.

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
yarn style-gen init --dark     # Without the wizard, with a themeAxes.theme.dark template
yarn style-gen init --yes      # Defaults for every prompt, never overwrites (scripts, CI, coding agents)
```

| Flag           | Type      | Default             | Description                                                               |
| :------------- | :-------- | :------------------ | :------------------------------------------------------------------------ |
| `--theme`      | `string`  | `styles/theme.json` | Path to the theme file                                                    |
| `--dark`       | `boolean` | `false`             | Include the dark-mode axis template                                       |
| `--skip-rules` | `boolean` | `false`             | Do not write the agent rules file                                         |
| `--rules-only` | `boolean` | `false`             | Only write or refresh the agent rules file                                |
| `-y`, `--yes`  | `boolean` | `false`             | Answer every prompt with its default and never overwrite an existing file |

Exit codes: `0` ok, a kept existing file (`--yes`) or a cancelled prompt; `1` failure, including an existing file without a terminal and without `--yes` (also when the config declares a theme that exists), a config that is not valid JSON, an invalid config whose theme cannot be read, a theme path `init` would overwrite, and the two cases under `--yes` below.

#### `init --yes`

`--yes` never opens the wizard or asks a question, also in a terminal: it uses `--theme` and `--dark` when given and the stack's defaults otherwise. When the theme or one of the two schema files already exists it keeps everything, prints `Existing files kept (--yes never overwrites).`, still refreshes the agent rules (an edited rules file is kept, as in any non-interactive run) and exits 0, where a run without a terminal and without `--yes` exits 1.

An existing `style-gen.config.json` (or `package.json#style-gen`) is kept as it is, and the theme it names is the theme `init` works on; only files that are missing are written. Two cases stop with exit code 1 instead of guessing:

- the config is invalid (including keys removed in an earlier major, such as `extraSources`, `axes` and `plugin`): `<file> is invalid, so --yes cannot tell where its theme lives:`, the issues and `💡 Fix it first: … style-gen doctor`. Remove the keys, or refresh only the rules with `style-gen init --rules-only`;
- `--theme` names another theme than the config: `--theme <path> differs from the theme of <file> (<path>); --yes never redirects an existing config.` and `💡 Drop --theme, or run init without --yes to change it`.

When the config's theme lies outside the project root (a shared theme), `init` prints `The theme of <file> (<path>) is outside the project root: init writes no theme or theme schema for it.`, writes the config schema and the rules, and exits 0.

The `--theme` default becomes `src/styles/theme.json` when a `src/` directory exists, and `app/assets/css/theme.json` (`assets/css/theme.json` without `app/`) when `nuxt.config.*` is found. The exception is a project without a config that already has a theme at `styles/theme.json`, the place `generate` reads when no config exists: that theme stays the default (the wizard offers it, `--yes` uses it), so `init` never creates a second theme beside it. The CSS is written next to the theme (`theme.css`).

#### Agent rules

`init` writes `.claude/rules/style-generator.md`, the [agent contract](../agent-contract.md) for the installed version (its first line names the version). Coding agents that read `.claude/rules/` follow it when they write the theme and components. The file holds example class literals, and Tailwind scans hidden directories, so the printed CSS lines end with `@source not "<path>/.claude";`.

| Rules file in the project                                     | What `init` does                                                                  |
| :------------------------------------------------------------ | :-------------------------------------------------------------------------------- |
| absent                                                        | writes it (`Created .claude/rules/style-generator.md`)                            |
| identical to this version's                                   | leaves it (`Rules up to date: …`)                                                 |
| stamped with another version                                  | replaces it, also without a terminal (`Updated … (7.0.0 → 7.1.0)`)                |
| same version but edited, or no version stamp, interactive     | asks before replacing it; a declined or cancelled prompt keeps it                 |
| same version but edited, or no version stamp, non-interactive | keeps it and says to run `style-gen init --rules-only` in an interactive terminal |

After upgrading, run `style-gen init --rules-only` to refresh the file: it leaves the theme, the schema and `style-gen.config.json` alone, never opens the wizard, prints the CSS lines with the `@source not` line and exits 0. The CSS path is the `output` of the config (`package.json#style-gen` included, and also when the config is invalid) and `styles/theme.css` when the config names none. Without a config (no `style-gen.config.json`, no `package.json#style-gen`) there is no generated CSS to point at: it prints no CSS lines, says `No style-gen.config.json in this directory` and points to `style-gen init`, which prints them. It cannot be combined with `--theme`, `--dark` or `--skip-rules` (exit code 1). A plain `init` that keeps the existing theme at the overwrite prompt also updates the rules and prints the next steps again. `--skip-rules` writes no rules file. A build without the rules (a local `yarn build` that skipped the emit step) prints a warning and exits 0.

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

| Flag            | Type      | Default                                           | Description                                                                                  |
| :-------------- | :-------- | :------------------------------------------------ | :------------------------------------------------------------------------------------------- |
| `--theme`       | `string`  | `theme` from the config, else `styles/theme.json` | Path to the theme JSON file                                                                  |
| `--out`         | `string`  | `output` from the config, else `styles/theme.css` | Path to the output CSS file                                                                  |
| `-w`, `--watch` | `boolean` | `false`                                           | Watch mode — auto-regenerate on save                                                         |
| `--check`       | `boolean` | `false`                                           | Write nothing; exit 1 when `theme.tokens.ts` is missing or differs from the theme and config |

Exit codes: `0` ok (also for `--help`), `1` failure (invalid theme, options or config, a write error, `--check` finding the tokens file missing or different).

Positional `style-gen generate <theme> <out>` also works; flags take precedence. The file is written atomically and **only when its content changed** (a re-run on an unchanged theme does not touch the file, so file watchers stay quiet). `--theme` may point outside the project (a shared design-system package); `--out` and the config `output` must stay inside it (`output escapes project root: <path>`). The tokens file goes to the config's `tokensOutput`, else `theme.tokens.ts` beside the CSS; it must be a `.ts`, `.mts` or `.cts` file (`tokensOutput must be a .ts, .mts or .cts file (not a .d.ts declaration): the output is TypeScript, got <path>`), and the theme, the CSS and the tokens module must be different files, none of them `style-gen.config.json` or `package.json` (`<a> and <b> must be different files, both resolve to <path>`; one file reached through another case, a symlink or a hard link counts as one file: see [must be different files](../troubleshooting.md#must-be-different-files)). An invalid theme (`Invalid theme (<path>):`), invalid options (`Invalid options:`) or theme × options pair (`Invalid theme/options:`), an invalid config file (`Invalid config (<file>):` followed by one `path → message` line per issue, for example `breakpoint` for a typo) or a write error leaves the output untouched and exits with code 1. A malformed (not JSON) config file is warned about (`Ignoring <file> is not valid JSON (<reason>); using defaults`) and the defaults are used, except under `--check`. When no config exists at all, `generate` says so (`No style-gen.config.json or package.json#style-gen found in <directory>; using the defaults.`) before it suggests `init` for a missing theme. See [Troubleshooting](../troubleshooting.md) for each message.

`--watch` re-runs on every change of the theme **and of the config file**. Both candidates are watched, `style-gen.config.json` and `package.json#style-gen`, so creating the first one or moving the config between them is picked up; while `style-gen.config.json` exists, events of `package.json` are ignored. A config or theme file that is removed and recreated (`git checkout`, `git stash`) is watched again: its re-creation and the edits after it re-emit, also when it is back within a few milliseconds. The config is re-read on each change, so a new `output`, `breakpoints`, `resetTailwindDefaults` … apply without a restart; an invalid config edit is reported (`Invalid config (<file>):` or `Cannot reload config: <reason>`) and the **last valid config stays in effect** until the file is fixed. A theme that cannot be read at startup (missing file, a directory) or an invalid config at startup exits with code 1 before any watcher starts; once watching, a theme or write error is logged and watching continues.

`--check` writes nothing and exits 1 when the tokens file is missing or differs from what the theme and config would generate (`<path> does not exist. Run: … style-gen generate` / `<path> is out of date. Run: … style-gen generate`); it exits 0 otherwise, even when `theme.css` does not exist, and it cannot be combined with `--watch` (exit code 1). The tokens file holds keys, not values: editing only a colour value leaves it current. Line endings are not compared (CRLF equals LF). A config that is not valid JSON fails the check (`--check needs a readable config: <reason>`, exit code 1) instead of falling back to the defaults, because a check against defaults nobody configured would vouch for the wrong file. Run it in CI to catch a theme edit that was committed without regenerating `theme.tokens.ts`.

### `style-gen schema`

Write the JSON Schemas of the theme (from `z.toJSONSchema(ThemeSchema)`) and of `style-gen.config.json` so editors can autocomplete keys and flag unknown ones when the file declares `"$schema"`. Without `--out` the theme's schema goes to `theme.schema.json` next to the configured `theme` (default `styles/theme.json`), where `"$schema": "./theme.schema.json"` looks for it; the config file is then read as `generate` reads it. The config's schema goes to `style-gen.config.schema.json` in the project root unless `--config-out` names another file, and it is written on every successful path, even when the config has issues: a schema-invalid config is the moment an upgrader needs it. Without `--out`, `schema` then reports the issues (`Invalid config (<file>):`), writes no theme schema (the config decides where it would go) and exits 1. A valid `style-gen.config.json` without `"$schema"` gets one `"$schema"` line (the config schema's path, relative and `./`-prefixed) right after its opening `{`, and nothing else in the file changes (line endings and indent are kept; the file is written in place, through a symlink); `Added "$schema" to style-gen.config.json` says so. An invalid or malformed one is left as it is and `schema` prints the line to add, with or without `--out`; a `"$schema"` the file already has and `package.json#style-gen` are never edited. With `--out`, the config is consulted only for the theme file it must not overwrite, and a config with issues is not reported: both schemas are written and the exit code is 0. A config that is not valid JSON is warned about (`Ignoring <file> is not valid JSON (<reason>); using defaults`), with or without `--out`, and read as the defaults.

| Flag           | Type     | Default                                            | Description                                                     |
| :------------- | :------- | :------------------------------------------------- | :-------------------------------------------------------------- |
| `--out`        | `string` | `theme.schema.json` next to the theme              | File for the theme's JSON Schema; must stay inside the project  |
| `--config-out` | `string` | `style-gen.config.schema.json` in the project root | File for the config's JSON Schema; must stay inside the project |

Exit codes: `0` ok (also for a config with issues when `--out` is given), `1` failure (without `--out`, also a config with issues).

Both paths are checked before anything is written (`--config-out escapes project root: <path>`, exit code 1). `schema` never overwrites the theme or the config (its only change to the config is the one `"$schema"` line above). It protects the theme (the `theme` of a valid config, else the one an invalid config declares, else `styles/theme.json`), `style-gen.config.json` and `package.json` (both, whether or not they exist), and the two schema targets must differ from each other. A target that names one of them exits with code 1 and writes nothing, for `--config-out` as for `--out`: `--out and --config-out name the same file: <path>`, `--out would overwrite the theme file: <path>`, `--config-out would overwrite the theme file: <path>`, `--out would overwrite the config file: <path>` and `--config-out would overwrite the config file: <path>`. One file reached through another case or a symlink counts as one file ([must be different files](../troubleshooting.md#must-be-different-files)). The JSON Schema of the config carries the key and value rules its generator maps into it, not the cross-field checks listed under [Configuration file](#configuration-file) ([JSON Schema limits](./options.md#json-schema-limits)). Run `style-gen schema` after upgrading the package: neither `generate` nor `init` rewrites a committed schema, so it keeps the keys of the version that wrote it.

```bash
yarn style-gen schema                            # → styles/theme.schema.json (next to the theme) and style-gen.config.schema.json
yarn style-gen schema --out styles/theme.schema.json --config-out style-gen.config.schema.json
```

### `style-gen doctor`

Check the setup: config file (a malformed `style-gen.config.json` or `package.json["style-gen"]` is an error — `generate` warns and uses the defaults — and so is a schema-invalid one: config keys and option values are validated with the same schema as `generate()`, so both commands give the same verdict. `doctor` prints `Config (<file>) ❌ Ignored` for a malformed file and `Config (<file>) ❌ Invalid` followed by the issues for a schema-invalid one; **a config error stops `doctor` there**, because every later check would run against the wrong defaults), JSON syntax, `ThemeSchema` validation (each issue printed as `path → message`), **the theme × options pair** (`❌ Invalid theme/options`: `resetTailwindDefaults: ["radius"]` without `borderRadius`, …), the emit paths (`Output (<output>) ❌ Invalid emit paths` followed by the message `generate` would stop with: `output` or `tokensOutput` outside the project root, a `tokensOutput` that is not a `.ts`, `.mts` or `.cts` file, two of theme, output and tokens module sharing one file, or one of them being `style-gen.config.json` or `package.json`), and the output file. A theme outside the project is fine. It also prints warnings — never errors — for schema-valid keys that collide with a Tailwind utility (for example `none` in `colors`/`shadows`/`borderRadius`, digit-only `borderWidth` keys, `colors` keys whose `ring-`/`outline-`/`divide-` class is a Tailwind static (`inset` → `ring-inset`, `solid` → `outline-solid`, `xReverse` → `divide-x-reverse`) or an integer width/offset (`3` → `ring-3`, `offset2` → `ring-offset-2`), or typography keys such as `textSm`, `h1` → `h-1`, `italic`), and an **alias hint** for every `themeAxes` override whose literal value repeats the value of a different base key of the same category (`Override theme.dark.colors.surface repeats base value #fff → use alias "$white"`): an alias follows the primitive when the base palette changes, a repeated literal does not.

```bash
yarn style-gen doctor
```

Exit codes: `0` ok, `1` on any error (warnings keep `0`). `doctor` takes no flags.

### `style-gen tokens`

Write the theme's design-token **keys** (`DesignTokens.Web`: one array of camelCased keys per category, plus `opacities` (the `coverage.colors.opacities` steps, ascending; `[]` without the option), `breakpoints`, `screens` and `spacingProperties`) as a TypeScript module, so a client bundle can import the key lists without shipping the `./tokens` runtime or the theme JSON (about 2.4 kB gzip together, versus roughly 0.6 kB for the generated keys).

```bash
yarn style-gen tokens                                  # → styles/theme.tokens.ts (beside the configured output)
yarn style-gen tokens --theme styles/theme.json --out src/theme.tokens.ts
```

| Flag      | Type     | Default                                                               | Description                                                                          |
| :-------- | :------- | :-------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| `--theme` | `string` | `theme` from `style-gen.config.json`, else `styles/theme.json`        | Path to the theme JSON file                                                          |
| `--out`   | `string` | `tokensOutput` from the config, else `theme.tokens.ts` beside the CSS | File to write (`.ts`, `.mts` or `.cts`, not a `.d.ts`); must stay inside the project |

Exit codes: `0` ok, `1` failure.

<!-- snippet: no-check imports the module `style-gen tokens` generates -->

```ts
import { tokens } from "./theme.tokens";
type ColorKey = (typeof tokens.colors)[number];
```

The module is `export const tokens = {…} as const` plus `export type Tokens = typeof tokens`, and `export const themeAxes = {…} as const` (each axis with its variant names, the raw keys of the theme) plus `export type ThemeAxesState`; it is built by the same code as `createDesignTokens()`, with the config's `breakpoints`/`screens`/`spacing`, so the two cannot drift. The theme and options are validated as in `generate`; the default output is the config's `tokensOutput`, else `theme.tokens.ts` beside `output`, and must stay inside the project. `generate` and the bundler plugins write the same file together with the CSS; run `tokens` to write it alone or with `--out`.

### `style-gen budget`

Fail CI when the built CSS grows past a gzip budget: it sums the gzip size (`node:zlib` defaults) of one `.css` file, or of every `.css` file under a directory (walked recursively, e.g. `.next/static/css` or `dist/assets`). With `--coverage-cost` it also lists which theme class groups cost the most.

```bash
yarn style-gen budget .next/static/css --max-gzip 14925 --coverage-cost
```

| Flag                 | Type      | Default  | Description                                                                                                   |
| :------------------- | :-------- | :------- | :------------------------------------------------------------------------------------------------------------ |
| `--max-gzip <bytes>` | `number`  | required | Budget in bytes; the command exits 1 when the summed gzip size is larger than this                            |
| `--coverage-cost`    | `boolean` | off      | After the summary, list the theme class groups by gzip cost, each with the `coverage` setting that removes it |
| `--theme <path>`     | `string`  | config   | Theme for `--coverage-cost`; default: the config's theme. Without `--coverage-cost` it is a usage error       |

On success it prints an `OK: …` summary line; over budget it prints `OVER BUDGET: …` and exits 1. Exit codes: `0` within budget, `1` over budget, `2` usage error, unreadable target or no CSS found, or (with `--coverage-cost`) a config or theme it cannot read.

`--coverage-cost` prints the summary line first and unchanged, then up to ten lines, largest first:

```text
Coverage cost (upper bound):
  colors/divide           1062 B gzip  (120 rules)  coverage.colors.prefixes: ["bg","text","border","ring","outline","placeholder"]
```

Each line is a group (`<category>/<class prefix>`): the gzip bytes saved when its rules are removed from the CSS, the rule count, and the `coverage` setting that stops `@source inline` from emitting it. The figure is an upper bound: classes your own source uses stay in the CSS after the cut. When a `coverage.colors.opacities` group lists the prefix in its own `prefixes`, the setting ends with `(opacity group <i> still adds it)`, `<i>` being the zero-based index of the group in `opacities` (plain steps count too): shrinking the rule's `prefixes` alone does not remove that group's classes. The cost lines are informational, not a contract; only the summary line is.

### `style-gen canvas`

Check a design canvas (a folder of `*.dc.html` artboards, their stylesheets and `canvas.json`) against ONE theme and the design-canvas standard ([`documents/standards/design-canvas.md`](../standards/design-canvas.md)). The only subcommand is `check`.

```bash
yarn style-gen canvas check --canvas design/canvas --theme styles/theme.json --naming --boards
yarn style-gen canvas check --inventory --canvas design/canvas
```

| Flag                             | Type      | Default  | Description                                                                                                           |
| :------------------------------- | :-------- | :------- | :-------------------------------------------------------------------------------------------------------------------- |
| `--canvas <dir>`                 | `string`  | required | Canvas directory; every `*.dc.html` and `*.css` under it is checked                                                   |
| `--theme <file>`                 | `string`  | required | Theme JSON the canvas reads its tokens from; not needed with `--inventory`                                            |
| `--stamp <file>`                 | `string`  | none     | `ds-stamp.json`: the design system was built from these theme bytes; with `--boards`, the provenance block matches it |
| `--intents <a,b,c>`              | `string`  | none     | The allowed `color` values of every `*.Button`                                                                        |
| `--naming`                       | `boolean` | off      | Theme naming convention, no inline `font-weight`, no hand-written radius, line height or font family                  |
| `--boards`                       | `boolean` | off      | `canvas.json` pages and boards, core-board content, component pages, frames; an empty canvas is a violation           |
| `--ds-version <namespace>=<ver>` | `string`  | none     | `canvas.json` installs this design-system version; with `--boards`, the provenance block names it                     |
| `--standard <file>`              | `string`  | bundled  | A manifest that replaces the bundled one (same shape; an invalid file is an input error)                              |
| `--inventory`                    | `boolean` | off      | Print what the canvas uses (variables, font sizes and weights, intents) as JSON instead of checking                   |

Paths are resolved against the current directory; violation lines name the canvas files relative to `--canvas`, and the theme and stamp as given. Input errors name the canvas, theme and stamp as given too. Boards are top-level files of `--canvas`: a `.dc.html` in a subfolder gets the token rules but not the board rules.

Output: one `<file>:<line> <message>` line per violation, then `<n> violation(s)`; or `OK: <n> files` when there is none. An empty canvas under `--boards` is the violation `canvas.json:1 no .dc.html files under <dir>`. Line breaks and other control characters copied into a line (board text, a `canvas.json` name, a path) are escaped as `\uXXXX`, so each violation stays one line. The contract is that line format, the two summary lines and the exit codes; the wording of a message is not, and may change in a minor release. A minor release may add manifest keys only as optional keys, so a `--standard` file keeps working. Exit codes: `0` no violation (or `--inventory`), `1` violations, `2` a usage error (unknown flag, a subcommand other than `check`, a missing or empty `--canvas` or `--theme`, a malformed `--ds-version`), an input that cannot be read or parsed (canvas directory, theme, stamp, an unparsable `canvas.json`; the message names the file and the reason, e.g. `theme.json: cannot read (ENOENT)`; a missing `canvas.json` under `--boards` or `--ds-version` is the violation `canvas.json:1 missing canvas.json`, exit `1`), or an invalid `--standard` (the message names the key, e.g. `standard.json: dsComponents …`).

The default manifest is bundled into the CLI; a copy ships at `node_modules/@duydpdev/style-generator/dist/canvas/design-canvas-standard.json` to start a `--standard` file from. In this repository, `node scripts/check-design-canvas.mjs` is a deprecated wrapper that forwards to `style-gen canvas check`.

### `style-gen --version`

Print the installed CLI version.

### Help and exit codes

`style-gen --help` lists the commands; `style-gen <command> --help` prints that command's options. Flags are parsed strictly: **an unknown flag is an error** (`--them` is rejected instead of silently using the default theme), as is an unknown command. Every command exits `0` on success, `--help`, `--version` or a cancelled prompt, and `1` on failure (`budget` and `canvas` use `2` for usage errors, see above).

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
Any other key (a typo such as `breakpoint`) is rejected with its name; `style-gen schema` writes the file's JSON Schema.
Only `$schema`, `theme`, `output` and `tokensOutput` are accepted besides the forwarded keys.
`$schema` is the editor's pointer to the config's JSON Schema, not a setting: add `"$schema": "./style-gen.config.schema.json"` as the first key (`init` writes it into a config it creates, and `style-gen schema` inserts it into a valid `style-gen.config.json` that has none) and the editor suggests keys and flags unknown ones; the key is accepted in the file, dropped on read and never reaches `generate()`.
The JSON Schema states key and value shapes and, per `coverage` category, its own `prefixes`, `keys` and distinct `opacities`. It does not carry the checks that compare values with each other or read other files, nor the path rules, so an editor can accept a config that `generate` and `doctor` reject: see [JSON Schema limits](./options.md#json-schema-limits).
`tokensOutput` is the path of the generated tokens module, relative to the project root and inside it (default: `theme.tokens.ts` beside `output`); it must name a `.ts`, `.mts` or `.cts` file, not a `.d.ts`.
Classes built at runtime are declared with your own `@source inline(...)` next to the generated import (see [Options](./options.md#classes-built-at-runtime)).
`styleGenVite()` and `styleGenNext()` called **without an argument** read this same file (see [Vite](./vite.md) / [Next](./next.md)). The CLI resolves configuration in this order, per key:

1. command flags
2. `style-gen.config.json`
3. `package.json["style-gen"]`
4. built-in defaults

The two file sources are alternatives, not layers: the CLI reads `style-gen.config.json` when it exists and `package.json["style-gen"]` only when it does not, and never merges the two (a malformed `style-gen.config.json` is reported, not replaced by the `package.json` section). Flags override single keys of whichever file was read, and defaults fill the keys left unset.
