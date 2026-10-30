# Documents

Index of all documentation for `@duydpdev/style-generator`. API, option and CLI reference lives in the repo's [`README.md`](../README.md); conventions for agents live in [`.claude/CLAUDE.md`](../.claude/CLAUDE.md).

## Living documents (shown on the site `/docs`)

| File                                   | Contents                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| [`architecture.md`](./architecture.md) | 4.0.0 architecture: data flow, registry, `themeAxes`, spacing, exports, site    |
| [`guide.md`](./guide.md)               | Step-by-step integration guide, links to the README for reference tables        |
| [`testing.md`](./testing.md)           | The test layers, why they exist, where they run                                 |
| [`deploy.md`](./deploy.md)             | Git flow (features branch from `main`), CI, release, GitHub Packages publishing |

The site renders every top-level `documents/*.md` file except this one (`site/src/lib/docs-content.ts`).

## Standards (not shown on the site)

| File                                                               | Contents                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| [`standards/git-workflow-app.md`](./standards/git-workflow-app.md) | Git standard for apps with 4 environment branches (`develop` → `staging` → `pre-release` → `release`), for team use |

## Migration

| File                                                                                       | Contents                                                                |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [`migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md)                                     | Breaking changes 4.x → 5.0.0, grep recipes and the generated CSS diff   |
| [`migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md)                                     | Breaking changes 3.x → 4.0.0 and the rollback runbook                   |
| [`migration/4.0-to-4.1.md`](./migration/4.0-to-4.1.md)                                     | Stricter validation in 4.1.0 (options, config, CSS variables, brackets) |
| [`migration/3.x-subpath-exports.md`](./migration/3.x-subpath-exports.md)                   | History of the 3.x subpath exports                                      |
| [`migration/v4-ac4-letterspacing-proof.md`](./migration/v4-ac4-letterspacing-proof.md)     | Proof that adding a category touches exactly 3 files                    |
| [`migration/v4-schema-autocomplete-proof.md`](./migration/v4-schema-autocomplete-proof.md) | Proof that `theme.schema.json` rejects unknown keys (AC6)               |
| [`migration/poc-custom-variant.md`](./migration/poc-custom-variant.md)                     | PoC of `@custom-variant` for the state palette                          |

## Local notes (not published)

`documents/plans/` and `documents/brainstorm/` are git-ignored local working directories (plans, reports, journals, brainstorm). Rules: `.claude/rules/validation.md` (Plan layout).
