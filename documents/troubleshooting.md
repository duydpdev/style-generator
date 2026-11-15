# Troubleshooting

Find the start of the message the CLI, `styleGenVite()` or `styleGenNext()` printed, then read the section with the same title. The bundler plugins prefix every message with `[style-gen-vite]` or `[style-gen-next]`; the text after the prefix is the same as the CLI's. Validation messages list one `path → message` line per problem. `yarn style-gen doctor` ([CLI](./reference/cli.md#style-gen-doctor)) checks the config, the theme and the generated CSS in one run.

| Message starts with                                             | Read                                                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `Invalid theme (`                                               | [Invalid theme](#invalid-theme-)                                                    |
| `Invalid options`                                               | [Invalid options](#invalid-options)                                                 |
| `Invalid theme/options`                                         | [Invalid theme/options](#invalid-themeoptions)                                      |
| `Invalid config (`                                              | [Invalid config](#invalid-config-)                                                  |
| `Ignoring … ; using defaults`                                   | [Ignoring a malformed config](#ignoring-a-malformed-config)                         |
| `--check needs a readable config`                               | [--check needs a readable config](#--check-needs-a-readable-config)                 |
| `… → Unrecognized key`                                          | [Unrecognized key](#unrecognized-key)                                               |
| `Invalid JSON in`, `Theme file not found`                       | [Invalid JSON and missing theme](#invalid-json-in-and-theme-file-not-found)         |
| `No style-gen.config.json or package.json#style-gen found`      | [No config found](#no-config-found)                                                 |
| `… escapes project root`                                        | [escapes project root](#escapes-project-root)                                       |
| `… must be a .ts, .mts or .cts file`                            | [must be a .ts, .mts or .cts file](#must-be-a-ts-mts-or-cts-file)                   |
| `… must be different files`, `Output (…) ❌ Invalid emit paths` | [must be different files](#must-be-different-files)                                 |
| `Cannot write`                                                  | [Cannot write](#cannot-write)                                                       |
| `Cannot read`                                                   | [Cannot read](#cannot-read)                                                         |
| `… does not exist. Run: style-gen generate`, `… is out of date` | [Tokens file missing or stale](#tokens-file-missing-or-stale)                       |
| `Cannot reload config`, `Re-emit failed`                        | [Cannot reload config and Re-emit failed](#cannot-reload-config-and-re-emit-failed) |
| `Only { root } is accepted`                                     | [Only { root } is accepted](#only--root--is-accepted)                               |
| `--check and --watch cannot be combined`                        | [--check and --watch cannot be combined](#--check-and---watch-cannot-be-combined)   |
| `… is invalid, so --yes cannot tell`, `--theme … differs from`  | [init stops with exit code 1](#init-stops-with-exit-code-1)                         |
| `--out and --config-out`, `… would overwrite the theme file`    | [schema refuses two files at one path](#schema-refuses-two-files-at-one-path)       |

## Invalid theme (

`Invalid theme (src/theme/theme.json):` is followed by one line per problem, for example `colors.primary_active → …`. The path names the key; fix that key in the theme JSON and run the command again. The usual causes:

- A name contains `_`, or starts with two or more capitals (`CTA`): use camelCase or kebab-case ([Key rules](./reference/theme.md#key-rules)).
- A `$alias` points at a key that is not in the same category, or aliases form a cycle ([Aliases](./reference/theme.md#aliases-key)).
- An override in `themeAxes` names a key that the base category does not have: override keys must already exist in the base.
- Two keys become the same class once kebab-cased (`blue500` and `blue-500`).
- A value is unsafe or unbalanced (an unmatched `(` or `[`).

The output file is left untouched while the theme is invalid.

## Invalid options

`Invalid options:` lists generator options with a wrong value, one `path → message` line each (`breakpoints.0 → …`, `coverage.colors.prefixes → …`). The same rules apply to the keys of `style-gen.config.json` ([Options](./reference/options.md)). A `breakpoints` entry must name a screen, and `screens` values must be one `px`/`rem`/`em` length with one unit across the map.

## Invalid theme/options

The theme and the options are valid alone but not together. The line names the option: `resetTailwindDefaults.0 → …` means the theme has no replacement for the namespace it clears (`"colors"` needs a non-empty `colors`, `"radius"` needs `borderRadius`, `"shadow"` needs `shadows`).

## Invalid config (

`Invalid config (style-gen.config.json):` (or `package.json` when the config lives under `"style-gen"`) is followed by one line per problem: a key the config does not have, or a value that is not valid for it. The command exits 1 and leaves the generated files as they were. Every command that reads the config gives this verdict: `generate`, `tokens`, `schema`, `doctor` and the plugins (a plugin prefixes `[style-gen-vite]` or `[style-gen-next]` and throws). A config that is not valid JSON is a different case, described in [Ignoring a malformed config](#ignoring-a-malformed-config): `generate`, `tokens` and `schema` warn and use the defaults, while `generate --check`, `doctor` and the plugins fail. `style-gen schema` writes `style-gen.config.schema.json` even when the config is invalid, so an upgrader can get the editor's help for fixing it; add `"$schema": "./style-gen.config.schema.json"` to the config and the editor flags a wrong key as you type ([Theme config → Editor autocomplete](./reference/theme.md#editor-autocomplete)).

## Ignoring a malformed config

`Ignoring style-gen.config.json is not valid JSON (<parser message>); using defaults` is a warning, not an error. `style-gen generate`, `style-gen tokens` and `style-gen schema` read a config that is not valid JSON as if it did not exist, so the defaults apply (`styles/theme.json`, `styles/theme.css`) and a later `Theme file not found` can name a path you never configured. The same line appears for `style-gen.config.json must contain a JSON object` and for `package.json "style-gen" must be a JSON object`. Fix the file first. `generate --check` ([`--check needs a readable config`](#--check-needs-a-readable-config)), `style-gen doctor` (`Config (<file>) ❌ Ignored`) and the plugins (`Invalid config (<file>):`) refuse the same file instead of using the defaults.

## --check needs a readable config

`--check needs a readable config: <reason>` comes from `style-gen generate --check` and exits 1. The other commands read an unreadable config as the defaults; a check that did the same would vouch for a tokens file nobody configured. Fix the config (the reason is the `Ignoring …` text above) and run the check again.

## Unrecognized key

`<key> → Unrecognized key` means the key does not exist in that object. Typos (`breakpoint` for `breakpoints`, `outptu` for `output`) are the common case. Keys that look familiar but do not exist:

- In `style-gen.config.json`: `plugin`, `extraSources` and `axes`. Classes built at runtime are declared in your own CSS with a plain Tailwind `@source inline(...)` next to the generated import ([Cookbook](./cookbook.md#classes-built-at-runtime)).
- In the plugin call: `themePath`, `outDir` and `options`. They are `theme`, the directory of `output`, and the same keys written in the config file ([Only { root } is accepted](#only--root--is-accepted)).
- In the theme: `backDropBlurs`. `backDropBlurs → Unrecognized key` means the theme still uses the spelling from before 8.0: rename the key to `backdropBlurs`, in `themeAxes` overrides and in `coverage` too, and regenerate a committed `theme.schema.json` with `style-gen schema` ([migration B5](./migration/7.x-to-8.0.md#b5-backdropblurs-is-now-backdropblurs)).

The migration page lists every rename and each before and after: [Upgrading from 7.x to 8.0](./migration/7.x-to-8.0.md).

## Invalid JSON in and Theme file not found

`Invalid JSON in <file>: …` carries the parser's position: a trailing comma, a comment or an unquoted key. `Theme file not found: <file>` means the path in `theme` (config) or `--theme` does not exist relative to the project root; the CLI adds `Run: yarn style-gen init`, which writes a starter theme and config. `Theme path is a directory` means the path names a folder.

## escapes project root

`output escapes project root: ../theme.css` means a generated file would land outside the project. `output` and `tokensOutput` (and `--out`) must stay inside the project root; `theme` may point anywhere, so a shared theme package is allowed ([Cookbook → monorepo](./cookbook.md#one-theme-shared-by-several-apps-monorepo)). Move the output path inside the project and import it from there.

## No config found

`No style-gen.config.json or package.json#style-gen found in <directory>; using the defaults.` is an info line, not an error. `styleGenVite()` and `styleGenNext()` print it once per dev server or build process (with the `[style-gen-vite]` or `[style-gen-next]` prefix; Next.js evaluates its config in several worker processes, and each one prints it once), and `style-gen generate` prints it before `Run: yarn style-gen init` when the theme is missing. The directory is where the config was looked for: the Vite root, `process.cwd()` for Next.js, or the plugin's `root`. A wrong directory (Nuxt 4 sets Vite's root to `app/`) looks exactly like a project without a config: pass `root` ([Only { root } is accepted](#only--root--is-accepted)), or run `yarn style-gen init` to write the config.

## must be a .ts, .mts or .cts file

`tokensOutput must be a .ts, .mts or .cts file (not a .d.ts declaration): the output is TypeScript, got <path>` means the tokens module has another extension. `style-gen tokens --out` gives the same message with `--out` in place of `tokensOutput`, and a plugin prefixes it. The module holds `export const`, so it needs a TypeScript file name; a `.d.ts` cannot carry a runtime export. Rename `tokensOutput` (or `--out`) to a file such as `src/theme/theme.tokens.ts`.

## must be different files

`<a> and <b> must be different files, both resolve to <path>` means two of the three generated or read files share one path, so one write would overwrite the other. The names are `theme`, `output` and `tokensOutput` (`tokens file (theme.tokens.ts beside output)` while `tokensOutput` is unset; `--out` for `style-gen tokens`). Typical causes: `output` equal to `theme` (the CSS would replace the theme JSON), and `output` that is itself `theme.tokens.ts` (the default tokens file lands on the CSS). `style-gen doctor` prints the same text under `Output (<output>) ❌ Invalid emit paths` and exits 1. Give each role its own file; set `tokensOutput` when `output` is a `.ts` file.

## Cannot write

`Cannot write <file>: …` carries the file system error (permissions, a read-only directory, a path that is a folder). Nothing is half-written: the file is replaced atomically or left as it was.

## Cannot read

`Cannot read <file>: …` carries the file system error for a file that exists but cannot be read: the theme (`style-gen generate`, the plugins) or the tokens file (`generate --check`). A missing theme and a theme path that is a directory have their own messages ([Invalid JSON and missing theme](#invalid-json-in-and-theme-file-not-found)). `style-gen budget` prints `Cannot read <target>: …` for a CSS target it cannot open and exits 2. Check the permissions of the file named in the message.

## Tokens file missing or stale

`<file> does not exist. Run: style-gen generate` and `<file> is out of date. Run: style-gen generate` come from `style-gen generate --check`: the committed `theme.tokens.ts` does not match the theme and config. Run `yarn style-gen generate` (or start the dev server, where the plugin writes it) and commit the file. The file holds token keys, so editing only a color value leaves it current.

A file that is out of date right after a clean `generate` was rewritten by another tool. Only Prettier honours the `// prettier-ignore` line the file carries before each export; exclude `theme.tokens.ts` from Biome, dprint, oxfmt, ESLint stylistic `--fix` and any lint-staged glob that rewrites files. A checkout with CRLF line endings is not a cause: the comparison ignores them.

## Cannot reload config and Re-emit failed

Both come from a running dev server or `style-gen generate --watch`, and neither stops it. `[style-gen-vite] Cannot reload config, keeping the previous one:` (or `[style-gen-next]`) is followed by the reason: an edit of `style-gen.config.json` (or of `package.json#style-gen`) that cannot be used, for example an `output` outside the project root. The CLI prints `Cannot reload config: <reason>` for the same failure and `Invalid config (<file>):` followed by the issues when the edit breaks the schema. The previous config stays in force until the file is fixed. `[style-gen-vite] Re-emit failed:` is followed by the message of the theme or write error that stopped the regeneration (`Invalid theme (…)`, `Cannot write …`); the last good `theme.css` stays. Fix what the message names and save again. Both config files are watched, so creating `style-gen.config.json` or moving the config between the two files is picked up without a restart; an edit of the rest of `package.json` (`yarn add`) is ignored while `style-gen.config.json` exists.

## Only { root } is accepted

`[style-gen-vite] Invalid options:` followed by `Only { root } is accepted` means the plugin got an argument other than `root`. `styleGenVite()` and `styleGenNext()` take only `{ root }`, the directory that holds `style-gen.config.json`; every generator option is a key of that file. Call the plugin without arguments, and put `theme`, `output`, `tokensOutput`, `breakpoints` and the rest in the config ([Vite and Nuxt](./reference/vite.md)). Nuxt 4 sets the Vite root to `app/`, so pass the project folder as `root` there.

## --check and --watch cannot be combined

`--check` writes nothing and exits; `--watch` keeps running and writes on every change. Use `--check` in CI and `--watch` while editing.

## init stops with exit code 1

`style-gen init --yes` never overwrites and never redirects an existing config, so it stops instead of guessing:

- `<file> is invalid, so --yes cannot tell where its theme lives:` followed by the config issues and `💡 Fix it first: yarn style-gen doctor`. Delete the removed or misspelled keys (`extraSources`, `axes`, `plugin`: [migration B10](./migration/7.x-to-8.0.md#b10-migration-helpers-are-removed)) and run it again, or use `style-gen init --rules-only` to refresh only the agent rules.
- `--theme <path> differs from the theme of <file> (<path>); --yes never redirects an existing config.` followed by `💡 Drop --theme, or run init without --yes to change it`. Drop `--theme`, or edit `theme` in the config.

`The theme of <file> (<path>) is outside the project root: init writes no theme or theme schema for it.` is an info line, not a failure: a shared theme (monorepo) is not scaffolded, and `init` writes only the config schema and the rules.

## schema refuses two files at one path

`--out and --config-out name the same file: <path>`, `--out would overwrite the theme file: <path>` and `--config-out would overwrite the theme file: <path>` mean the theme schema, the config schema and the theme JSON must be three different files. `style-gen schema` writes nothing and exits 1 until they are. Choose other paths for `--out` and `--config-out`.

## A class has no style

Work through these in order:

1. The key is in the theme and the class uses its kebab-cased name: `blue500` is `bg-blue-500`, `text16Medium` is `text-16-medium`.
2. `theme.css` is imported next to `@import "tailwindcss"`, and the path matches `output` in the config.
3. The class is not built at runtime. A template literal such as `` `bg-${variant}` `` is invisible to Tailwind's scan: declare those classes with your own `@source inline(...)` ([Options](./reference/options.md#classes-built-at-runtime)).
4. `coverage` did not trim the class away, and an opacity class (`bg-primary/10`) has its step in `coverage.colors.opacities` ([`coverage`](./reference/options.md#coverage-trim-the-source-inline-lines-per-category)).
5. The key does not clash with a built-in Tailwind class (`bg-none`, `text-sm`): `style-gen doctor` prints a warning for known clashes ([Theme config](./reference/theme.md#built-in-utility-name-clashes)).

## theme.css is missing

The dev server or the build did not run the generator. With Vite, `styleGenVite()` is listed before `tailwindcss()`; with Next, the config is wrapped in `styleGenNext()`; with neither, `yarn style-gen generate` runs before the dev server and the build ([Cookbook](./cookbook.md#generate-the-css-without-a-bundler-plugin)). `yarn style-gen doctor` prints `Output (…) ⚠️ Not generated yet` until the file exists.

## tailwind-merge keeps the wrong class

A plain `twMerge` does not know the theme's `text-16-medium`, `rounded-pill` or `shadow-card`, so it can keep the earlier class. Build one `cn` per theme with `createCn(tokens)` ([Build components → `cn`](./getting-started/build-components.md#4-cn-merge-classes-with-the-themes-classes-in-mind)).
