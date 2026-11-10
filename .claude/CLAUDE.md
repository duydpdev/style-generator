# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@duydpdev/style-generator` — TypeScript library + CLI that compiles a theme JSON into Tailwind CSS **v4** utilities via a single `generate()` call:
a CSS string (`@theme inline` variables, `themeAxes` overrides, registry-generated `@source inline` utility coverage), typed design tokens, and a JSON Schema.
**Tailwind v4 only** — no v3 support, no version auto-detection. ESM-first (`"type": "module"`) with CJS interop.

## Package Manager

Use **Yarn Berry v4** exclusively. Never `npm`/`npx` directly.

```bash
yarn install
yarn add <package>
```

## Common Commands

```bash
# Build
yarn build          # Vite library build (ESM + CJS + .d.ts via vite-plugin-dts)
yarn build:cli      # tsdown (tsdown.config.ts) → dist/cli/index.mjs + map, node shebang, no .d.mts
yarn build:all      # Both

# Test
yarn test           # Vitest run, unit (*.test.ts)
yarn test:watch     # Watch mode
yarn test:coverage  # v8 coverage; excludes test files and dist/
yarn test:types     # vitest run --typecheck.only — *.test-d.ts (expectTypeOf); `yarn test` does not run them
yarn test:e2e       # Playwright (Chromium + WebKit) — spacing inheritance, compiled CSS
yarn test:visual    # after yarn site:build: Playwright screenshots of the built site (Chromium); Linux baselines, compared in visual.yml, rewritten only via the visual-update label (visual-update.yml)
yarn workspace plain-react-example test   # after build:all + `yarn playwright install chromium`: Storybook stories + plain-vs-harness class parity gate (Vitest browser, Chromium)
yarn workspace plain-nuxt-example test:stories   # needs `prepare:nuxt` first (CI job `plain-nuxt`)
node examples/plain-react/scripts/copy-out-smoke.mjs   # after build:all: a copied src/ui/button/ type-checks with the packed tarball + peers only (CI)
yarn vitest run src/features/registry/generateSourceInline.test.ts   # Single file

# Quality
yarn verify         # base gate + src gate in one command (documents/testing.md → Gate table)
yarn lint           # ESLint, --max-warnings 0, --report-unused-disable-directives
yarn lint:fix
yarn prettier:check # CI gate (check mode); yarn prettier only prints, yarn prettier:fix writes
yarn tsc --noEmit   # Type check
yarn check:externals && yarn check:sizes && yarn check:browser-safe && yarn check:publish-target   # publish gates (all four run by prepublish; CI runs the first three, deploy.yml runs publish-target)
yarn check:smoke    # after build:all: import+require every subpath, run the CLI incl. init stack detection + generate in a fresh project (CI)
yarn check:next-build   # after build:all, needs network: packed tarball + next@16.4.5 in a scratch project, init + `next build` (Turbopack) through styleGenNext (CI node-floor)
yarn check:types-pack   # after build:all: yarn pack + @arethetypeswrong/cli (node16 profile) — ESM .d.ts / CJS .d.cts resolve for every subpath (CI)
yarn site:build     # lib build + landing site (renders documents/*.md)
yarn docs:embed         # rewrite <!-- embed: path#region --> blocks from the marked example regions
yarn docs:signatures    # rewrite <!-- signature: Name --> blocks in documents/reference from dist/*.d.ts (after build:all)
yarn check:docs-embed && yarn check:docs-i18n && yarn check:doc-snippets && yarn check:doc-exports   # docs gates (after build:all; CI check job)
yarn check:plain-ui     # examples/plain-react/src/ui/<folder>/: style.ts, types.ts, <Name>.tsx, index.ts; relative imports only ./… and ../../theme; package allow-list (CI)
```

The gate a task must pass before it is reported done lives in `.claude/rules/validation.md`.

Pre-commit (Husky): `.husky/pre-commit` runs only `yarn lint-staged`, which works on the staged snapshot:
eslint --fix → prettier → `tsc --noEmit` → `vitest related --run` (`lint-staged.config.js`). Yarn Berry never runs `prepare`,
so Husky is installed via `postinstall: husky` (verify with `git config core.hooksPath` → `.husky/_`).
`pinst` (`prepack: pinst --disable`, `postpack: pinst --enable`) renames `postinstall` to `_postinstall` inside the published tarball so consumers never run Husky.
Release CI sets `HUSKY=0`. `.husky/pre-push` runs `scripts/check-branch-name.sh`, also a step of `pr-title.yml`:
branch names are `<type>/<slug>` (`feat|fix|docs|chore|ci|build|refactor|test|perf|revert`, slug 1–6 lowercase words joined by `-`), plus `release/*`, `promote/*`,
`dependabot/**` and `integrate/<slug>` (`documents/deploy.md` → Branching Strategy).

## Commit Convention

Custom format `[type] subject`, lowercase type (NOT conventional-commits `type:`), parsed by `release.config.cjs`:

| Type                                               | Release |
| -------------------------------------------------- | ------- |
| `[release]`                                        | major   |
| `[feat]`                                           | minor   |
| `[fix]` `[perf]` `[revert]` `[style]` `[refactor]` | patch   |
| `[chore]` `[docs]` `[test]` `[build]` `[ci]`       | none    |

`[conf]` `[temp]` `[wip]` are valid, no release. Features are cut from `main` and land twice, both as merge commits (never squash):
a PR into `develop` (pre-release `DEV` dist-tag), then, once approved, a PR from the same branch into `main` (stable).
With `delete_branch_on_merge=true` GitHub deletes the branch when the `develop` PR merges: recreate it on GitHub at that PR's `headRefOid` (`gh api -X POST …/git/refs`,
never a local push) and check that the `main` PR's `headRefOid` equals it before merging. `release/*` is never the head of a merged PR:
promote it through a `promote/<x>` branch at the same SHA. Each merge triggers Semantic Release → tag → publish to **GitHub Packages** (`npm.pkg.github.com`, scope `@duydpdev`);
the release type comes from the feature's commit headers. Every push to `main` back-merges to `develop`. Details: `documents/deploy.md`.

## Architecture

```text
theme.json → generate(theme, options) → { css, tokens, schema }
```

`generate()` (`src/core/generate.ts`) validates `options` first (`StyleGeneratorOptionsSchema.parse` → `resolveOptions`),
then always re-validates `theme` against `ThemeSchema` (a Zod `strictObject` with `.superRefine()` alias/injection checks — unknown keys throw a `ZodError`),
then returns `css` (written to a file and `@import`ed next to `@import "tailwindcss";`), `tokens` (typed `DesignTokens.Web.*`,
one array per `ThemeConfig` field under the same name — `colors`, `typography`, `borderRadius`, … — plus `spacingProperties`/`breakpoints`/`screens`;
also `createDesignTokens()` from `./tokens`) and `schema` (`z.toJSONSchema(ThemeSchema)`).

Pipelines, all driven by the category registry:

1. **registry** (`src/features/registry/`) — `builtInCategories.ts` declares one `TokenCategoryDescriptor` per category (`colors`, `typography`, `shadows`, `backDropBlurs`,
   `borderRadius`, `fontFamily`, `borderWidth`; `colors` feeds `bg`, `text`, `border`, `ring`, `outline`, `divide`, `placeholder`);
   `generateSourceInline.ts` emits one `@source inline(...)` per category.
2. **theme-css** (`src/features/theme-css/`) — `:root` `--sg-*` vars, `html[data-<axis>="<variant>"]` overrides,
   `@theme inline` mapping (including `--border-width-<key>` for `borderWidth`); `generateScreensCss.ts` (custom breakpoints).
3. **tokens**, **typography** (`@utility <kebab-key>`), **spacing** (`.sp-*` utilities over `var(--sg-sp-*)`), **cva**, **vite**, **next** under `src/features/`.
   **recipes** (`./recipes`: `createTailwindMergeExtension`, `splitSpacingProps`/`SpacingProps`, `themeAxisAttributes`) is subpath-only (not re-exported from `.`), browser-safe,
   and imports nothing from `tailwind-merge` (structural `TailwindMergeExtension` type; the app owns that dependency; `check:externals` fails if any entry but `./ui` imports it).
   **ui** (`./ui`: `recipeFromTables`, `pick`, `contrastText`, `createCn`, `splitSpacing`, `splitLayout`, `mergeStyle` + types, `src/features/ui/`; `./ui-react`:
   type-only `Polymorphic`) is subpath-only; `class-variance-authority`, `clsx`, `tailwind-merge`, `@types/react` are optional peers (ranges in `package.json#peerDependencies`;
   `ui-peer-floor` tests their floors). `borderRadius` goes through tailwind-merge's `radius` theme scale (every `rounded-*` group reads it);
   its local prefix table for `border`/`divide-*`/`shadow`/`backdrop-blur` is pinned to the registry descriptors by `extendTailwindMerge.test.ts`;
   do not import `builtInCategories.ts`/`classPrefixes.ts` from it (that would split a shared chunk and grow `./tokens`).

`DEFAULT_BREAKPOINTS = ["md", "lg"]` (`src/shared/defaultOption.ts`) is the single fallback for `@source inline` variants,
spacing `@media` chains and `DesignTokens.Web.breakpoints` when `options.breakpoints` is unset. Why `md`/`lg` only:
the pre-v4 baseline emitted only `md:`/`lg:` and the consumer passes `[Breakpoint.MD, Breakpoint.LG]`;
defaulting to every `screens` key advertised breakpoints no `@source inline` line covered. `src/shared/classPrefixes.ts` holds the `roundedProperties`/`borderProperties`
class-prefix lists.

Build outputs: `dist/{index,tokens,cva,spacing,recipes,types,ui,ui-react,vite,next}.{js,cjs,d.ts,d.cts}` (10 subpaths, Vite lib multi-entry;
`dist/<n>.d.cts` is `dist/<n>.d.ts` run through `toCjsDeclaration` (`scripts/cjs-declaration.mjs`) by `scripts/emit-cts-types.mjs`, the last step of `yarn build`:
the single `vite` import becomes `import type … assert { 'resolution-mode': 'import' }` because Vite has no usable CommonJS types, `zod`, `class-variance-authority`, `clsx`,
`tailwind-merge` and `react` are kept, any other external specifier or import form fails the build; `assert`, not `with`,
because `with` is a parse error on TypeScript < 5.3) + `dist/cli/index.mjs` (tsdown, JSDoc stripped via `outputOptions.comments.jsdoc = false`).
`package.json#exports` uses nested conditions (`import: { types: .d.ts, default: .js }`, `require: { types: .d.cts, default: .cjs }`) and has no top-level `types`;
`moduleResolution: node10` is unsupported. `yarn typecheck:dist` checks the `.d.ts` under ESNext + Bundler (`tsconfig.dts-check.json`) and the `.d.cts` as a CommonJS consumer under
`node16` with `skipLibCheck: false` (`tsconfig.dts-check.cjs.json`, `scripts/dist-types.cjs.assert.cts`); attw never resolves peer types, so it cannot replace that check.
Shared hashed chunks are internal. `vite.config.ts` pins the modules several entries share (`helpers`+`colorStates`, `exports/spacing`+`spacingHelpers`, `defaultOption`,
the `recipes` entry's modules, `axisAttributeName`) via `manualChunks` so a new entry cannot reshuffle chunks and push `tokens`/`cva`/`spacing`/`index` over budget;
the chunk name `spacing` MUST equal its entry name; when a new shared module or entry makes those four sizes drift,
pin it or restructure the import instead of raising their budgets (Vite 8/Rolldown deprecates `manualChunks` for `advancedChunks`: revisit on upgrade).
Only `dist/` is published, `"sideEffects": false`; gzip budgets in `scripts/check-sizes.mjs`.

Source layout: `documents/architecture.md`; public exports per subpath and CLI: `documents/reference/`.
Internal helpers (`toCamelCase`, `toPascalCase`) are not exported from any barrel; `toKebabCase` is public (from `./cva`) because it is the function the registry and
`createVariantMapper` share. Breaking changes from 3.x: `documents/migration/3.x-to-4.0.md`; from 4.x: `documents/migration/4.x-to-5.0.md`; from 5.x:
`documents/migration/5.x-to-6.0.md`; from 6.x: `documents/migration/6.x-to-7.0.md`.

Sample components (examples, not an API; nothing is published): `Box`, `Text`, `Stack`, `Flex`, `Grid`, `Button` live in the harness app over the `examples/design-system` recipes.
React: `examples/harness/src/ui/*.tsx`, each a self-contained factory file `create<Name>(tokens, preset?)` with its own prop types and `Polymorphic` type (all six import
`splitLayout`/`splitSpacing`/`mergeStyle` from `@duydpdev/style-generator/ui` and `Polymorphic` from `/ui-react`;
`src/ui/layout.ts` keeps only the harness's `LayoutProps` type and `LAYOUT_SIZE_KEYS`), exported as `harness-example/ui` and bound once in `examples/harness/src/ui.ts`;
`site` imports the same files and binds them to its own tokens in `site/src/ui.ts`. Recipes are theme-free factories in `design-system-example/recipes` (`create<Name>Recipe`,
`<name>Tables`, built with `recipeFromTables` from `./ui`) plus the bound recipes and presets in `design-system-example`.
ESLint reads component names and banned tags from `examples/ui-registry.mjs`. Touchpoints for a new component, app-code and layout rules: `documents/components.md`.
Plain apps (copy-paste, never import the harness): `examples/plain-react` (Storybook + parity gate) and `examples/plain-nuxt`,
one folder per component in `src/ui/<folder>/` (Nuxt `app/ui/<folder>/`) over `@duydpdev/style-generator/ui`;
`yarn check:plain-ui` enforces the layout and the identical `style.ts`; lint also needs `yarn workspace plain-nuxt-example prepare:nuxt`.

## Theme / Color Rules (current v4 API)

- `colors` is the only **required** field in `ThemeConfig`; all others (`typography`, `shadows`, `backDropBlurs`, `borderRadius`, `fontFamily`, `borderWidth`, `themeAxes`) are optional.
- Colors are a **flat camelCase** object. Nested color objects and `DEFAULT` key are unsupported.
- Key conversion: camelCase → kebab-case CSS vars/classes. Letter→digit boundary adds a dash (`blue500` → `blue-500`); digit-prefix tokens preserved (`2xl`).
  Keys that collide once kebab-cased (`blue500`/`blue-500`) are rejected. **`_` and a leading uppercase run of two or more letters (`CTA`, `ABtn`,
  `HTMLParser`) are rejected in every token-name position**: the camelCased token would map to a class the registry never emits (a single capital such as `Blue`,
  or an inner run such as `primaryCTA`, round-trips and is accepted). `formatZodError` prints the hint on the path.
  Each category owns a distinct `--sg-<category>-` namespace (`sg-color`, `sg-shadow`, `sg-backdrop-blur`, `sg-radius`, `sg-font`, `sg-border-width`, plus spacing's `sg-sp`),
  so cross-category variable collisions are impossible by construction. A `typography` key kebab-casing to `sp-*` or `font-*` is rejected,
  and `typography.*.fontWeight` is a number in 1–1000.
- A `__proto__` key is rejected at its exact path wherever it appears in a theme (`rejectProtoKeys`, the raw-input `z.preprocess` step of `ThemeSchema`, `src/core/themeSchema.ts`):
  Zod's `z.record` skips that key before the key schema runs, so without the scan the token would be dropped silently. Only a parsed JSON document can carry it as an own key.
  The options records (`screens`, `spacing.properties`) are not scanned: they hold no token names.
- `themeAxes: Record<axisName, Record<variantName, ThemeOverride>>` — independent axes (e.g. `theme.dark` and `palette.forest` at once),
  each activated via `html[data-<axis-kebab>="<variant-kebab>"]` (`axisAttributeName`, `src/shared/axisAttributeName.ts`, shared with `themeAxisAttributes`).
  The selector is always pinned to `html` and the attribute name is not configurable, because a `$`-alias `var()` resolves where the custom property is declared (`:root`);
  a scoped theme on another element or a custom attribute name is hand-written CSS in the app.
  Blocks emit after `:root` in declaration order, so for a token overridden by two axes the axis declared **last** wins.
- An override key must already exist in the matching base category — override-only keys are rejected (they would produce no utility).
- Axis and variant names must NOT be canonical integers (`/^(0|[1-9]\d*)$/`) — JS enumerates integer-like keys first, which would silently invert "last declared wins". `007`/`2xl` are fine.
- Variant names of one axis must not kebab-case to the same attribute value (`darkMode` ≡ `dark-mode`).
  Alias cycles are also checked across axes (`validateCrossAxisAliasCycles`, `src/core/aliasGraph.ts`):
  every combination of at most one variant per axis is merged in declaration order, because all axes apply to the same `html` element at once;
  the cycle is reported at the later axis.
- Alias `"$<key>"` resolves within the SAME category to `var(--<cssVarPrefix>-<kebab-key>)` using that category's `cssVarPrefix` (`src/features/registry/builtInCategories.ts`):
  `$blue500` in `colors` → `var(--sg-color-blue-500)`, `$base` in `shadows` → `var(--sg-shadow-base)`. Existence and acyclicity are validated at parse time.
  Use the raw key (`$blue500`, not `$blue-500`). Not supported inside `typography`. The emitted `--sg-*` variables (`--sg-color-<key>`, `--sg-shadow-<key>`,
  …) are a public contract (consumers read them); renaming one is breaking (5.0 renamed `--sg-<color>` → `--sg-color-<key>`; `style-gen doctor` warns on leftovers;
  see `documents/migration/4.x-to-5.0.md`).
- `COLOR_STATES` (`["hover", "active"]`, `src/shared/colorStates.ts`) is the single state list for the registry's `@source inline` state lines and
  `createVariantMapper(prefix, tokens, { states: COLOR_STATES })`. Sibling detection uses camelCased keys (`primary-hover` ≡ `primaryHover`);
  states emit kebab-cased (`focusVisible` → `focus-visible:`).
- A theme key whose class equals a Tailwind _static_ utility (`bg-none`, typography `text-sm`, …) is not rejected, but Tailwind picks the winner — rename it (`clear`, `flat`,
  `zero`). `style-gen doctor` warns on known collisions (`src/cli/commands/utilityCollisions.ts`). A digit-only `borderWidth` key (`2`) is an override, not a tie:
  with `--border-width-2` in `@theme`, Tailwind resolves `border-2`/`border-x-2`/`divide-x-2` to the theme value; doctor still warns so the override is deliberate.
- `fontFamily` keys must not kebab-case to a font-_weight_ name (`thin` … `black`) or start with the `weight`/`size` segment (`weightBold` → `--font-weight-bold` is Tailwind's
  weight scale, not a family) — all share the `font-` prefix. A `typography` key must not equal another category's class (`<classPrefix>-<kebab key>`:
  `colors.primary` + `typography.textPrimary` → `text-primary`), checked from the registry's `classPrefixes` (`checkTypographyClassCollisions`).
- `borderWidth` replaces `border` (omitted or empty → Tailwind's `border-0/1/2/4`); a key sharing a color's `border-*` class (`thinLine`/`thin-line`) is invalid.
  A `colors` key kebab-casing to `x`, `y`, `x-<integer>`/`y-<integer>` or `x-<borderWidth key>` is rejected (`checkDivideColorCollision`:
  `divide-<key>` would be a Tailwind divider width).
- `generate()` validates options with a strict schema (`src/core/optionsSchema.ts`, internal): unknown keys rejected (also in `spacing`/`typography`); flags are booleans;
  `screens` values are one px/rem/em length and the map merged with `defaultScreens` uses one unit; `breakpoints` must name a screen.
  `style-gen.config.json` uses the same Shape (`StyleGenConfigSchema`, `src/node/loadStyleGenConfig.ts`, shared by the CLI, `styleGenVite` and `styleGenNext`).
  The 7.0 removals (`extraSources`, `axes`) are plain unknown keys: classes built at runtime are declared by the app with its own `@source inline(...)` next to the generated import.
- `options.coverage` (`Partial<Record<CategoryKey, boolean | { prefixes?, keys?: "aliased" | "all", opacities? }>>`) only changes the registry's `@source inline` lines:
  `false` drops a category's lines (state lines included), `prefixes` must be a **non-empty** list of real `classPrefixes` of that category (typography has none),
  `keys: "aliased"` keeps the alias **holders** — declared keys whose value is a `$alias` in the base record or any `themeAxes` override of the same category;
  the primitives they point to need no class (rejected for `typography`, which has no aliases). `opacities` (distinct integers 1–100, non-empty;
  only for categories whose descriptor sets `opacityModifier`, i.e. `colors`) adds ONE line `{bg,text,border,ring,outline,divide,placeholder}-{keys}/{steps}` right after the
  category line, following `prefixes`/`keys`, steps sorted ascending in `resolveOptions`, never crossed with the state lines.
  The same steps are `DesignTokens.Web.opacities` (`OpacitySteps<O>`, `resolveTokenOptions`), which `createVariantMapper(prefix, colors, { opacities })` turns into `token/step`
  keys; coverage changes no other typed token. Absent/`true`/`{}` is byte-identical to no option. `generate()` resolves every option default once in `resolveOptions()`
  (`src/core/resolveOptions.ts`, which spreads the slim `resolveTokenOptions()`); never re-apply `options.x ?? DEFAULT_X` downstream.
  Category defaults live in `src/features/registry/categoryTokenMeta.ts` (descriptors spread it); both it and `resolveTokenOptions.ts` must stay separate small files so the
  `./tokens` gzip budget holds (`vite.config.ts` sets `preserveEntrySignatures: "allow-extension"` for the same reason).
- Values must balance `(`/`[`. `typography.*.letterSpacing` is optional. `formatZodError` is exported from `.`.
- `options.resetTailwindDefaults` (`("colors" | "radius" | "shadow")[]`) adds `--color-*: initial;` / `--radius-*: initial;` / `--shadow-*: initial;` as the FIRST lines of
  `@theme inline` (order matters: after the mapping they would wipe the theme's own variables); `"colors"` also drops `--color-white`/`--color-black`;
  each name needs a NON-EMPTY replacement in the theme: `"colors"` needs `colors` (the schema accepts `colors: {}`), `"radius"` needs `borderRadius`,
  `"shadow"` needs `shadows` (cross-field check in `assertThemeOptions`, `src/core/themeOptionsChecks.ts`; `ZodError` at `resetTailwindDefaults.<i>`).
- A `themeAxes` variant must not be named `base` (reserved: `"base"` is the "no override" value of `ThemeAxesState`/`themeAxisAttributes`); an axis named `base` is fine.
- **Node code lives in `src/node/`** (`loadStyleGenConfig`, `resolveProjectPath`, `themeEmitter`, `watchThemeFile`, `resolvePluginTarget`, `writeFileAtomic`, `errorMessage`,
  `isPlainObject`) and is imported only by `src/cli/**`, `src/features/vite/**` and `src/features/next/**`; never from `src/core`,
  the browser-safe exports or the root barrel (it would leak `node:*`/chokidar into `dist/index.js`; `check:browser-safe` and `check:sizes` catch it).
  `resolveProjectPath(root, input, label, { allowOutsideRoot })` replaces the old `resolveSafePath`,
  normalises every path through `resolve(root, input)` (absolute ones too) and does NOT rewrite a leading `/`: `themePath`/`--theme` may be absolute or outside the root,
  `outDir`/`output`/`--out` must stay inside it. `generate()` is `prepareGenerate()` (validation) + `generateFromParsed()` (CSS only; `generate()` builds `tokens`/`schema` itself);
  the emitter calls the two separately to label the failing stage (`read`, `parse`, `options`, `theme`, `cross`, `generate`, `write`; the watcher adds `config`, `watch`).
- CLI (`src/cli/`): `run.ts` holds the command registry (`init`, `generate`, `doctor`, `schema`, `tokens`, `budget`),
  `runCli(args, cwd)` returns the exit code (0 ok/help/version/cancel, 1 failure, `budget` 2 for usage) and parses flags strictly per command;
  **commands never call `process.exit`** (only `src/cli/index.ts` assigns `process.exitCode`), so tests drive `runCli`/the command functions directly.
  `generate --watch` watches the theme AND the config file and keeps the last valid config when an edit is invalid.
  `init` detects the stack (`detectStack`: `nuxt.config.*` > `next.config.*` > `vite.config.*` > none,
  project root only) and only PRINTS the bundler snippet (`getBundlerSnippet` in `src/cli/templates.ts`,
  shown byte for byte in the README (Vite) and `documents/reference/cli.md` (Next.js, Nuxt); `src/cli/templates.test.ts` compares them);
  it never edits a bundler config and has scaffolded no generator script since 5.2.0; `init` drops the config keys a major removed while merging
  (`plugin` since 6.0.0, `extraSources`/`axes` since 7.0.0, the `extraSources` entries printed as `@source inline(...)` lines;
  `doctor` has no `Script` check). `budget` is the in-repo replacement for the removed `scripts/check-css-budget.mjs` (its `OK: …`/`OVER BUDGET: …` lines are a contract
  consumers grep).

## Testing

Vitest (Node env) with colocated `*.test.ts`; type tests in `*.test-d.ts` via `yarn test:types` (`expectTypeOf`);
integration tests in `src/__integration__/` compile through the real Tailwind engine; Playwright e2e via `yarn test:e2e`;
`yarn typecheck:dist` checks `dist/*.d.ts` and the `dist/*.d.cts` copies with `skipLibCheck: false`, but only under `module: ESNext` + Bundler resolution (never as CommonJS);
`require`-condition resolution is covered by `yarn check:types-pack` (attw, node16); `node scripts/vite-dev-smoke.mjs` runs `styleGenVite` under a real Vite dev server in two
scenarios (`createServer()` without `listen()` + `ssrLoadModule`, then `listen()` + a theme edit; the plugin sets `perEnvironmentStartEndDuringDev: true` and `buildStart` does the
emit). The design-system DX test (`yarn workspace design-system-example test`, needs `yarn build:all` because the package links `dist/*.d.ts`) type-checks
`examples/design-system/src/recipes/button.ts` against the real theme and against a copy with `danger` renamed, and asserts the diagnostic lands in that file;
the root `vitest.config.ts` excludes `examples/**`. The sample components have no test runner of their own:
`yarn workspace harness-example typecheck` compiles `examples/harness/tests/ui-types.tsx` (expect-error type test; needs `yarn build:all`).
Two example apps have a Storybook (`plain-react`, `plain-nuxt`; component stories only, `ui/**` per `.storybook/main.ts`; autodocs,
`yarn workspace <app>-example test:stories` runs the stories as Vitest browser tests; `storybook:build` builds it; stories use the app's own components, never raw Tailwind classes,
and each app's CSS has `@source not` for `*.stories.*`). The `plain-react` job of `ci.yml` (Storybook stories and the plain-vs-harness parity gate) is separate from `check` and
runs on drafts and documentation-only PRs; the `plain-nuxt` job (its stories, not a required check) runs alongside it. Layers and CI legs (including `tailwind-floor`, `node-floor`,
`peer-matrix` (decides the `vite`/`typescript` peer ranges) and `ui-peer-floor` (proves the floors of the UI-kit peer ranges); every leg must pass;
these 7 jobs are the heavy tier in `.github/workflows/ci-matrix.yml`: nightly on `main`, manual dispatch and PRs into `main`/`release/**`, not on PRs into `develop`;
it skips `documents/**`-only PRs and, on PRs, draft PRs, while `ci.yml` (`check`, `plain-react`, `e2e`) runs on every PR;
`check` and `plain-react` also run on drafts, `e2e` skips draft PRs and re-runs on `ready_for_review`): `documents/testing.md`.

## Publishing guards

- `yarn check:publish-target` (`prepublish` + `deploy.yml`) locks the registry to `npm.pkg.github.com`; `deploy.yml` also runs `yarn npm publish --dry-run` and asserts that host.
  Yarn Berry runs `prepublish`, not `prepublishOnly`, on `yarn npm publish`.
- `yarn check:externals` fails if any `dist/**/*.map` lists a peer/dependency under `node_modules/` (or a JS file ships without a map) or any entry but `./ui` reaches a UI peer;
  `yarn check:sizes` enforces gzip budgets incl. the `cli` bundle (`scripts/check-sizes.mjs`); `yarn check:browser-safe` keeps browser subpaths free of Node/Zod.
  Negative controls: `src/__integration__/publish-gates.test.ts`.
- `yarn check:types-pack` (`scripts/check-types-pack.mjs`; CI after `build:all`, and `deploy.yml` before publish) packs the package and runs
  `@arethetypeswrong/cli --profile node16` on the tarball, so every subpath must resolve to `.d.ts` under `import` and `.d.cts` under `require`.
- Only `@duydpdev` resolves to GitHub Packages; consumers need a PAT with `read:packages`.

## Project-Specific Workflow Rules

Read before any code/design work:

- `.claude/rules/agent-protocol.md` — request classification (plan required for complex code/design) and session start (read `lessons.md`, load the runtime skill for the task).
  The repo does not vendor agents, commands or skills.
- `.claude/rules/coding-standards.md` — TIER 0/1 rules; Socratic gate before complex changes.
- `.claude/rules/validation.md` — yarn gate before reporting done; **4-Phase plan protocol**; plan and phase templates.
  **NEVER write code before the user approves the plan.** Wait for explicit "ok"/"proceed"/"approved".
- `.claude/rules/lessons.md` — past mistakes; review at session start; append an entry on every user correction.

### Documentation layout

All project documentation lives under `documents/` (index: `documents/README.md`). This is the explicit docs route for every tool,
including the AgentKit `ak:docs` skill (also set in `.agentkit/config.yaml` → `paths.docs: documents`). Never create a root `docs/` or root `plans/` directory.

```text
documents/
├── README.md                     # index of everything below
├── architecture.md guide.md testing.md deploy.md components.md cookbook.md   # rendered by the site
├── getting-started/  reference/  # rendered by the site (site/src/lib/docs-meta.json)
├── vi/                           # Vietnamese twin of every rendered doc (yarn check:docs-i18n)
├── migration/                    # upgrade guides + v4 measurement proofs
├── standards/                    # cross-repo standards (git-workflow-app.md)
├── brainstorm/YYYY-MM-DD/<topic>.md
└── plans/
    ├── YYYY-MM-DD/<plan-slug>/   # plan.md + phase-NN-<name>.md (+ reports/)
    ├── reports/                  # reports that belong to no plan
    └── journals/YYYY-MM-DD-<slug>.md
```

- Plans: one directory per plan under the creation date; `plan.md` holds the phase table and status; no per-day `task.md`.
  On completion flip `[ ]` → `[x]` in the phase file and update the phase row in `plan.md` immediately. Materialize the plan directory even when the user supplies the plan inline.
- Brainstorm: `documents/brainstorm/YYYY-MM-DD/<topic>.md` (an advise `-state.md` file sits next to its report); no per-day `session.md`.
- Journals and standalone reports are written by AgentKit into `documents/plans/journals/` and `documents/plans/reports/`.
- `documents/plans/` and `documents/brainstorm/` are git-ignored local working directories: they are never committed or published, so plan bookkeeping (checkbox flips,
  phase tables) is local and needs no commit.
- **Relative paths only** — no absolute paths in docs.

### ESM gotcha

`package.json` is `"type": "module"`. Ad-hoc Node scripts must use `import` syntax, or use `.cjs` extension — `require()` in a `.js` file throws
`ReferenceError: require is not defined in ES module scope`.
