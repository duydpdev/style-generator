# Testing Guide

This document describes how `@duydpdev/style-generator` 4.x is tested. The test code is the source of truth for _each case_; this document only keeps the _test layers_, _why_ each layer exists and _where it runs_.

## CI/CD Pipeline

The checks have two layers:

1. **Local (pre-commit):** `Husky` + `lint-staged` run on the staged snapshot of the staged code files: `eslint --fix` → `prettier --write` → `tsc --noEmit` → `vitest related --run` (only tests that import the staged files). Husky is installed through `postinstall` (Yarn Berry does not run `prepare`).
2. **Remote (GitHub Actions, `.github/workflows/ci.yml` and `.github/workflows/ci-matrix.yml`, PRs into `main`/`develop`/`release/**`):\*\*
   - job `check`: production dependency audit (blocks high/critical) and full audit (log only) → commitlint → lint → `prettier:check` → `tsc` → syntax check (`node --check`) and type check (`yarn typecheck:scripts`) of `scripts/*.mjs` and `site/scripts/*.mjs` → `build:all` → site build (`yarn workspace site build`) → `yarn workspace site check:links` (relative links and `#anchor`s in the markdown that the site renders) → typecheck of 3 examples, build `next-v4`/`nuxt-v4` → `check:externals` → `check:browser-safe` → `check:sizes` → `check:smoke` → Vite dev-server smoke (`node scripts/vite-dev-smoke.mjs`: edit the theme of `examples/react-v4` under a real dev server and wait for `theme.css` to be rewritten + `full-reload`) → `yarn typecheck:dist` (`tsconfig.dts-check.json`: `dist/*.d.ts` with `skipLibCheck: false`) → `yarn test:coverage` (fails if coverage drops below `coverage.thresholds` in `vitest.config.ts`) → `yarn test:types`;
   - job `e2e`: Playwright on Chromium and WebKit (`build:all` → install browsers → `yarn test:e2e`);
   - job `tailwind-floor`: pins the Tailwind packages to `~4.1.0` (only in the runner's checkout) and then runs `yarn test` + `yarn test:e2e`, so the peer `tailwindcss >=4.1.0` is really checked — the lockfile currently resolves to 4.3.x, so without this job the lower bound would never be reached.
   - job `node-floor`: builds and runs `check:smoke` on Node `20.19.0`, the floor of `engines.node` (the other jobs run Node 22);
   - job `peer-matrix` (4 legs): builds the lib with the committed toolchain, then forces **one** peer to the latest version of **one** major through `resolutions` (`vite` 5/6/8, `typescript` 6), asserts that the resolved version is `N.x`, then builds `examples/react-v4`, (the `vite` leg) dev-server smoke, example typecheck and `yarn typecheck:dist`, (the `typescript` leg) `yarn test:types`. Every leg must be green (red means CI is red); there is no `experimental` leg any more: the TypeScript 7 leg was dropped because Yarn 4.10 cannot install native TypeScript 7. The results decide the peer ranges (edited by hand). Only the latest version of each major is run; the floor of a range (e.g. `vite@5.0.0`) is not checked;
   - `e2e`, `tailwind-floor`, `node-floor` and `peer-matrix` live in `ci-matrix.yml`, which has `paths-ignore: ["documents/**"]` at the workflow level: a PR that only changes documentation does not run this workflow. The `check` job of `ci.yml` still runs for such a PR because the site renders `documents/*.md`. Every job in both workflows skips draft PRs (`if: github.event.pull_request.draft == false`) and runs when the PR is marked ready (`ready_for_review`).

`check:publish-target` runs in `prepublish` and in the publish workflow (`deploy.yml`), see [`deploy.md`](./deploy.md).

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

- `src/core/*` — `generate()`, `ThemeSchema` (unknown keys, unsafe values, aliases, `themeAxes`, integer names, keys that do not round-trip, `borderWidth`/`colors` collisions), `defineTheme`, option validation (`extraSources`, `screens`, `breakpoints`, `spacing.properties`), injection attempts (including `generateThemeCss`).
- `src/features/registry/*` — descriptors, `flattenByCategory`, `generateSourceInline` (including state lines).
- `src/features/{theme-css,typography,spacing}/*` — each generated CSS block.
- `src/features/{tokens,cva}/*` — `createDesignTokens`, `createVariantMapper` (`{ states }`).
- `src/features/{vite,next}/*` — plugins (emit-only, watcher, path guard).
- `src/cli/*` — `init`, `generate`, `schema`, `doctor` (utility collision warnings), `config`.
- `src/shared/*` — `helpers` (kebab/camel), `resolveSafePath`, `writeFileAtomic`.

Coverage uses the v8 provider with `include: ["src/**/*.ts"]`, so a file that no test imports (e.g. `src/cli/index.ts`) still shows up at 0 % instead of being skipped. Test files (`*.test.ts`, `*.test-d.ts`), `*.d.ts` and `src/__integration__/**` are excluded. There is no mandatory threshold yet. Baseline measured on 2026-10-06: statements 91.35 %, branches 83.2 %, functions 92.48 %, lines 91.58 %; `src/cli/index.ts` 0 %.

The `text` table groups by directory (the `src/cli` row and then the `index.ts` row), so do not `grep` by file path on stdout; check `coverage/coverage-final.json` instead.

### 2. Type tests (`*.test-d.ts`)

```bash
yarn test:types      # vitest run --typecheck.only (*.test-d.ts; `yarn test` does not run them)
```

Uses `expectTypeOf` to lock down type inference: `DesignTokens.Web.*`, `ColorVariant<T>` …, `ThemeConfig`, the `createVariantMapper` signature (a leftover `true` in the third parameter must be a TS error), `resolveSpacing`/`ResponsiveValueStrict`, the config type that `styleGenNext` returns (object or function form), and the subpath exports (`src/exports/subpath-exports.test-d.ts`).

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

They run in Vitest but pass `generate().css` through the **real Tailwind v4 engine** (`@tailwindcss/node`), via a single helper `compileFixtureCss` — the `compile()` API is not public API, so there is only one place that calls it.

The concerns locked down here:

- The compiled CSS has the right classes/variables; `@source inline` is what makes the classes appear even when the candidate list is empty (with a negative control that removes it).
- The CVA round trip: every class that `createVariantMapper` returns is present in the compiled CSS.
- `toKebabCase` parity between runtime and types (`kebab-parity`).
- Multi-axis `themeAxes` on the real theme of `examples/nuxt-v4`.
- Every `theme.json` in `examples/`/`site/` passes the strict `ThemeSchema`, and the committed `theme.schema.json` files match `z.toJSONSchema(ThemeSchema)`.
- The `THEME_JSON`/`THEME_CSS` samples on the landing site (`site-build-sample.test.ts`) are a valid theme and an excerpt, in the right order, of the real `generate().css`.
- Non-default options (`custom-options.test.ts`): custom `screens`/`breakpoints`, `spacing.properties`, `cssVarDriven`, `enableResponsive: false`, `spacing.enabled: false`.
- The CSS budget measurement/check scripts (`measure-css-output`, `diff-class-families`, `check-css-budget`) have their own tests.
- Negative controls for the publish gates (`publish-gates.test.ts`): build a fake `dist/` in a temporary directory, copy the scripts into `<root>/scripts/`, and then assert that `check:externals`, `check:sizes` and `check:browser-safe` exit with code 1 on an inlined dependency, a missing sourcemap, a missing budget, an exceeded budget (including through a chunk), or Zod/Node built-ins pulled into a browser-safe subpath.

### 4. E2E (Playwright, Chromium + WebKit)

```bash
yarn build:all        # e2e imports source code, but CI always builds first
yarn playwright install chromium webkit   # first time only
yarn test:e2e
```

Only behaviors that depend on the browser engine live here (`e2e/`):

- `spacing-inheritance.spec.ts` — `@property … inherits: false`: a parent element's `--sg-sp-*` variables do not leak down to the child element (the _same element_ rule).
- `custom-breakpoint-spacing.spec.ts` — the spacing fallback chain at custom breakpoints (md 800px, xl 1300px).
- `multi-axis-precedence.spec.ts` — when two axes override the same token, the axis declared later wins.

Why WebKit as well: the inheritance semantics of `@property` and the `var()` cascade differ between engines.

### 5. Artifact check gates (`scripts/*.mjs`)

Run after `yarn build:all`, and also part of `prepublish`:

| Script                                            | What it checks                                                                                                                                                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yarn check:externals`                            | no file in `dist/` (entries, shared chunks, `dist/cli/index.mjs`) inlines a dependency/peer: it reads the `sources` of every `dist/**/*.map` looking for `node_modules/<name>/`; a JS file without a sourcemap also fails the gate |
| `yarn check:browser-safe`                         | `./tokens`, `./cva`, `./spacing`, `./types` do not pull in Zod, Node built-ins or `@tailwindcss/*` (including through shared chunks)                                                                                               |
| `yarn check:sizes`                                | gzip budget for every subpath in `package.json#exports`, counting every chunk the entry imports (transitively), and for the CLI `dist/cli/index.mjs` (`cli`)                                                                       |
| `yarn check:publish-target`                       | publishes to the correct GitHub Packages                                                                                                                                                                                           |
| `yarn check:smoke` (CI, not part of `prepublish`) | `import` + `require` every subpath by package name and match the export names; `generate()` ESM/CJS yields the same CSS; runs the CLI (`--version`, `schema`, `generate`, `init`) and the TypeScript script generated by `init`    |
| `scripts/check-css-budget.mjs` (no yarn script)   | gzip budget for the compiled CSS of a consuming app; a plain Node script, can be copied to another repo                                                                                                                            |

---

## Writing new tests

1. Put `${name}.test.ts` (or `${name}.test-d.ts` for a type test) next to the file under test.
2. Test **behavior** (boundaries, invariants, errors), not wiring, and do not copy the implementation.
3. If you need real compiled CSS → use `compileFixtureCss`, do not call `compile()` directly.
4. Add e2e only when the behavior depends on the browser engine.

```typescript
import { describe, expect, it } from "vitest";
import { toKebabCase } from "./helpers";

describe("toKebabCase", () => {
  it("adds a dash at the letter→digit boundary", () => {
    expect(toKebabCase("blue500")).toBe("blue-500");
  });
});
```
