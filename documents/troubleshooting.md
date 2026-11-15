# Troubleshooting

Find the start of the message the CLI, `styleGenVite()` or `styleGenNext()` printed, then read the section with the same title. The bundler plugins prefix every message with `[style-gen-vite]` or `[style-gen-next]`; the text after the prefix is the same as the CLI's. Validation messages list one `path → message` line per problem. `yarn style-gen doctor` ([CLI](./reference/cli.md#style-gen-doctor)) checks the config, the theme and the generated CSS in one run.

| Message starts with                                             | Read                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `Invalid theme (`                                               | [Invalid theme](#invalid-theme-)                                                  |
| `Invalid options`                                               | [Invalid options](#invalid-options)                                               |
| `Invalid theme/options`                                         | [Invalid theme/options](#invalid-themeoptions)                                    |
| `Invalid config (`                                              | [Invalid config](#invalid-config-)                                                |
| `… → Unrecognized key`                                          | [Unrecognized key](#unrecognized-key)                                             |
| `Invalid JSON in`, `Theme file not found`                       | [Invalid JSON and missing theme](#invalid-json-in-and-theme-file-not-found)       |
| `… escapes project root`                                        | [escapes project root](#escapes-project-root)                                     |
| `Cannot write`                                                  | [Cannot write](#cannot-write)                                                     |
| `… does not exist. Run: style-gen generate`, `… is out of date` | [Tokens file missing or stale](#tokens-file-missing-or-stale)                     |
| `Only { root } is accepted`                                     | [Only { root } is accepted](#only--root--is-accepted)                             |
| `--check and --watch cannot be combined`                        | [--check and --watch cannot be combined](#--check-and---watch-cannot-be-combined) |

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

`Invalid config (style-gen.config.json):` (or `package.json` when the config lives under `"style-gen"`) is followed by one line per problem. The generator never falls back to the defaults on a broken config: fix the file and run again. A config that is not valid JSON is reported the same way. `style-gen schema` writes `style-gen.config.schema.json`; add `"$schema": "./style-gen.config.schema.json"` to the config and the editor flags a wrong key as you type ([Theme config → Editor autocomplete](./reference/theme.md#editor-autocomplete)).

## Unrecognized key

`<key> → Unrecognized key` means the key does not exist in that object. Typos (`breakpoint` for `breakpoints`, `outptu` for `output`) are the common case. Keys that look familiar but do not exist:

- In `style-gen.config.json`: `plugin`, `extraSources` and `axes`. Classes built at runtime are declared in your own CSS with a plain Tailwind `@source inline(...)` next to the generated import ([Cookbook](./cookbook.md#classes-built-at-runtime)).
- In the plugin call: `themePath`, `outDir` and `options`. They are `theme`, the directory of `output`, and the same keys written in the config file ([Only { root } is accepted](#only--root--is-accepted)).
- In the theme: `backDropBlurs`. The key is `backdropBlurs`, in `themeAxes` overrides and in `coverage` too.

The migration page lists every rename and each before and after: [Upgrading from 7.x to 8.0](./migration/7.x-to-8.0.md).

## Invalid JSON in and Theme file not found

`Invalid JSON in <file>: …` carries the parser's position: a trailing comma, a comment or an unquoted key. `Theme file not found: <file>` means the path in `theme` (config) or `--theme` does not exist relative to the project root; the CLI adds `Run: yarn style-gen init`, which writes a starter theme and config. `Theme path is a directory` means the path names a folder.

## escapes project root

`output escapes project root: ../theme.css` means a generated file would land outside the project. `output` and `tokensOutput` (and `--out`) must stay inside the project root; `theme` may point anywhere, so a shared theme package is allowed ([Cookbook → monorepo](./cookbook.md#one-theme-shared-by-several-apps-monorepo)). Move the output path inside the project and import it from there.

## Cannot write

`Cannot write <file>: …` carries the file system error (permissions, a read-only directory, a path that is a folder). Nothing is half-written: the file is replaced atomically or left as it was.

## Tokens file missing or stale

`<file> does not exist. Run: style-gen generate` and `<file> is out of date. Run: style-gen generate` come from `style-gen generate --check`: the committed `theme.tokens.ts` does not match the theme and config. Run `yarn style-gen generate` (or start the dev server, where the plugin writes it) and commit the file. The file holds token keys, so editing only a color value leaves it current.

## Only { root } is accepted

`[style-gen-vite] Invalid options:` followed by `Only { root } is accepted` means the plugin got an argument other than `root`. `styleGenVite()` and `styleGenNext()` take only `{ root }`, the directory that holds `style-gen.config.json`; every generator option is a key of that file. Call the plugin without arguments, and put `theme`, `output`, `tokensOutput`, `breakpoints` and the rest in the config ([Vite and Nuxt](./reference/vite.md)). Nuxt 4 sets the Vite root to `app/`, so pass the project folder as `root` there.

## --check and --watch cannot be combined

`--check` writes nothing and exits; `--watch` keeps running and writes on every change. Use `--check` in CI and `--watch` while editing.

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
