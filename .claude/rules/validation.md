# Validation & Plan Protocol

## Gate before reporting done

A task is done only when this chain exits 0 at the repo root (`yarn build:all` comes first because type-aware ESLint also covers `examples/**`, which import the built library through `link:../..`):

```bash
yarn build:all && yarn lint && yarn prettier:check && yarn tsc --noEmit && yarn test && yarn test:types
```

Add the rows that match the change:

| When the change touches                                                         | Also run                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/**`, `package.json`, `vite.config.ts`, `tsdown.config.ts`, `scripts/*.mjs` | `yarn typecheck:scripts && yarn build:all && yarn typecheck:dist && yarn check:externals && yarn check:sizes && yarn check:browser-safe && yarn check:publish-target && yarn check:smoke && yarn check:types-pack && node scripts/vite-dev-smoke.mjs` |
| Spacing, generated CSS, `@source inline`, `themeAxes`                           | `yarn build:all && yarn test:e2e`                                                                                                                                                                                                                     |
| `README.md`, `documents/**/*.md`, `site/**`, `examples/**`, `packages/**`       | `yarn site:build && yarn workspace site typecheck && yarn workspace site check:links && yarn check:docs-embed && yarn check:doc-snippets && yarn check:doc-exports`                                                                                   |
| Release/publish config (`release.config.cjs`, `.github/workflows/deploy.yml`)   | `yarn build:all && yarn npm publish --dry-run` — output must contain `npm.pkg.github.com`                                                                                                                                                             |

The pre-commit hook (Husky + lint-staged) runs, on the staged snapshot of the staged code files: eslint → prettier → `tsc --noEmit` → `vitest related --run` (only tests that import a staged file). It does not replace the gate above: it skips the rest of `yarn test`, `test:types`, `check:*`, e2e and the site build.

## Plan Protocol (4-Phase)

| Phase             | Mode | Rule                                     |
| ----------------- | ---- | ---------------------------------------- |
| 1. ANALYSIS       | plan | Research, questions                      |
| 2. PLANNING       | plan | Create the plan directory (layout below) |
| 3. SOLUTIONING    | plan | Architecture, design — NO CODE           |
| 4. IMPLEMENTATION | edit | Code + tests                             |

> 🔴 NEVER write code before the user approves the plan. Wait for explicit "ok", "proceed", "approved" or equivalent.

### Plan layout

One directory per plan, grouped by the date the plan was created. There is no per-day `task.md`.

```text
documents/plans/YYYY-MM-DD/<plan-slug>/
├── plan.md              # index: overview, success criteria, phase table (status lives here)
├── phase-01-<name>.md   # one file per phase, numbered in execution order
├── phase-02-<name>.md
└── reports/             # optional: reviews/research produced for this plan
```

- `<plan-slug>` is kebab-case, no date and no number prefix (e.g. `docs-restructure`). Phase numbers are two digits and never reused inside a plan.
- A plan the user supplies inline is still materialized as a plan directory before implementation.
- Relative links only; never absolute paths.
- Reports that belong to no plan go to `documents/plans/reports/`; journals go to `documents/plans/journals/YYYY-MM-DD-<slug>.md` (where `ak journal create` writes them).
- Brainstorm/advise output: `documents/brainstorm/YYYY-MM-DD/<topic>.md`; no per-day `session.md`.
- `documents/plans/` and `documents/brainstorm/` are git-ignored local directories (not published). Keep the plan layout, but never `git add` them.

`plan.md` template:

```markdown
---
title: "<Plan title>"
status: pending # pending | in-progress | blocked | completed
created: YYYY-MM-DD
---

# <Plan title>

## Overview

<Goal, decisions already made, non-goals>

## Project Type

LIBRARY

## Success Criteria

1. <Mechanically checkable condition>

## Phases

| #   | Phase                          | Status  |
| --- | ------------------------------ | ------- |
| 01  | [<name>](./phase-01-<name>.md) | pending |
```

Phase file template:

```markdown
# Phase 01 — <name>

## Goal

<One observable outcome>

## Tasks

### [ ] Task 1: <step name>

- **Skill/role**: <optional>
- **Input**: <affected files>
- **Output**: <expected result>
- **Verify**: <command + expected exit code/output>
```

On completion flip `[ ]` → `[x]` in the phase file and set the phase row in `plan.md` to `completed` in the same change.
