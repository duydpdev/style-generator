# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@duydpdev/style-generator` — TypeScript library + CLI that compiles a theme JSON into Tailwind CSS **v4** utilities via a single `generate()` call: a CSS string (`@theme inline` variables, `themeAxes` overrides, registry-generated `@source inline` utility coverage), typed design tokens, and a JSON Schema. **Tailwind v4 only** — no v3 support, no version auto-detection. ESM-first (`"type": "module"`) with CJS interop.

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
yarn test:e2e       # Playwright (Chromium + WebKit) — spacing inheritance, compiled CSS
yarn vitest run src/features/registry/generateSourceInline.test.ts   # Single file

# Quality
yarn lint           # ESLint, --max-warnings 0, --report-unused-disable-directives
yarn lint:fix
yarn prettier:check # CI gate (check mode); yarn prettier only prints, yarn prettier:fix writes
yarn tsc --noEmit   # Type check
yarn check:externals && yarn check:sizes && yarn check:browser-safe && yarn check:publish-target   # publish gates (also run by prepublish + CI)
yarn site:build     # lib build + landing site (renders documents/*.md)
```

The gate a task must pass before it is reported done lives in `.claude/rules/validation.md`.

Pre-commit (Husky): lint-staged (staged files only) → tsc --noEmit → vitest run. Yarn Berry never runs `prepare`, so Husky is installed via `postinstall: husky` (verify with `git config core.hooksPath` → `.husky/_`). `pinst` (`prepack: pinst --disable`, `postpack: pinst --enable`) renames `postinstall` to `_postinstall` inside the published tarball so consumers never run Husky. Release CI sets `HUSKY=0`.

## Commit Convention

Custom format `[type] subject`, lowercase type (NOT conventional-commits `type:`), parsed by `release.config.cjs`:

| Type                                               | Release |
| -------------------------------------------------- | ------- |
| `[release]`                                        | major   |
| `[feat]`                                           | minor   |
| `[fix]` `[perf]` `[revert]` `[style]` `[refactor]` | patch   |
| `[chore]` `[docs]` `[test]` `[build]` `[ci]`       | none    |

`[conf]` `[temp]` `[wip]` are valid, no release. Features are cut from `main` and land twice, both as merge commits (never squash): a PR into `develop` (pre-release `DEV` dist-tag), then, once approved, a PR from the same branch into `main` (stable). Each merge triggers Semantic Release → tag → publish to **GitHub Packages** (`npm.pkg.github.com`, scope `@duydpdev`, private); the release type comes from the feature's commit headers. Every push to `main` back-merges to `develop`. Details: `documents/deploy.md`.

## Architecture

```text
theme.json → generate(theme, options) → { css, tokens, schema }
```

`generate()` (`src/core/generate.ts`) always re-validates `theme` against `ThemeSchema` (a Zod `strictObject` with `.superRefine()` alias/injection checks — unknown keys throw a `ZodError`), then returns `css` (written to a file and `@import`ed next to `@import "tailwindcss";`), `tokens` (typed `DesignTokens.Web.*`, also `createDesignTokens()` from `./tokens`) and `schema` (`z.toJSONSchema(ThemeSchema)`).

Pipelines, all driven by the category registry:

1. **registry** (`src/features/registry/`) — `builtInCategories.ts` declares one `TokenCategoryDescriptor` per category (`colors`, `typography`, `shadows`, `backDropBlurs`, `borderRadius`, `fontFamily`, `borderWidth`); `generateSourceInline.ts` emits one `@source inline(...)` per category.
2. **theme-css** (`src/features/theme-css/`) — `:root` `--sg-*` vars, `html[data-<axis>="<variant>"]` overrides, `@theme inline` mapping; `generateBorderWidthCss.ts` (explicit `@utility border-*-<key>`), `generateScreensCss.ts` (custom breakpoints).
3. **tokens**, **typography** (`@utility <kebab-key>`), **spacing** (`.sp-*` utilities over `var(--sg-sp-*)`), **cva**, **vite**, **next** under `src/features/`.

`DEFAULT_BREAKPOINTS = ["md", "lg"]` (`src/shared/defaultOption.ts`) is the single fallback for `@source inline` variants, spacing `@media` chains and `DesignTokens.Web.breakpoints` when `options.breakpoints` is unset. Why `md`/`lg` only: the pre-v4 baseline (`documents/migration/v4-baseline-classes.txt`) emitted only `md:`/`lg:` and the consumer passes `[Breakpoint.MD, Breakpoint.LG]`; defaulting to every `screens` key advertised breakpoints no `@source inline` line covered. `src/shared/safelistProperties.ts` holds the `roundedProperties`/`borderProperties` class-prefix lists (legacy filename).

Build outputs: `dist/{index,tokens,cva,spacing,types,vite,next}.{js,cjs,d.ts}` (7 subpaths, Vite lib multi-entry) + `dist/cli/index.mjs` (tsdown). Shared hashed chunks are internal. Only `dist/` is published, `"sideEffects": false`; gzip budgets in `scripts/check-sizes.mjs`.

Source layout, public exports per subpath and CLI commands: `documents/architecture.md`. Internal helpers (`toCamelCase`, `toPascalCase`, `toKebabCase`) are not exported from any barrel. Breaking changes from 3.x: `documents/migration/3.x-to-4.0.md`.

## Theme / Color Rules (current v4 API)

- `colors` is the only **required** field in `ThemeConfig`; all others (`typography`, `shadows`, `backDropBlurs`, `borderRadius`, `fontFamily`, `borderWidth`, `themeAxes`) are optional.
- Colors are a **flat camelCase** object. Nested color objects and `DEFAULT` key are unsupported.
- Key conversion: camelCase → kebab-case CSS vars/classes. Letter→digit boundary adds a dash (`blue500` → `blue-500`); digit-prefix tokens preserved (`2xl`). Keys that collide once kebab-cased (`blue500`/`blue-500`) are rejected. **`_` and a leading uppercase run (`CTA`, `ABtn`) are rejected in every token-name position**: the camelCased token would map to a class the registry never emits. `formatZodError` prints the hint on the path.
- `themeAxes: Record<axisName, Record<variantName, ThemeOverride>>` — independent axes (e.g. `theme.dark` and `palette.forest` at once), each activated via `html[data-<axis-kebab>="<variant-kebab>"]`. Selectors are pinned to `html` because a `$`-alias `var()` resolves where the custom property is declared (`:root`). Blocks emit after `:root` in declaration order, so for a token overridden by two axes the axis declared **last** wins.
- An override key must already exist in the matching base category — override-only keys are rejected (they would produce no utility).
- Axis and variant names must NOT be canonical integers (`/^(0|[1-9]\d*)$/`) — JS enumerates integer-like keys first, which would silently invert "last declared wins". `007`/`2xl` are fine.
- Alias `"$<key>"` resolves within the SAME category to `var(--sg-<key>)`; existence and acyclicity are validated at parse time. Use the raw key (`$blue500`, not `$blue-500`). Not supported inside `typography`.
- `COLOR_STATES` (`["hover", "active"]`, `src/shared/colorStates.ts`) is the single state list for the registry's `@source inline` state lines and `createVariantMapper(prefix, tokens, { states: COLOR_STATES })`. Sibling detection uses camelCased keys (`primary-hover` ≡ `primaryHover`); states emit kebab-cased (`focusVisible` → `focus-visible:`).
- A theme key whose class equals a Tailwind _static_ utility (`bg-none`, `border-2`, typography `text-sm`, …) is not rejected, but Tailwind picks the winner — rename it (`clear`, `flat`, `zero`). `style-gen doctor` warns on known collisions (`src/cli/commands/utilityCollisions.ts`).
- `fontFamily` keys must not kebab-case to a font-_weight_ name (`thin` … `black`) — both share the `font-` prefix.
- `borderWidth` replaces `border` (omitted → Tailwind's `border-0/1/2/4`); a key sharing a color's `border-*` class (`thinLine`/`thin-line`) is invalid.
- `generate()` validates options: `breakpoints`/`screens`/`spacing.properties` keys use the key grammar. `extraSources`: non-empty, ≤512 chars, no `"'\;@<>`/line break.

## Testing

Vitest (Node env) with colocated `*.test.ts`; type tests in `*.test-d.ts` via `yarn test:types` (`expectTypeOf`); integration tests in `src/__integration__/` compile through the real Tailwind engine; Playwright e2e via `yarn test:e2e`. Layers and CI legs (including `tailwind-floor`): `documents/testing.md`.

## Publishing guards

- `yarn check:publish-target` (`prepublish` + CI) locks the registry to `npm.pkg.github.com`; CI also runs `yarn npm publish --dry-run` and asserts that host. Yarn Berry runs `prepublish`, not `prepublishOnly`, on `yarn npm publish`.
- `yarn check:externals` fails if `dist/` inlines a peer/dependency; `yarn check:sizes` enforces gzip budgets (`scripts/check-sizes.mjs`); `yarn check:browser-safe` keeps browser subpaths free of Node/Zod.
- Only `@duydpdev` resolves to GitHub Packages; consumers need a PAT with `read:packages` + repo access.

## Project-Specific Workflow Rules

Read before any code/design work:

- `.claude/rules/agent-protocol.md` — request classification (plan required for complex code/design) and session start (read `lessons.md`, load the runtime skill for the task). The repo does not vendor agents, commands or skills.
- `.claude/rules/coding-standards.md` — TIER 0/1 rules; Socratic gate before complex changes.
- `.claude/rules/validation.md` — yarn gate before reporting done; **4-Phase plan protocol**; plan and phase templates. **NEVER write code before the user approves the plan.** Wait for explicit "ok"/"proceed"/"duyệt".
- `.claude/rules/lessons.md` — past mistakes; review at session start; append an entry on every user correction.

### Documentation layout

All project documentation lives under `documents/` (index: `documents/README.md`). This is the explicit docs route for every tool, including the AgentKit `ak:docs` skill (also set in `.agentkit/config.yaml` → `paths.docs: documents`). Never create a root `docs/` or root `plans/` directory.

```text
documents/
├── README.md                     # index of everything below
├── architecture.md guide.md testing.md deploy.md   # rendered by the site (documents/*.md)
├── migration/                    # upgrade guides + v4 measurement proofs
├── standards/                    # cross-repo standards (git-workflow-app.md)
├── brainstorm/YYYY-MM-DD/<topic>.md
└── plans/
    ├── YYYY-MM-DD/<plan-slug>/   # plan.md + phase-NN-<name>.md (+ reports/)
    ├── reports/                  # reports that belong to no plan
    └── journals/YYYY-MM-DD-<slug>.md
```

- Plans: one directory per plan under the creation date; `plan.md` holds the phase table and status; no per-day `task.md`. On completion flip `[ ]` → `[x]` in the phase file and update the phase row in `plan.md` immediately. Materialize the plan directory even when the user supplies the plan inline.
- Brainstorm: `documents/brainstorm/YYYY-MM-DD/<topic>.md` (an advise `-state.md` file sits next to its report); no per-day `session.md`.
- Journals and standalone reports are written by AgentKit into `documents/plans/journals/` and `documents/plans/reports/`.
- **Relative paths only** — no absolute paths in docs.

### ESM gotcha

`package.json` is `"type": "module"`. Ad-hoc Node scripts must use `import` syntax, or use `.cjs` extension — `require()` in a `.js` file throws `ReferenceError: require is not defined in ES module scope`.
