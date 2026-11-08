# Testing Guide

This document describes how `@duydpdev/style-generator` 4.x is tested. The test code is the source of truth for _each case_; this document only keeps the _test layers_,
_why_ each layer exists and _where it runs_.

## CI/CD Pipeline

The checks have two layers:

1. **Local (pre-commit):** `Husky` + `lint-staged` run on the staged snapshot of the staged code files:
   `eslint --fix` → `prettier --write` → `tsc --noEmit` → `vitest related --run` (only tests that import the staged files).
   Husky is installed through `postinstall` (Yarn Berry does not run `prepare`).
2. **Remote** (GitHub Actions, `.github/workflows/ci.yml` and `.github/workflows/ci-matrix.yml`, PRs into `main`/`develop`/`release/**`):
   - job `check`: production dependency audit (blocks high/critical) and full audit (log only) → commitlint → `build:all` (before lint because the type-aware ESLint also scans
     `examples/**`, which import the built library through `link:../..`) → `yarn workspace plain-nuxt-example prepare:nuxt` (writes the `.nuxt/tsconfig.*.json` files that ESLint
     needs for `examples/plain-nuxt/app/**`) → lint → `prettier:check` → `tsc` → syntax check (`node --check`) and type check (`yarn typecheck:scripts`) of `scripts/*.mjs` and
     `site/scripts/*.mjs` → site build (`yarn workspace site build`) → `yarn workspace site check:links` (relative links,
     absolute `https://github.com/duydpdev/style-generator/blob/main/…` links as README.md writes them,
     and `#anchor`s in the markdown that the site renders) → `yarn check:docs-embed` (tutorial code equals the example regions it embeds) → `yarn check:docs-i18n` (every rendered
     doc has a `documents/vi/` twin with the current source hash and the same headings, markers and code blocks) → `yarn check:doc-snippets` (every `ts`/`tsx` block in the docs
     type-checks against `dist/*.d.ts`) → `yarn check:doc-exports` (every export has a reference heading, a matching signature block and a non-empty TSDoc,
     see [layer 9](#9-docs-embed-snippet-export)) → typecheck of every `*-example` workspace and of `site` (one `yarn workspaces foreach` call;
     the root `tsconfig.json` does not include `site/`, so this is the only place a wrong prop type in `site/src` fails) — it also compiles the sample components' type-check files,
     see [layer 8](#8-checks-of-the-sample-components) → `yarn workspace design-system-example test` (DX test,
     see [layer 6](#6-dx-test-for-the-design-system-example)) → build the example apps (`plain-react`,
     `plain-nuxt`) → `check:externals` → `check:browser-safe` → `check:sizes` → `check:smoke` → `yarn check:types-pack` (packs the tarball and then runs
     `@arethetypeswrong/cli --profile node16`: both ESM and CJS must resolve to the correct `.d.ts`/`.d.cts`) → Vite dev-server smoke (`node scripts/vite-dev-smoke.mjs`,
     two scenarios: (1) Vite ≥ 6 only (Vite 5 has no lazy `buildStart`, so the scenario is skipped):
     `createServer()` without `listen()` and then `transformRequest(..., { ssr: true })` — the plugin sets `perEnvironmentStartEndDuringDev: true`,
     so `buildStart` still runs and `theme.css` is written; (2) delete `theme.css` of `examples/harness`, `await server.listen()` so `buildStart` writes it again,
     then edit the theme (`examples/design-system/src/theme.json`) under a real dev server and wait for `theme.css` to be rewritten + `full-reload`) → `yarn typecheck:dist` (two
     halves: `tsconfig.dts-check.json` checks `dist/*.d.ts` and `dist/*.d.cts` with `skipLibCheck: false` under `module: ESNext` + Bundler;
     `tsconfig.dts-check.cjs.json` checks `dist/*.d.cts` as a real CommonJS consumer — `module: node16`, `skipLibCheck: false`,
     the file `scripts/dist-types.cjs.assert.cts` imports through the package name under the `require` condition itself.
     The CJS half uses `node16`, not `nodenext`, because since TS 5.8 `nodenext` allows `require()` of ESM and would mask `TS1479` on an ESM-only peer.
     `dist/vite.d.cts` is `vite.d.ts` with the `vite` import rewritten as `import type … assert { 'resolution-mode': 'import' }` (`scripts/cjs-declaration.mjs`);
     attw does not resolve peer types, so it cannot replace this step) → `yarn test:coverage` (fails if coverage drops below `coverage.thresholds` in `vitest.config.ts`) →
     `yarn test:types`;
   - job `plain-react` (a separate job of `ci.yml`, check name `Plain React (Storybook + parity)`, required by the `main-develop` ruleset;
     it runs on every PR including drafts and documentation-only PRs): `build:all` → `yarn playwright install --with-deps chromium` → `yarn workspace plain-react-example test` (the
     stories and the plain-vs-harness parity gate as Vitest browser tests) → `yarn workspace plain-react-example storybook:build` →
     `node examples/plain-react/scripts/copy-out-smoke.mjs`;
   - job `e2e` (a job of `ci.yml`, check name `E2E (Playwright)`, required by the `main-develop` ruleset; it runs on every PR including documentation-only ones,
     skips draft PRs and re-runs on `ready_for_review`): `build:all` → `yarn playwright install --with-deps chromium webkit` → `yarn test:e2e`;
   - job `tailwind-floor`: pins the Tailwind packages to `~4.1.0` (only in the runner's checkout) and then runs `yarn test` + `yarn test:e2e`,
     so the peer `tailwindcss ^4.1.0` is really checked — the lockfile currently resolves to 4.3.x, so without this job the lower bound would never be reached.
   - job `node-floor`: builds and runs `check:smoke` on Node `20.19.0`, the floor of `engines.node` (the other jobs run Node 22);
   - job `peer-matrix` (4 legs): builds the lib with the committed toolchain, then forces **one** peer to the latest version of **one** major through `resolutions` (`vite` 5/6/8,
     `typescript` 6), asserts that the resolved version is `N.x`, then builds `examples/harness`, (the `vite` leg) dev-server smoke, example typecheck and `yarn typecheck:dist`,
     (the `typescript` leg) `yarn test:types`. Every leg must be green (red means CI is red); there is no `experimental` leg any more:
     the TypeScript 7 leg was dropped because Yarn 4.10 cannot install native TypeScript 7. The results decide the peer ranges (edited by hand).
     Only the latest version of each major is run; the floor of a range (e.g. `vite@5.0.0`) is not checked;
   - job `ui-peer-floor`: builds the lib, forces the four UI-kit optional peers (`class-variance-authority`, `clsx`, `tailwind-merge`,
     `@types/react`) to the floor of their `peerDependencies` ranges through `resolutions`, asserts the resolved versions,
     then runs `yarn typecheck:dist` and `yarn vitest run src/features/ui`. Two harness-only pins mirror what a consumer actually gets: cva 0.7.0 needs clsx 2.0.0 exactly,
     so it keeps its own nested copy, and `@types/scheduler` is held at 0.16.8, the last version with `scheduler/tracing`, which `@types/react` <=18.2.71 imports;
   - `tailwind-floor`, `node-floor`, `peer-matrix` and `ui-peer-floor` are the heavy tier and live in `ci-matrix.yml` (7 jobs, `peer-matrix` has 4 legs; not a required check).
     It runs nightly on `main` (cron `43 5 * * *`), on manual dispatch (`gh workflow run ci-matrix.yml --ref main`) and on PRs into `main`/`release/**`, not on PRs into `develop`;
     every leg must be green before the PR into `main` is merged. It has `paths-ignore: ["documents/**"]` at the workflow level:
     a PR that only changes documentation does not run it. On PRs every job skips drafts and runs when the PR is marked ready (`ready_for_review`);
     on `schedule` and `workflow_dispatch` there is no draft, so the condition is `github.event_name != 'pull_request' || github.event.pull_request.draft == false`.
     The per-PR tier (`check`, `plain-react`, `storybook`, `e2e`) is in `ci.yml`, which also runs on draft PRs for `check`,
     so a pushed draft always gets a result (Actions minutes are free on this public repo).

`check:publish-target` runs in `prepublish` and in the publish workflow (`deploy.yml`); `deploy.yml` additionally runs `check:types-pack` right after `build:all`, see [`deploy.md`](./deploy.md).

Two separate workflows screenshot the built site: `.github/workflows/visual.yml` (job `Site visual regression (chromium)`) only compares against the committed Linux baselines and
runs for non-draft PRs that change `site/**`, `examples/**`, `e2e-site/**`, `src/**`, `documents/**` (the site renders them), `package.json`, `yarn.lock`,
`playwright.site.config.ts` or `.github/workflows/visual.yml` itself; `.github/workflows/visual-update.yml` (job `Site visual baselines (chromium)`) runs only when the
`visual-update` label is added and rewrites the baselines. See [layer 7](#7-site-visual-regression-playwright-chromium).

---

## Test layers

### 1. Unit tests (Vitest)

```bash
yarn test                                                   # all *.test.ts
yarn test:watch                                             # watch mode
yarn test:coverage                                          # v8 coverage; fails below coverage.thresholds (vitest.config.ts)
yarn vitest run src/features/registry/generateSourceInline.test.ts   # a single file
```

Tests sit next to the code (`*.test.ts`). The main groups:

- `src/core/*` — `generate()`, `ThemeSchema` (unknown keys, unsafe values, aliases, `themeAxes`, integer names, keys that do not round-trip, `borderWidth`/`colors` collisions,
  `fontWeight` 1–1000, typography keys that shadow `sp-*`/`font-*`), `defineTheme`, `parseAlias`, `forEachAxisVariant`, option validation (`extraSources`, `screens`, `breakpoints`,
  array-form `spacing.properties`), injection attempts (including `generateThemeCss`).
- `src/features/registry/*` — descriptors, `flattenByCategory`, `generateSourceInline` (including state lines).
- `src/features/{theme-css,typography,spacing}/*` — each generated CSS block.
- `src/features/{tokens,cva}/*` — `createDesignTokens`, `createVariantMapper` (`{ states }`).
- `src/features/{vite,next}/*` — plugins (emit in `buildStart`, `addWatchFile`, watcher, path guard, the no-argument plugin reading `style-gen.config.json`).
- `src/node/*` — the shared Node runner: `loadStyleGenConfig` (tests moved from the old `config.test.ts`), `resolveProjectPath` (does not rewrite a leading `/`;
  theme outside the root, `outDir` inside the root), `themeEmitter` (per-stage labels, writes only when the content changed), `watchThemeFile` (re-reads the config;
  an invalid config keeps the last valid one), `resolvePluginTarget`, `writeFileAtomic`, `errorMessage`, `isPlainObject`.
- `src/cli/*` — `run.test.ts` calls `runCli(args, cwd)` directly (registry, per-command `--help`, unknown flag → code 1,
  `budget` invalid flag → code 2) because commands return an exit code rather than calling `process.exit`; `index.test.ts` only checks `process.exitCode`; `init`,
  `generate` (including `--watch` with a real chokidar and a test that edits the config while watching, V5-06), `schema`,
  `tokens` (the generated module is re-imported and compared with `createDesignTokens`), `budget` (measures gzip on temporary files/directories, three exit codes,
  the two `OK:`/`OVER BUDGET:` lines), `doctor` (utility collision warnings, `aliasHints`, theme × options errors, an invalid config stops early;
  `legacyColorVars` scans for 4.x-style `--sg-<color>` variables in a temporary directory).
- `src/shared/*` — `helpers` (kebab/camel), `axisAttributeName`, `cssBlock`.

Coverage uses the v8 provider with `include: ["src/**/*.ts"]`, so a file that no test imports (e.g. `src/cli/index.ts`) still shows up at 0 % instead of being skipped.
Test files (`*.test.ts`, `*.test-d.ts`), `*.d.ts` and `src/__integration__/**` are excluded. There is no mandatory threshold yet.
Baseline measured on 2026-10-06: statements 91.35 %, branches 83.2 %, functions 92.48 %, lines 91.58 %; `src/cli/index.ts` 0 %.

The `text` table groups by directory (the `src/cli` row and then the `index.ts` row), so do not `grep` by file path on stdout; check `coverage/coverage-final.json` instead.

### 2. Type tests (`*.test-d.ts`)

```bash
yarn test:types      # vitest run --typecheck.only (*.test-d.ts; `yarn test` does not run them)
```

Uses `expectTypeOf` to lock down type inference: `DesignTokens.Web.*`, `ColorVariant<T>` …, `ThemeConfig`,
the `createVariantMapper` signature (a leftover `true` in the third parameter must be a TS error), `resolveSpacing`/`ResponsiveValueStrict`,
`SpacingProps`/`splitSpacingProps`/`themeAxisAttributes` (`src/features/recipes/*.test-d.ts`), the config type that `styleGenNext` returns (object or function form),
and the subpath exports (`src/exports/subpath-exports.test-d.ts`).

<!-- snippet: no-check imports repo-internal src/ modules -->

```typescript
import { describe, it, expectTypeOf } from "vitest";
import type { CamelCase } from "./inference";

describe("CamelCase", () => {
  it("converts kebab-case with numeric suffix", () => {
    expectTypeOf<CamelCase<"blue-500">>().toEqualTypeOf<"blue500">();
  });
});
```

### 3. Integration tests (`src/__integration__/`)

They run in Vitest but pass `generate().css` through the **real Tailwind v4 engine** (`@tailwindcss/node`),
via a single helper `compileFixtureCss` — the `compile()` API is not public API, so there is only one place that calls it.

The concerns locked down here:

- The compiled CSS has the right classes/variables; `@source inline` is what makes the classes appear even when the candidate list is empty (with a negative control that removes it).
- The CVA round trip: every class that `createVariantMapper` returns is present in the compiled CSS.
- `toKebabCase` parity between runtime and types (`kebab-parity`).
- Multi-axis `themeAxes` on the real theme of `examples/design-system` (`multi-axis.test.ts`; the `theme` axis is declared before `palette`).
- Every `theme.json` in `examples/`/`site/` passes the strict `ThemeSchema`, and the committed `theme.schema.json` files (`examples/`, `examples/design-system/src/`,
  `site/src/theme/`) match `z.toJSONSchema(ThemeSchema)`.
- No file shared between harness apps (`examples-dedup.test.ts`, empty allowlist): anything two harness apps share must live in `examples/design-system`.
  The harness list is just `examples/harness` now, so the test guards future apps. The plain apps share files on purpose; `yarn check:plain-ui` checks them.
- The `THEME_JSON`/`THEME_CSS` samples on the landing site (`site-build-sample.test.ts`) are a valid theme and an excerpt, in the right order, of the real `generate().css`.
- Non-default options (`custom-options.test.ts`): custom `screens`/`breakpoints`, `spacing.properties`, `cssVarDriven`, `enableResponsive: false`, `spacing.enabled: false`.
- The CSS measurement/check scripts (`measure-css-output`, `diff-class-families`) have their own tests; the CSS gzip budget is now the CLI command `style-gen budget`,
  tested in-process (`src/cli/commands/budget.test.ts`) in place of the `check-css-budget.mjs` script and the old spawn-process test.
- Negative controls for the publish gates (`publish-gates.test.ts`): build a fake `dist/` in a temporary directory, copy the scripts into `<root>/scripts/`,
  and then assert that `check:externals`, `check:sizes` and `check:browser-safe` exit with code 1 on an inlined dependency, a missing sourcemap, a missing budget,
  an exceeded budget (including through a chunk), or Zod/Node built-ins pulled into a browser-safe subpath.

### 4. E2E (Playwright, Chromium + WebKit)

```bash
yarn build:all        # e2e imports source code, but CI always builds first
yarn playwright install chromium webkit   # first time only
yarn test:e2e
```

In CI this is the `e2e` job of `ci.yml` (every PR) and one step of the `tailwind-floor` leg of the heavy tier.

Only behaviors that depend on the browser engine live here (`e2e/`):

- `spacing-inheritance.spec.ts` — `@property … inherits: false`: a parent element's `--sg-sp-*` variables do not leak down to the child element (the _same element_ rule).
- `custom-breakpoint-spacing.spec.ts` — the spacing fallback chain at custom breakpoints (md 800px, xl 1300px).
- `multi-axis-precedence.spec.ts` — when two axes override the same token, the axis declared later wins.

Why WebKit as well: the inheritance semantics of `@property` and the `var()` cascade differ between engines.

### 5. Artifact check gates (`scripts/*.mjs`)

Run after `yarn build:all`, and also part of `prepublish`:

| Script                                                                  | What it checks                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yarn check:externals`                                                  | no file in `dist/` (entries, shared chunks, `dist/cli/index.mjs`) inlines a dependency/peer: it reads the `sources` of every `dist/**/*.map` looking for `node_modules/<name>/`; a JS file without a sourcemap also fails the gate. A second pass walks each entry's relative imports: only `./ui` may import `class-variance-authority`, `clsx` or `tailwind-merge`, and no entry imports `react` at runtime |
| `yarn check:browser-safe`                                               | `./tokens`, `./cva`, `./spacing`, `./recipes`, `./types`, `./ui`, `./ui-react` do not pull in Zod, Node built-ins or `@tailwindcss/*` (including through shared chunks)                                                                                                                                                                                                                                       |
| `yarn check:sizes`                                                      | gzip budget for every subpath in `package.json#exports`, counting every chunk the entry imports (transitively), and for the CLI `dist/cli/index.mjs` (`cli`)                                                                                                                                                                                                                                                  |
| `yarn check:publish-target`                                             | publishes to the correct GitHub Packages                                                                                                                                                                                                                                                                                                                                                                      |
| `yarn check:smoke` (CI, not part of `prepublish`)                       | `import` + `require` every subpath by package name and match the export names; `generate()` ESM/CJS yields the same CSS; runs the CLI (`--version`, `schema`, `generate`, `tokens --help`, `budget --help`, and `init` in an empty project — `style-gen generate` fallback, no generator script, then `generate` — and next to a `vite.config.ts` — `styleGenVite()` snippet)                                 |
| `yarn check:types-pack` (CI and `deploy.yml`, not part of `prepublish`) | `yarn pack` and then `@arethetypeswrong/cli --profile node16` on the tarball: every subpath resolves correctly under both `import` (`.d.ts`) and `require` (`.d.cts`, generated by `scripts/emit-cts-types.mjs` as the last step of `yarn build`); `moduleResolution: node10` is unsupported and outside the profile                                                                                          |

### 6. DX test for the `design-system` example

```bash
yarn build:all                                  # the package links the library's dist/*.d.ts
yarn workspace design-system-example typecheck  # tsc --noEmit
yarn workspace design-system-example test       # vitest run --typecheck
```

This gate sits outside the root `yarn test` (`vitest.config.ts` excludes `examples/**`) because it needs a built `dist/`; CI runs it right after the example typecheck step,
before building the example apps. It locks down the library user's end-to-end experience:

- `tests/dx.test.ts` uses the TypeScript Compiler API: it compiles `src/recipes/button.ts` against the real `theme.json` (no diagnostics),
  then against a `theme.json` in which `danger` was renamed to `dangerX` (intercepting `host.getSourceFile` to swap the JSON content),
  and asserts that a TS error lands exactly in `src/recipes/button.ts` — that is, renaming a token in the theme breaks the recipe at the place that uses it, not at runtime.
  The same file asserts that `style-gen.config.json` (the mirror for the CLI-only flow) matches `options` in `src/style-gen.options.ts`.
- `tests/dx.test-d.ts` (`expectTypeOf`): the `Intent` union (the `intents` tuple, constrained by `satisfies` against the theme), `BreakpointKeys<typeof options>` is `"md" | "lg"`,
  `Box` with `{ xl: 4 }` does not compile, the type of `axisAttributes`.

### 7. Site visual regression (Playwright, Chromium)

```bash
yarn site:build              # the suite screenshots the BUILT site (vite preview, port 4173)
yarn test:visual             # compare against the committed baselines
yarn test:visual:update      # rewrite changed/missing baselines (--update-snapshots=changed)
```

`playwright.site.config.ts` (separate from `playwright.config.ts` so that `yarn test:e2e` needs no server) runs `e2e-site/site.spec.ts`: 3 routes (`/`, `/docs/architecture`,
`/examples` → `/examples/v4` with the `harness` iframe) × 3 viewports (375×812, 768×1024, 1280×800) × the `light`/`dark` theme (set through `localStorage["sg-site-theme"]` with
`addInitScript`). Full-page images are cut into 1800 px slices (`-p0`, `-p1`, …): Chromium cannot produce one image taller than 16384 px,
and 1800 px (about two desktop viewports) keeps every baseline tile readable in review and a diff local to its tile.
Threshold `maxDiffPixelRatio: 0.001`, `animations: "disabled"`, `reducedMotion: "reduce"` (the `prefers-reduced-motion` block in `site/src/styles/base.css` turns off smooth scroll
and the looping animations).

Before capturing, the spec scrolls the whole page so every IntersectionObserver has fired, then checks readiness through fixed test hooks, never through classes:
at least one `[data-reveal-state]` element and none with `data-reveal-state="pending"` (`site/src/lib/use-reveal.ts`);
every line of `data-testid="terminal-body"` (`site/src/components/terminal-typewriter.tsx`) has left `data-line-state="pending"` (all lines exist from the first paint, hidden,
so the box never grows) and the `data-testid="terminal-cursor"` cursor (`site/src/sections/start-section.tsx`) is inside it;
the `data-testid="example-preview"` iframe (`site/src/components/preview-frame.tsx`) has rendered `#root`. No CSS reads these hooks; keep them when you change the site markup.

Layout guard: `e2e-site/layout.spec.ts` (same config, no screenshots) asserts for `/`, `/docs/architecture|guide|testing|deploy`,
`/vi/docs/architecture|guide` and `/examples/v4` at 1280×800, 768×1024 and 375×812 that `document.documentElement.scrollWidth <= clientWidth`;
at ≤860 px that the topbar `Menu` button (`aria-expanded`, `aria-controls`) opens the `Pages` navigation (Docs and Examples links), `Escape` closes it and a link click closes it;
and on mobile that the theme toggle lies inside the viewport. `e2e-site/locale.spec.ts` (same config, no screenshots) checks the Vietnamese docs:
`/vi/docs` opens `/vi/docs/introduction`, `/vi/docs/guide` sets `<html lang="vi">` and shows its `vi.title`, the breadcrumb switch goes to `/docs/guide` and back,
links in the twin stay under `/vi/docs/`, and every in-page anchor has its heading. `yarn test:visual` runs all three specs,
so the compare job fails on a layout or locale regression too. Set `SITE_PORT` to run the preview server on another port than 4173.

Fonts: `e2e-site/pin-fonts.ts` (shared by both specs) blocks every request to `fonts.googleapis.com`/`fonts.gstatic.com` and answers with the pinned copies in
`e2e-site/fixtures/fonts/` (`site.css`, `harness.css` and the `.woff2` files); each test asserts that no font request reached the network.
When you change the Google Fonts link in `site/index.html` or `examples/harness/index.html`, refresh the fixtures and update `FONT_CSS` in `e2e-site/pin-fonts.ts`.
To refresh: download each stylesheet URL listed in `FONT_CSS` with a current Chrome `User-Agent` (so Google returns `woff2` `@font-face` rules) into
`e2e-site/fixtures/fonts/<css file>`, keeping the `url(https://fonts.gstatic.com/…)` references unchanged;
then download every referenced `https://fonts.gstatic.com/<path>` into the same directory as `<path>` with each `/` replaced by `_` (for example `s/geist/v5/x.woff2` →
`s_geist_v5_x.woff2`), which is the name the spec looks up, and delete fixture files that are no longer referenced.

Baselines exist only for Linux (`*-chromium-linux.png`; `.gitignore` excludes the `-darwin`/`-win32` ones) because font rendering differs between macOS and Linux.
Running locally on macOS is only for debugging (create temporary darwin baselines with `yarn test:visual:update`).
To update the baselines after an intentional UI change: run the compare first (a non-draft PR), download the `site-visual-report` artifact to get the exact list of changed images,
get that list approved, and only then add the `visual-update` label (`gh pr edit <N> --add-label visual-update`).
Download the `site-visual-baselines` artifact of the `Site visual update` run into a temporary directory, check the run's `headSha` against `HEAD`,
copy the files into `e2e-site/__screenshots__/`, commit them and remove the label.

### 8. Checks of the sample components

```bash
yarn build:all                                # the apps link the library's dist/*.d.ts
yarn workspace harness-example typecheck     # src/ui/*.tsx + tests/ui-types.tsx
yarn lint                                     # registry rules: banned tags, no className/style, Grid needs columns
```

The six sample components (`examples/harness/src/ui/`) are example code, not an API, and have no test runner.
Their checks are compile-time: `examples/harness/tests/ui-types.tsx` holds `@ts-expect-error` lines that must each be consumed by a real type error (wrong token, wrong breakpoint,
wrong `as` props). CI runs the typecheck in the one `yarn workspaces foreach … run typecheck` step, `yarn lint` in its own step,
and renders the app through `yarn workspace site build` (which builds `harness`). The components are documented in [`components.md`](./components.md).

The plain apps have their own checks: `yarn check:plain-ui` (folder layout, imports, `style.ts` identical in `plain-react` and `plain-nuxt`;
`types.ts` and the stories are not compared, and a story file (`<Name>.stories.tsx` / `.stories.ts`) is required per folder; the script also compares `theme.ts`,
`options.ts` and `theme/theme.json` across the two apps; tests in `src/__integration__/check-plain-ui.test.ts` and `check-plain-ui.repo.test.ts`),
`yarn workspace plain-nuxt-example typecheck` (with the type test `tests/nuxt/ui-props.vue`) and the build of `plain-nuxt`.
Lint needs `yarn workspace plain-nuxt-example prepare:nuxt` as well.

### 9. Docs (embed, snippet, export)

```bash
yarn build:all              # snippets and exports read dist/*.d.ts
yarn check:docs-embed       # a block with <!-- embed: path#region --> must equal that region of the real example file
yarn check:docs-i18n        # every rendered doc has a documents/vi/ twin: current source hash, same headings, markers and code blocks
yarn check:doc-snippets     # every ts/tsx block in README.md and documents/ (not plans, brainstorm, migration) must type-check
yarn check:doc-exports      # every export of every subpath needs a heading in documents/reference/<subpath>.md, a signature block matching dist/*.d.ts and a non-empty TSDoc (fix with yarn docs:signatures)
```

Why: tutorials never hold hand-copied code (so they cannot drift from the example that runs), and an example in the docs cannot silently break when the API changes.
Opt-out: a `<!-- snippet: no-check <reason> -->` line right before the block; the reason is required and opted-out blocks stay at or below 10% of all blocks.
Mark a region in the source file with `#region docs:<name>` / `#endregion docs:<name>` in that language's comment syntax;
`site/src/lib/example-files.ts` drops these lines from the examples page. Tests: `src/__integration__/doc-scripts.test.ts`.

The Vietnamese twins (`documents/vi/`) go through the same embed and snippet checks (except the twins of the migration guides).
`check:docs-i18n` compares each twin with its English file; the workflow and the glossary are in `documents/README.md`.
Tests: `src/__integration__/docs-i18n.test.ts` (also the twin rules of `site/scripts/check-doc-links.mjs`).

### 10. Storybooks, parity gate, copy-out smoke

```bash
yarn build:all                                          # the workspace links dist/ and `generate` runs the built CLI
yarn playwright install chromium                        # once per machine
yarn workspace plain-react-example test                 # both Vitest browser projects: storybook + parity
yarn workspace plain-react-example test:parity          # only the parity gate
node examples/plain-react/scripts/copy-out-smoke.mjs    # every src/ui folder type-checks with the packed tarball + peers only
```

Two example apps have a Storybook (`examples/plain-react`, `examples/plain-nuxt`); each is its own Storybook, with no composition.
Only component stories exist: each `.storybook/main.ts` loads `src/ui/**` (`app/ui/**` in `plain-nuxt`), so landing sections, `App` and `ThemeSwitch` have no story.
They share the story rules: `tags: ["autodocs"]` in the preview (one docs page per story file), `args` on every story, one story per variant value (plus an all-variants overview),
a `play` function on every interactive story (written with `storybook/test`), and no raw Tailwind class names in a story: it renders through the app's own components,
so a story adds no utility to the app's CSS. Each app's CSS entry also carries `@source not "<path>/**/*.stories.*"`,
and story comments avoid utility words such as `blur` and `filter`, so the generated CSS stays the same with or without stories.
In `examples/plain-react`, every `src/ui/<name>/<Name>.stories.tsx` story runs as a test in the `storybook` Vitest project (`@storybook/addon-vitest`, Chromium),
and `yarn check:plain-ui` requires one story file per component folder. `examples/plain-nuxt` uses `@storybook/vue3-vite` (no Nuxt module) with hand-written `<Name>.stories.ts`
ports of the same titles, story names and args. Per app: `yarn workspace <app>-example storybook` (dev), `storybook:build` and `test:stories` (the stories as Vitest browser tests);
CI runs only `plain-react`'s (job `plain-react`), the `plain-nuxt` ones are a local check. The `parity` project (`tests/parity/*.parity.test.{ts,tsx}`) renders each of the six
shared components and its harness twin from `harness-example/ui` with the same props, and compares the sorted class tokens of the root and of every descendant with a class.
Each file first asserts that the plain tables and the harness tables have the same variants, option keys and compound entries,
then generates the cases from both (every variant option, every compound entry) plus every spacing property,
so a new variant on either side needs no test edit and an option on one side only fails. A one-class change on either side turns it red.
`theme.parity.test.ts` keeps the plain theme copy equal to the harness tokens. Every script runs `yarn generate` first (plain-nuxt: `generate:theme`),
so the theme CSS exists before Vitest or Storybook start. The copy-out smoke packs the library, copies `src/theme.ts`, `src/options.ts`,
`src/theme/theme.json` and every folder of `src/ui/` into a scratch project with only the tarball and the peers at the versions the repo resolves (no dependency script,
public registry, allow-listed environment), and runs `tsc --noEmit`.

---

## Writing new tests

1. Put `${name}.test.ts` (or `${name}.test-d.ts` for a type test) next to the file under test.
2. Test **behavior** (boundaries, invariants, errors), not wiring, and do not copy the implementation.
3. If you need real compiled CSS → use `compileFixtureCss`, do not call `compile()` directly.
4. Add e2e only when the behavior depends on the browser engine.

<!-- snippet: no-check imports repo-internal src/ modules -->

```typescript
import { describe, expect, it } from "vitest";
import { toKebabCase } from "./helpers";

describe("toKebabCase", () => {
  it("adds a dash at the letter→digit boundary", () => {
    expect(toKebabCase("blue500")).toBe("blue-500");
  });
});
```
