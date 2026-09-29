# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@duydpdev/style-generator` — TypeScript library + CLI that compiles a theme JSON into Tailwind CSS **v4** utilities via a single `generate()` call: a CSS string (`@theme inline` variables, dark-mode overrides, registry-generated `@source inline` utility coverage), typed design tokens, and a JSON Schema. **Tailwind v4 only** — no v3 support, no version auto-detection. ESM-first (`"type": "module"`) with CJS interop.

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
yarn build:cli      # tsdown bundle of CLI → dist/cli/index.mjs (with node shebang)
yarn build:all      # Both

# Test
yarn test           # Vitest run, unit (*.test.ts)
yarn test:watch     # Watch mode
yarn test:coverage  # v8 coverage; excludes test files and dist/
yarn test:types     # vitest typecheck — runs *.test-d.ts (expectTypeOf)
yarn vitest run src/features/registry/generateSourceInline.test.ts   # Single file

# Quality
yarn lint           # ESLint, --max-warnings 0, --report-unused-disable-directives
yarn lint:fix
yarn prettier:check   # CI gate (check mode); yarn prettier only prints, yarn prettier:fix writes
yarn tsc --noEmit   # Type check
```

Pre-commit (Husky + lint-staged): eslint → prettier → tsc --noEmit → vitest run. Yarn Berry never runs `prepare`, so Husky is installed via `postinstall: husky` (verify with `git config core.hooksPath` → `.husky/_`). `pinst` (`prepack: pinst --disable`, `postpack: pinst --enable`) renames `postinstall` to `_postinstall` inside the published tarball so consumers never run Husky. Release CI sets `HUSKY=0`.

## Commit Convention

Custom format `[type] subject` (NOT standard conventional-commits prefix):

| Type                                         | Release |
| -------------------------------------------- | ------- |
| `[feat]`                                     | minor   |
| `[fix]` `[perf]` `[style]` `[refactor]`      | patch   |
| `[chore]` `[docs]` `[test]` `[build]` `[ci]` | none    |

Merges to `main` (stable) or `develop` (pre-release `DEV` dist-tag) trigger Semantic Release → tag → publish workflow to **GitHub Packages (`npm.pkg.github.com`, scope `@duydpdev`, private)**. Stable release on `main` back-merges to `develop`.

## Architecture

### Core Flow

```text
theme.json → generate(theme, options) → { css, tokens, schema }
```

`generate()` (`src/core/generate.ts`) always re-validates `theme` against `ThemeSchema` first (a Zod `strictObject` — unknown keys throw a `ZodError`), then returns:

- `css` — the full generated CSS string: `:root` `--sg-*` intermediate vars, `html[data-<axis>="<variant>"]` `themeAxes` overrides, `@theme inline` mapping, typography/border-width/spacing `@utility` blocks, and one `@source inline(...)` directive per token category (+ `extraSources`). Written to a file and `@import`ed next to `@import "tailwindcss";`.
- `tokens` — typed `DesignTokens.Web.*` (also available standalone via `createDesignTokens()`/`./tokens`).
- `schema` — `z.toJSONSchema(ThemeSchema)`, the same JSON Schema the CLI `schema` command writes for editor autocomplete.

Only `colors` is required in `ThemeConfig`. All other fields (`typography`, `shadows`, `backDropBlurs`, `borderRadius`, `fontFamily`, `borderWidth`, `themeAxes`) are optional — the lib handles `undefined` gracefully with `?? {}`/fallback-default guards.

`generate()` composes several registry-driven pipelines:

1. **registry** (`src/features/registry/`) — `builtInCategories.ts` declares one `TokenCategoryDescriptor` per category (`colors`, `typography`, `shadows`, `backDropBlurs`, `borderRadius`, `fontFamily`, `borderWidth`); `flattenByCategory.ts` turns a category's theme data into `--sg-*` vars (resolving `$key` aliases to `var(--sg-<key>)`); `generateSourceInline.ts` walks every descriptor and emits `@source inline("{<bp>:,}{<classPrefixes>}-{<keys>}")` — this replaced the old static safelist, so `bg-primary`/`text-primary`/`border-primary` etc. are always available, not just classes referenced in scanned source.
2. **theme-css** (`src/features/theme-css/`) — `generateThemeCss.ts` builds the `:root`/`html[data-<axis>="<variant>"]`/`@theme inline` blocks generically from `builtInCategories`; `generateBorderWidthCss.ts` emits explicit `@utility border(-x/y/t/r/b/l)?-<key> { border-*-width: var(--sg-border-width-<key>); }` per declared `borderWidth` key (Tailwind v4 has no `@theme` namespace for border width); `generateScreensCss.ts` handles custom breakpoints.
3. **tokens** (`src/features/tokens/`) — `createDesignTokens()`: theme JSON → typed `DesignTokens.Web.*` (consumed by `createVariantMapper`).
4. **typography** (`src/features/typography/`) — named text styles → `@utility <kebab-key>` blocks (the class name is the key's own kebab-case form, e.g. `text12Mono` → `.text-12-mono`, not a `text-` prefix applied to it).
5. **spacing** (`src/features/spacing/`) — `resolveSpacingProps()` maps spacing props to `{ classNames, style }`; runtime emits `.sp-*` utilities consuming `var(--sg-sp-*)` chains instead of a class safelisted per axis × size × breakpoint.

**Aliases**: a category value of the form `"$<key>"` (matching `^\$<TokenKey>$`, the raw key — not its kebab-case form) resolves to `var(--<cssVarPrefix>-<kebab-target>)` instead of being emitted literally — e.g. `shadows.card: "$base"` → `var(--sg-shadow-base)`. `ThemeSchema`'s `.superRefine()` validates the target exists (every base key of that category — a `themeAxes.<axis>.<variant>` override's own keys are always a subset of the base keys, see Theme/Color Rules) and the alias graph is acyclic (DFS) before any CSS is generated. Aliases are not supported inside `typography` (a `$`-prefixed typography value is rejected at parse time).

**Default breakpoints**: one shared constant, `DEFAULT_BREAKPOINTS = ["md", "lg"]` (`src/shared/defaultOption.ts`), is what `generateSourceInline` (responsive `@source inline` variants), `generateSpacingCss` (spacing `@media` chains) and `createDesignTokens` (`DesignTokens.Web.breakpoints`) all fall back to when `options.breakpoints` is unset. It is `["md","lg"]` — not every `screens` key — because (a) the v3 baseline emitted only `md:` and `lg:` variants (`docs/migration/v4-baseline-classes.txt`: 89 `md:`, 89 `lg:`, zero `sm:`/`xl:`/`2xl:`), and (b) the consumer app passes exactly `[Breakpoint.MD, Breakpoint.LG]`. Previously `createDesignTokens` defaulted to all five `screens` keys, so `DesignTokens.Web.breakpoints` advertised variants (`sm:`, `xl:`, `2xl:`) that no `@source inline` line covered. Override via `options.breakpoints`.

### Source Layout

- `src/core/` — `generate.ts` (main entry), `defineTheme`/`defineOptions` (`defineTheme.ts`, zero-runtime type-safe helpers), `Options.ts` (`StyleGeneratorOptions`, `Breakpoint`), `themeSchema.ts` (`ThemeConfig`/`ThemeOverride`, the Zod schema + alias/injection-safety refinements), `inference.ts`/`designTokensTypes.ts` (+ `*.test-d.ts` for `DesignTokens.Web.*` / `ColorVariant<T>` etc. shape inference).
- `src/features/{registry,theme-css,tokens,typography,cva,spacing,vite,next}/`
- `src/shared/` — `defaultOption.ts` (`DEFAULT_*` fallbacks), `helpers.ts` (case conversion), `safelistProperties.ts` (`roundedProperties`/`borderProperties` — category `classPrefixes` lists; name predates the safelist removal), `colorStates.ts` (`COLOR_STATES`), `resolveSafePath.ts` (path-escape guard for the Vite/Next plugins), `writeFileAtomic.ts` (temp file + rename; used by the CLI `generate`, `styleGenVite` and `styleGenNext` so a bundler never reads a half-written `theme.css`).
- `src/cli/` — `commands/` (`init`, `generate`, `doctor`, `schema`), `config.ts`, `templates.ts`, `logger.ts`.
- `src/exports/` — one file per public subpath (`index.ts`, `tokens.ts`, `cva.ts`, `spacing.ts`, `types.ts`, `vite.ts`, `next.ts`).
- `src/index.ts` — public API (root `.` subpath barrel).
- `examples/` — sample theme configs + working consumer apps (`react-v4`, `next-v4`, `nuxt-v4`).

### Key Exports (public API)

```typescript
// Core (root ".")
generate(); // Main — { css, tokens, schema } from a Zod-validated theme
defineTheme(); // Zero-runtime type-safe theme helper (throws ZodError on invalid input)
defineOptions(); // Zero-runtime type-safe options helper
createDesignTokens(); // Typed DesignTokens.Web.* (also at "./tokens", browser-safe)
generateThemeCss(); // :root vars + @theme inline mapping (generate() calls this internally too)

// Helpers
createVariantMapper(); // "./cva" — (prefix, tokens) -> Record<token, class>, OR (prefixes[], tokens) -> nested map; always kebab-cases like the registry
resolveSpacingProps(); // "./spacing" — spacing props -> { classNames, style }
resolveSpacing(); // "./spacing" — single spacing prop -> { className, style }
styleGenVite(); // "./vite" — Vite plugin, writes theme.css on dev start/build/theme.json change
styleGenNext(); // "./next" — Next.js config wrapper, writes theme.css on config evaluation (webpack + Turbopack, no `next` peer dep)

// Constants
Breakpoint; // Enum: SM, MD, LG, XL, XXL
defaultScreens; // Default screen widths map
DEFAULT_ROUNDED_VALUES; // Default rounded-value fallbacks
DEFAULT_BORDER_VALUES; // Default border-width fallbacks (also DesignTokens.Web.borderWidthOption's default)
DEFAULT_SPACING_PROPERTIES; // Default spacing property -> CSS declaration map
roundedProperties; // borderRadius category's classPrefixes ("rounded", "rounded-t", ...)
borderProperties; // borderWidth category's classPrefixes ("border", "border-x", ...)

// Types ("./types")
ThemeConfig; // Parsed/validated theme shape
ThemeOverride; // Partial per-axis-variant override shape (themeAxes.<axis>.<variant>)
TypographyConfig; // A single typography variant's style shape
StyleGeneratorOptions; // generate()'s second argument
ColorVariant<T>; // Semantic variant unions derived from a theme's own keys —
TextVariant<T>; // one per CSS-var/typography category:
ShadowVariant<T>; // colors, typography, shadows, backDropBlurs,
BackdropBlurVariant<T>; // fontFamily, borderWidth, borderRadius
FontFamilyVariant<T>;
BorderWidthVariant<T>;
RoundedVariant<T>;
```

Removed relative to 3.x (full before/after tables in `docs/migration/3.x-to-4.0.md`): the JS Tailwind plugin API and Tailwind v3 support/version detection, the safelist (generator, `safelist.txt`, CLI command), nine module options (replaced by declaring the category in `theme.json` + the new `extraSources: string[]` option for runtime-built class names Tailwind's static scan can't see), and `createVariantMapper`'s third boolean argument (classes are always kebab-cased now).

Internal helpers (`toCamelCase`, `toPascalCase`, `toKebabCase`, `extractData`, `addDot`) are not part of public API — not exported from any barrel.

### CLI Tool (`style-gen`)

Built separately by `tsdown` to `dist/cli/index.mjs` (bin entry). Commands: `init` (scaffold theme + plugin file, interactive or `--dark`), `generate [--watch]` (validate theme, write `theme.css`; `--watch` via `chokidar` — replaced the old `safelist` command), `doctor` (validate config + theme parse), `schema` (write `theme.schema.json` from `z.toJSONSchema(ThemeSchema)`, for editor autocomplete). Config resolution order: **CLI flags → `style-gen.config.json` → `package.json["style-gen"]` → built-in defaults**.

`doctor` also prints `⚠️` warnings (never errors, exit code unchanged — `src/cli/commands/utilityCollisions.ts`) for schema-valid keys that collide with a Tailwind static utility: `none` in `colors`/`shadows`/`backDropBlurs`/`borderRadius`; digit-only `borderWidth` keys (`border-2`); `typography` keys whose kebab form is `text-{xs…9xl,left,center,right,justify,start,end,wrap,nowrap,balance,pretty,ellipsis,clip}`; `colors` keys `transparent`/`current`/`inherit`. `themeAxes` overrides need no separate check (an override key must already exist in the base theme).

### Build Outputs

- `dist/{index,tokens,cva,spacing,types,vite,next}.{js,cjs,d.ts}` — 7 subpaths, Vite lib multi-entry via `vite-plugin-dts`.
- Shared helper chunks (`helpers-*`, `defaultOption-*`, `resolveSafePath-*`, `generate-*`) — internal, not part of public `exports` map.
- `dist/cli/index.mjs` — CLI executable.
- Only `dist/` is published. `"sideEffects": false` in package.json enables tree-shaking.
- Size budget enforced by `yarn check:sizes` (gzip limits per chunk in `scripts/check-sizes.mjs`). `docs/migration/3.x-subpath-exports.md` keeps a historical 3.x snapshot; `docs/migration/3.x-to-4.0.md` covers the 4.0.0 breaking changes.

## Theme / Color Rules (current v4 API)

- `colors` is the only **required** field in `ThemeConfig`, which is a Zod `strictObject` — unknown keys throw a `ZodError`. All others (`typography`, `shadows`, `backDropBlurs`, `borderRadius`, `fontFamily`, `borderWidth`, `themeAxes`) are optional.
- Colors are a **flat camelCase** object. Nested color objects and `DEFAULT` key are unsupported.
- Key conversion: camelCase → kebab-case CSS vars/classes. Letter→digit boundary adds a dash (`blue500` → `blue-500`); digit-prefix tokens preserved (`2xl`). Two keys that collide once kebab-cased (e.g. `blue500`/`blue-500`) are rejected at parse time. Key grammar is letters, digits and `-` only: **`_` is rejected in every token-name position** (colors, typography, shadows, …, axis and variant names) because `toKebabCase` keeps `_` (`bg-primary_active`) while the typed tokens camelCase it (`primaryActive`), so the mapper would emit a class that does not exist. Use camelCase or kebab-case. Zod reports a bad record key as `invalid_key`, so `formatZodError` prints `Invalid key in record`; the camelCase/kebab hint is only on the nested `issues[0].message`.
- `themeAxes: Record<axisName, Record<variantName, ThemeOverride>>` holds named overrides on one or more independent axes (e.g. `theme: { dark: {...} }` and `palette: { forest: {...}, sunset: {...} }` at once). Each variant activates via `html[data-<axis-kebab>="<variant-kebab>"]` (e.g. `html[data-theme="dark"]`, `html[data-palette="forest"]`) — selectors are pinned to `html` because a `$`-alias `var()` resolves to the value computed at the element that DECLARES the custom property (`:root`), so an override on a non-root element would never affect an alias's inherited value; multiple axes' blocks emit after `:root`, in config declaration order (both axis and variant order), so when two axes override the same token the axis declared LAST in `theme.json` wins the cascade. A theme still using the removed single-axis `themes` key is rejected with a rename hint (`"themes" was renamed to "themeAxes"; move themes.<name> to themeAxes.theme.<name>`) instead of a generic unrecognized-key error.
- Alias sigil `"$<key>"` (e.g. `primary: "$blue500"`) resolves within the SAME category to `var(--sg-<key>)`; validated for existence and acyclicity at parse time (see Core Flow above). The target must be the raw key (`$blue500`), not its kebab-case form (`$blue-500` is rejected even though both kebab-case to `blue-500`). Not supported inside `typography`.
- A `themeAxes.<axis>.<variant>` override key must already exist in the matching base category record — an override-only key (e.g. `themeAxes.theme.dark.colors.background` with no base `colors.background`) is rejected at parse time, since it never maps into `@theme inline`/`@utility` output and would produce no utility.
- `themeAxes` axis and variant names must NOT be canonical integers (`/^(0|[1-9]\d*)$/`, e.g. `100`, `2024`) — `ThemeSchema` rejects them because JS enumerates integer-like object keys first (ascending) regardless of the order written in `theme.json`, which would silently invert the declaration-order ("last declared wins") precedence. Use `contrast100`/`c100` instead. Digit-leading non-canonical names (`007`, `2xl`) are fine.
- `COLOR_STATES` (`["hover", "active"]`, `src/shared/colorStates.ts`) is the single source for the state list: the registry's `colorsCategory.states` (→ `@source inline` state lines) and consumers' `createVariantMapper(prefix, tokens, { states: COLOR_STATES })` must both use it. It is exported from `.`, `./tokens` and `./cva` (browser-safe, no Zod). Sibling detection in both places runs on camelCased keys (`primary-hover` ≡ `primaryHover`), exactly what `createDesignTokens` hands the mapper. State names are emitted kebab-cased in both places (`focusVisible` → `focus-visible:`), while the sibling lookup keeps the Pascal-cased state (`primary` + `primaryFocusVisible`).
- Built-in name clashes: a theme key whose class equals a Tailwind _static_ utility (`bg-none`, `border-none`, `shadow-none`, `backdrop-blur-none`, `border-2`, typography `text-sm`, …) is not rejected, but which rule wins is decided by Tailwind's own utility implementation — additive, theme-wins, built-in-wins, or invalid CSS depending on the utility — not by the theme; give such keys a different name (`clear`, `flat`, `zero`) instead of relying on the cascade.
- `fontFamily` keys must not kebab-case to a Tailwind font-_weight_ utility name (`thin`, `extralight`, `light`, `normal`, `medium`, `semibold`, `bold`, `extrabold`, `black`) — both font-family and font-weight utilities share the `font-` class prefix.
- `borderWidth` replaces the old `border` module option — declare named widths in `theme.json`; the library emits `@utility border(-x/y/t/r/b/l)?-<key>` for all 7 side prefixes. Configs written against the old `border` option must rename the key to `borderWidth`. Omitting `borderWidth` entirely falls back to Tailwind's own built-in scale (`border-0/1/2/4`) via `@source inline`, with no custom CSS.
- Every category emits its own `@source inline(...)` directive (registry-generated, replacing the removed static safelist) — so `bg-`/`text-`/`border-*` color utilities are always available, even ones never referenced in scanned source. Runtime-built class names Tailwind's static scan can't see (e.g. a template-literal class) go through the `extraSources: string[]` option instead, validated by `generate()` (non-empty, ≤512 chars, no `"`, `'`, `\`, `;`, `@`, `<`, `>`, or line break).

## Testing Approach

- Unit tests: Vitest (Node env), colocated `*.test.ts`.
- Type tests: `*.test-d.ts` via `yarn test:types` — use `expectTypeOf`.
- Coverage: v8, excludes test files and `dist/`.

## Release Workflow

1. PRs merge to `develop` (pre-release, `DEV` dist-tag) or `main` (stable).
2. Semantic Release creates version tag + updates `CHANGELOG.md` (custom `changelog-template.hbs`).
3. Tag triggers publish to **GitHub Packages** (`npm.pkg.github.com`, scope `@duydpdev`, private). Auth uses the built-in `GITHUB_TOKEN` (no external `NPM_TOKEN`). `release.yml` grants `packages: write` so the reusable `deploy.yml` token can publish.
4. Stable release on `main` back-merges to `develop`.

> Publish target locked by `yarn check:publish-target` (runs in `prepublish` and CI). CI also runs `yarn npm publish --dry-run` and grep-asserts `npm.pkg.github.com` before real publish. `GITHUB_TOKEN` is mapped to `YARN_NPM_AUTH_TOKEN` in the workflow so yarn berry auths correctly. Only the `@duydpdev` scope resolves to GitHub Packages; the global registry stays `registry.npmjs.org` for normal dependency installs. Consumers need a PAT with `read:packages` + repo access. (Yarn Berry runs `prepublish`, not `prepublishOnly`, on `yarn npm publish`.)
> Bundle hygiene locked by `yarn check:externals` (`prepublish` + CI) — fails if `dist/` ever inlines a peer/dependency.
> CI also runs a `tailwind-floor` leg (`ci.yml`) that re-resolves the Tailwind packages to `~4.1.0` via `resolutions` in the runner's checkout only, then runs `yarn test` + `yarn test:e2e`, so the published peer floor `tailwindcss >=4.1.0` is exercised and not just the lockfile's 4.3.x.

## Project-Specific Workflow Rules

Read before any code/design work — these encode mandatory workflow (enforced via `lessons.md`):

- `.claude/rules/agent-protocol.md` — request classification, agent boundaries, file ownership (`**/*.test.*` → `test-engineer`, `**/components/**` → `frontend-specialist`, etc.).
- `.claude/rules/coding-standards.md` — TIER 0/1/2 rules; Socratic gate before complex changes.
- `.claude/rules/validation.md` — **4-Phase plan protocol** (ANALYSIS → PLANNING → SOLUTIONING → IMPLEMENTATION). **NEVER write code before user approves the plan file.** Wait for explicit "ok"/"proceed"/"duyệt".
- `.claude/rules/lessons.md` — past mistakes; review at session start; append a new entry on every user correction.

### Plan files (mandatory for any non-trivial task)

- Path: `docs/plans/YYYY-MM-DD/XX-task-name.md`. `XX` resets to `01` each new date.
- Each date dir also needs `task.md` listing ordered tasks for the day.
- Follow the template in `.claude/rules/lessons.md` (Overview / Project Type / Success Criteria / Task Breakdown).
- **Relative paths only** — no absolute paths in docs.
- On task completion: flip `[ ]` → `[x]` in BOTH the plan file and `task.md` immediately.
- Even if the user provides the plan inline in the prompt, still materialize the plan file before implementing.

### Brainstorm files

Mirror the plans layout: `docs/brainstorm/YYYY-MM-DD/XX-topic.md` + `session.md` per date.

### ESM gotcha

`package.json` is `"type": "module"`. Ad-hoc Node scripts must use `import` syntax, or use `.cjs` extension — `require()` in a `.js` file throws `ReferenceError: require is not defined in ES module scope`.
