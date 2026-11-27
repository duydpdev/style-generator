---
paths:
  - "package.json"
  - "vite.config.ts"
  - "tsdown.config.ts"
  - "scripts/**"
  - ".github/workflows/**"
  - ".yarnrc.yml"
  - "release.config.cjs"
  - ".husky/**"
  - "lint-staged.config.js"
  - ".github/dependabot.yml"
  - "eslint.config.js"
  - "tsconfig*.json"
  - "vitest.config.ts"
  - "playwright*.config.ts"
  - "e2e/**"
  - "e2e-site/**"
  - "starters/**"
  - "commitlint*.config.ts"
---

# Build outputs, publish gates, tests and CI legs

Loaded when a build, release, hook, workflow, lint, type-check or test config file, an e2e spec or a starter is read. The always-loaded publishing rules are in `.claude/rules/publishing-guards.md`; the done-gate is in `.claude/rules/validation.md`.

## Publish and smoke commands

```bash
yarn check:externals && yarn check:sizes && yarn check:browser-safe && yarn check:publish-target   # publish gates (all four run by prepublish; CI runs the first three, deploy.yml runs publish-target)
yarn check:smoke    # after build:all: import+require every subpath, run the CLI incl. init stack detection + generate in a fresh project (CI)
node scripts/starter-smoke.mjs   # after build:all, needs network: packed tarball + npm in a copy of starters/vite-react, vite build + tsc (CI)
yarn check:tokens   # after build:all: `generate --check` in each app that commits a theme.tokens.ts (plain-react, plain-nuxt, design-system, site) — fails when one is stale (CI)
yarn check:next-build   # after build:all, needs network: packed tarball + next@16.4.5 in a scratch project, init + `next build` (Turbopack) through styleGenNext (CI node-floor)
yarn check:ts-peer   # after build:all: tarball + npm + TypeScript 5.0/5.2/5.9/6/7 in a scratch project, tsc on every subpath (CI ts-peer job; needs network)
yarn check:ds-build   # after build:all, needs network: packed tarball + tailwindcss (the only peer) in a scratch project, `style-gen ds build` with a .mjs preset; DS_SMOKE_TAILWIND picks the release (CI ds-smoke job)
yarn check:types-pack   # after build:all: yarn pack + @arethetypeswrong/cli (node16 profile) — ESM .d.ts / CJS .d.cts resolve for every subpath (CI)
```

## Pre-commit and branch hooks

Pre-commit (Husky): `.husky/pre-commit` runs only `yarn lint-staged`, which works on the staged snapshot:
eslint --fix → prettier → `tsc --noEmit` → `vitest related --run` (`lint-staged.config.js`). Yarn Berry never runs `prepare`,
so Husky is installed via `postinstall: husky` (verify with `git config core.hooksPath` → `.husky/_`).
`yarn verify:fast` (`lint-staged --diff="$(git merge-base HEAD origin/develop)...HEAD"`) runs that same chain on every file the branch changed against `origin/develop`; it needs the `origin/develop` ref.
`pinst` (`prepack: pinst --disable`, `postpack: pinst --enable`) renames `postinstall` to `_postinstall` inside the published tarball so consumers never run Husky.
Release CI sets `HUSKY=0`. `.husky/pre-push` runs `scripts/check-branch-name.sh`, also a step of `pr-title.yml`:
branch names are `<type>/<slug>` (`feat|fix|docs|chore|ci|build|refactor|test|perf|revert`, slug 1–6 lowercase words joined by `-`), plus `dependabot/**` (`documents/deploy.md` → Branching Strategy);
a PR into `main` must come from `develop`, `fix/<slug>`, `docs/<slug>` or `dependabot/**`.

## Build outputs

Build outputs: `dist/{index,tokens,cva,spacing,recipes,types,ui,ui-react,vite,next}.{js,cjs,d.ts,d.cts}` (10 subpaths, Vite lib multi-entry;
`dist/<n>.d.cts` is `dist/<n>.d.ts` run through `toCjsDeclaration` (`scripts/cjs-declaration.mjs`) by `scripts/emit-cts-types.mjs`, the last step of `yarn build`:
the single `vite` import becomes `import type … with { 'resolution-mode': 'import' }` because Vite has no usable CommonJS types, `zod`, `class-variance-authority`, `clsx`,
`tailwind-merge` and `react` are kept, any other external specifier or import form fails the build; `with` parses on TypeScript 5.3+ and TypeScript 7 rejects `assert` (TS2880), so `dist/vite.legacy.d.cts`
(`toLegacyCjsDeclaration`) keeps `assert` and `package.json#exports["./vite"].require["types@<5.3"]` points at it, because `with` is a parse error on TypeScript < 5.3) + `dist/cli/index.mjs` (tsdown, JSDoc stripped via `outputOptions.comments.jsdoc = false`, `//#region` markers via `inputOptions.experimental.attachDebugInfo = "none"`).
`package.json#exports` uses nested conditions (`import: { types: .d.ts, default: .js }`, `require: { types: .d.cts, default: .cjs }`) and has no top-level `types`;
`moduleResolution: node10` is unsupported. `yarn typecheck:dist` checks the `.d.ts` under ESNext + Bundler (`tsconfig.dts-check.json`) and the `.d.cts` as a CommonJS consumer under
`node16` with `skipLibCheck: false` (`tsconfig.dts-check.cjs.json`, `scripts/dist-types.cjs.assert.cts`); attw never resolves peer types, so it cannot replace that check.
Shared hashed chunks are internal. `vite.config.ts` pins the modules several entries share to stable chunks with Rolldown's `output.codeSplitting.groups` (`helpers`+`colorStates` → `helpers`,
`exports/cva`+`createVariantMapper` → `cva`, the `./tokens` internals → `tokens`) so a new entry cannot reshuffle chunks and push `tokens`/`cva`/`spacing`/`index` over budget;
a group name equal to an entry name merges the group with that entry, so a group that is not meant to merge MUST use a name no entry has; when a new shared module or entry makes those four sizes drift,
pin it or restructure the import instead of raising their budgets (`scripts/check-dist-reachable.mjs`, chained into `check:sizes`, fails when a `dist` file is not reachable from a published entry, which would leave it uncounted).
Only `dist/` is published, `"sideEffects": false`; gzip budgets in `scripts/check-sizes.mjs`.

## Testing layers and CI legs

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
and each app's CSS has `@source not` for `*.stories.*`). `ci.yml` builds once (job `build`, which uploads `dist/`) and fans out to `lint`, `docs`, `dist-checks` and `unit`; the `check` job (`Build & Lint Check`, the required name) only aggregates them under `always()`.
The `plain-react` job (Storybook stories and the plain-vs-harness parity gate) is separate and runs on drafts; `plain-react`, `plain-nuxt` and `e2e` are skipped only when `docs_only` (set by `build`: every changed path is under `documents/`) is `true`.
The `plain-nuxt` job (its stories, not a required check) runs alongside `plain-react`. Layers and CI legs (including `tailwind-floor`, `node-floor`,
`peer-matrix` (decides the `vite`/`typescript` peer ranges), `ts-peer` (proves the `typescript` range in a scratch npm project) and `ui-peer-floor` (proves the floors of the UI-kit peer ranges) and `ds-smoke` (`style-gen ds build` from the packed tarball with `tailwindcss` as the only peer); every leg must pass;
these 10 jobs are the heavy tier in `.github/workflows/ci-matrix.yml`: nightly on `main`, manual dispatch and PRs into `main` (the `develop` → `main` release PR), not on PRs into `develop`;
it skips `documents/**`-only PRs and, on PRs, draft PRs, while `ci.yml` has no path filter and runs on every PR;
every job but `e2e` also runs on drafts, `e2e` skips draft PRs and re-runs on `ready_for_review`; `node scripts/ci-run-lines.mjs --compare <rev>` lists the `run:` steps a workflow edit dropped, re-ordered or re-conditioned): `documents/testing.md`.
`.github/workflows/nightly.yml` (not a required check) adds `yarn test` on `macos-latest` and `scripts/bun-smoke.mjs` (Bun installed with `npm install -g bun`, no third-party action) every night and on PRs into `main` that change it.
