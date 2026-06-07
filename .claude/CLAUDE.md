# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@duydpdev/style-generator` — TypeScript library + CLI that generates Tailwind CSS utilities (plugin, safelist, `@theme inline` CSS, typed design tokens) from a theme JSON. Supports Tailwind CSS **v3 and v4** (auto-detected via `detectTailwindVersion`, overridable with `tailwindVersion`). ESM-first (`"type": "module"`) with CJS interop.

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
yarn vitest run src/features/plugin/cssVariables.test.ts   # Single file

# Quality
yarn lint           # ESLint, --max-warnings 0, --report-unused-disable-directives
yarn lint:fix
yarn prettier / yarn prettier:fix
yarn tsc --noEmit   # Type check
```

Pre-commit (Husky + lint-staged): eslint → prettier → tsc --noEmit → vitest run.

## Commit Convention

Custom format `[type] subject` (NOT standard conventional-commits prefix):

| Type                                         | Release |
| -------------------------------------------- | ------- |
| `[feat]`                                     | minor   |
| `[fix]` `[perf]` `[style]` `[refactor]`      | patch   |
| `[chore]` `[docs]` `[test]` `[build]` `[ci]` | none    |

Merges to `main` (stable) or `develop` (pre-release `DEV` dist-tag) trigger Semantic Release → tag → publish workflow to **npm (`registry.npmjs.org`, public access)**. Stable release on `main` back-merges to `develop`.

## Architecture

### Core Flow

```text
theme.json → createStyleSystem(theme, options) → { plugin, safelist, themeCss, DesignTokens }
```

Only `colors` is required in `ThemeConfig`. All other fields (`typography`, `shadows`, `borderRadius`, `border`, `themes`, `backDropBlurs`) are optional — the lib handles `undefined` gracefully with `?? {}` guards.

`src/core/createStyleSystem.ts` composes three feature pipelines:

1. **tokens** (`src/features/tokens/`) — raw theme JSON → typed design tokens (consumed by CVA helpers).
2. **plugin** (`src/features/plugin/`) — Tailwind plugin producing CSS variables; v3 vs v4 auto-detected. For v4 also emits **`themeCss`**: a string containing `:root` `--sg-*` intermediate vars, `[data-theme="…"]` override blocks, and an `@theme inline` mapping `--sg-*` → `--color-*` (gives v4 auto-utilities like `bg-primary` without safelist). The `--sg-*` intermediate layer exists to break circular reference when theme switching — consumers use standard Tailwind classes/vars (`bg-primary`, `var(--color-primary)`), never `--sg-*` directly.
3. **safelist** (`src/features/safelist/`) — class safelist for tokens. **Spacing is intentionally excluded** (CSS-var strategy — see below). Color classes excluded by default (`safelistColors: false`).

Other feature modules:

- `src/features/cva/` — `createVariantMapper` handles camelCase → kebab-case key conversion.
- `src/features/spacing/` — `resolveSpacingProps()` maps spacing props to `{ classNames, style }`; runtime emits `.sp-*` utilities consuming `var(--sp-*)` chains, eliminating ~4,800 safelisted classes. JIT mode via `spacing.useMatchUtilities`.

### Source Layout

- `src/core/` — `createStyleSystem`, `defineTheme`/`defineOptions` (zero-runtime type-safe helpers), `Options`, `ThemeConfig`, `inference.ts` (+ `inference.test-d.ts` for `DesignTokens.Web.*` shape inference).
- `src/features/{plugin,safelist,tokens,cva,spacing}/`
- `src/shared/` — defaults, helpers, safelist property catalog.
- `src/cli/` — `commands/` (`init`, `safelist`, `doctor`), `config.ts`, `templates.ts`, `logger.ts`.
- `src/index.ts` — public API.
- `examples/` — sample theme configs + usage.

### Key Exports (public API)

```typescript
// Core
createStyleSystem();      // Main — returns { plugin, safelist, themeCss, DesignTokens }
createStylePlugin();      // Tailwind plugin only (v3/v4 auto-detected)
generateSafelist();       // string[] safelist (excludes spacing)
generateThemeCss();       // v4 @theme inline CSS string
createDesignTokens();     // Typed DesignTokens.Web.*

// Helpers
createVariantMapper();    // CVA: token keys → CSS class names (auto kebab-case)
resolveSpacingProps();    // Spacing props → { classNames, style }
resolveSpacing();         // Single spacing prop → { className, style }
defineTheme();            // Zero-runtime type-safe theme helper
defineOptions();          // Zero-runtime type-safe options helper
detectTailwindVersion();  // Auto-detect installed Tailwind major version (ESM-safe via createRequire)

// Constants
Breakpoint;               // Enum: SM, MD, LG, XL, XXL
defaultScreens;           // Default screen widths map
DEFAULT_*;                // Default safelist values (LAYOUT_CLASSES, ROUNDED_VALUES, etc.)
roundedProperties;        // Default rounded property list
borderProperties;         // Default border property list
```

Internal helpers (`addDot`, `extractData`, `toCamelCase`, `toPascalCase`, `flattenToVars`, `mapToVarRefs`) are not part of public API — not exported from any barrel.

### CLI Tool (`style-gen`)

Built separately by `tsdown` to `dist/cli/index.mjs` (bin entry). Commands: `init` (scaffold theme + plugin file, interactive or `--tw v3|v4 --dark`), `safelist` (write `safelist.txt`; `--watch` via `chokidar`), `doctor` (validate config; warns on legacy v1 nested `base/text/common` colors). Config resolution order: **CLI flags → `style-gen.config.json` → `package.json["style-gen"]` → built-in defaults**.

### Build Outputs

- `dist/{index,plugin,tokens,cva,spacing,types}.{js,cjs,d.ts}` — 6 subpaths, Vite lib multi-entry via `vite-plugin-dts`.
- Shared helper chunks (`helpers-*`, `defaultOption-*`, `safelistProperties-*`) — internal, not part of public `exports` map.
- `dist/cli/index.mjs` — CLI executable.
- Only `dist/` is published. `"sideEffects": false` in package.json enables tree-shaking.
- Size budget enforced by `yarn check:sizes` (gzip limits per chunk). See `docs/migration/v3-to-v4.md`.

## Theme / Color Rules (current v3 API)

- `colors` is the only **required** field in `ThemeConfig`. All others (`typography`, `shadows`, `borderRadius`, `border`, `themes`, `backDropBlurs`) are optional.
- Colors are a **flat camelCase** object. Nested color objects and `DEFAULT` key are unsupported (removed in v3).
- Key conversion: camelCase → kebab-case CSS vars/classes. Letter→digit boundary adds a dash (`blue500` → `blue-500`); digit-prefix tokens preserved (`2xl`).
- `themes` key holds named overrides (only diff from default needed). Activated via `[data-theme="<name>"]` (e.g. `html[data-theme="dark"]`).
- `safelistColors: false` by default — v4 users get color utilities through `themeCss` (`@theme inline`); v3 users should set `safelistColors: true` or rely on content scanning.

## Testing Approach

- Unit tests: Vitest (Node env), colocated `*.test.ts`.
- Type tests: `*.test-d.ts` via `yarn test:types` — use `expectTypeOf`.
- Coverage: v8, excludes test files and `dist/`.

## Release Workflow

1. PRs merge to `develop` (pre-release, `DEV` dist-tag) or `main` (stable).
2. Semantic Release creates version tag + updates `CHANGELOG.md` (custom `changelog-template.hbs`).
3. Tag triggers publish to **npm** (`registry.npmjs.org`, public).
4. Stable release on `main` back-merges to `develop`.

> Publish target locked by `yarn check:publish-target` (runs in `prepublishOnly` and CI). CI also runs `yarn npm publish --dry-run` and grep-asserts `registry.npmjs.org` before real publish. `NPM_TOKEN` is mapped to `YARN_NPM_AUTH_TOKEN` in the workflow so yarn berry auths correctly.
> Bundle hygiene locked by `yarn check:externals` (`prepublishOnly` + CI) — fails if `dist/` ever inlines a peer/dependency.

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

`detectTailwindVersion` internally uses `createRequire(import.meta.url)` to safely `require("tailwindcss/package.json")` in ESM context — no bare `require()` in library code.
