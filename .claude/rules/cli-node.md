---
paths:
  - "src/cli/**"
  - "src/node/**"
  - "src/features/vite/**"
  - "src/features/next/**"
---

# CLI and Node code rules

Loaded when a file under `src/cli`, `src/node`, `src/features/vite` or `src/features/next` is read.

- **Node code lives in `src/node/`** (`loadStyleGenConfig`, `resolveProjectPath`, `sameFile`, `configSource`, `resolveEmitTarget`, `themeEmitter`, `watchThemeFile`, `resolvePluginTarget`,
  `writeFileAtomic`, `errorMessage`, `isPlainObject`) and is imported only by `src/cli/**`, `src/features/vite/**` and `src/features/next/**`; never from `src/core`,
  the browser-safe exports or the root barrel (it would leak `node:*`/chokidar into `dist/index.js`; `check:browser-safe` and `check:sizes` catch it).
  `resolveProjectPath(root, input, label, { allowOutsideRoot })` replaces the old `resolveSafePath`,
  normalises every path through `resolve(root, input)` (absolute ones too) and does NOT rewrite a leading `/`: `theme`/`--theme` may be absolute or outside the root,
  `output`/`tokensOutput`/`--out` must stay inside it. `styleGenVite()`/`styleGenNext()` take only `{ root }` (the directory holding the config; Nuxt passes the project folder because it sets Vite's root to `app/`):
  `resolvePluginTarget(root, label)` reads `style-gen.config.json` (else `package.json#style-gen`) exactly like the CLI, so `theme`, `output`, `tokensOutput` and every `generate()` option live there, and a config edit is reloaded in place (re-resolve, re-register, re-emit, full reload; an invalid edit keeps the last target).
  The plugins write `theme.css` and `theme.tokens.ts` (the typed `tokens` plus `ThemeAxesState`; apps import them from that file instead of calling `createDesignTokens`); the file is committed in apps that import it (`yarn check:tokens` fails when it is stale) and git-ignored where nothing imports it (harness).
  `generate()` is `prepareGenerate()` (validation) + `generateFromParsed()` (CSS only; `generate()` builds `tokens`/`schema` itself);
  the emitter calls the two separately to label the failing stage (`read`, `parse`, `options`, `theme`, `cross`, `generate`, `write`; the watcher adds `config`, `watch`).
- CLI (`src/cli/`): `run.ts` holds the command registry (`init`, `generate`, `doctor`, `schema`, `tokens`, `budget`, `canvas`),
  `runCli(args, cwd)` returns the exit code (0 ok/help/version/cancel, 1 failure, `budget` and `canvas` 2 for usage) and parses flags strictly per command;
  **commands never call `process.exit`** (only `src/cli/index.ts` assigns `process.exitCode`), so tests drive `runCli`/the command functions directly.
  `generate --watch` (like the Vite/Next dev servers) watches the theme AND both config candidates (`style-gen.config.json`, `package.json#style-gen`; resolved by `src/node/configSource.ts`, `package.json` events ignored while `style-gen.config.json` exists) and keeps the last valid config when an edit is invalid.
  `generate --check` compares the committed tokens file with CRLF normalised and fails on a malformed config (the other commands warn `Ignoring … using defaults`). `generate`, `doctor` and the plugins resolve outputs through `resolveEmitTarget` (`output`/`tokensOutput` inside the root, `tokensOutput` a `.ts`/`.mts`/`.cts` file, theme, CSS, tokens module, `style-gen.config.json` and `package.json` five different files, decided by `sameFile`: same canonical path or same inode, so another case, a symlink or a hard link counts; both config files are protected even when absent); `doctor` reports a refusal as `Output (…) ❌ Invalid emit paths`.
  `schema` writes `theme.schema.json` (next to the theme, `--out`) and `style-gen.config.schema.json` (project root, `--config-out`; the config schema is written even when the config violates the schema: without `--out` the issues are then reported and the exit code is 1, with `--out` both schemas are written and the exit code is 0) from `z.toJSONSchema(StyleGenConfigFileSchema)` narrowed by `buildConfigJsonSchema` (`src/cli/configJsonSchema.ts`: per-category `coverage` prefixes/`keys`, distinct `opacities`); a valid `style-gen.config.json` without `$schema` gets that one line inserted after its `{` (every other byte kept, written in place; an invalid one is left as it is and the line to add is printed; `package.json#style-gen` is never edited); neither target may be the theme, `style-gen.config.json` or `package.json`, nor each other;
  cross-field rules (`breakpoints` ⊂ screens, one `screens` unit, `resetTailwindDefaults` replacements) and path rules stay out of the JSON Schema; the three committed copies (`examples/`, `examples/design-system/`, `site/`) are pinned by `committed-schema.test.ts`.
  `init --yes`/`-y` never prompts and never overwrites (existing files kept, exit 0) and keeps an existing config as it is: it reads the theme from it and exits 1 when the config is invalid or `--theme` names another theme; `init` writes `"$schema": "./style-gen.config.schema.json"` as a new config's first key. `init --rules-only` without a config prints no CSS lines (it says no config was found). A config `generate` rejects keeps the `theme`/`output` it declares and is left byte for byte as it was (warning), a `style-gen.config.json` that is not valid JSON stops `init` with exit 1, and a `--theme` that names a file `init` writes or merges into exits 1.
  `init` detects the stack (`detectStack`: `nuxt.config.*` > `next.config.*` > `vite.config.*` > none,
  project root only) and only PRINTS the bundler snippet (`getBundlerSnippet` in `src/cli/templates.ts`,
  shown byte for byte in the README (Vite) and `documents/reference/cli.md` (Next.js, Nuxt); `src/cli/templates.test.ts` compares them);
  it never edits a bundler config and scaffolds no generator script; `init` merges `theme`/`$schema` (and `output` only when absent) into a valid config that does not already name the theme (or into a copy of `package.json["style-gen"]`) when it writes, and drops no key a major removed (7.x-to-8.0.md B10):
  an invalid config is kept as it is, or gets only the chosen theme merged in (both with a warning), so a key the schema rejects (`plugin`, `extraSources`, `axes`) stays and `generate` reports it as an unknown key. `budget` writes `OK: …`/`OVER BUDGET: …` lines that are a contract
  consumers grep; `--coverage-cost` adds informational cost lines after them (`src/cli/coverageCost.ts`, an upper bound: classes the app's source uses stay).
