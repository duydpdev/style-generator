# Documents

Index of all documentation for `@duydpdev/style-generator`. API, option and CLI reference lives in [`reference/`](./reference/core.md); the repo's [`README.md`](../README.md) only keeps the introduction, installation and quickstart. Conventions for agents live in [`.claude/CLAUDE.md`](../.claude/CLAUDE.md).

## Start here (shown on the site `/docs`)

| File                                       | Contents                                                                                          | Tiếng Việt                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [`getting-started/`](./getting-started/)   | Getting started for React + Vite, Next.js, Nuxt + Vue; code embedded from `examples/`             | [`vi/getting-started/`](./vi/getting-started/)   |
| [`guide.md`](./guide.md)                   | Step-by-step integration guide, links to `reference/` for the tables                              | [`vi/guide.md`](./vi/guide.md)                   |
| [`cookbook.md`](./cookbook.md)             | Task-oriented recipes                                                                             | [`vi/cookbook.md`](./vi/cookbook.md)             |
| [`agent-contract.md`](./agent-contract.md) | The component contract an agent follows in an app; `style-gen init` writes it to `.claude/rules/` | [`vi/agent-contract.md`](./vi/agent-contract.md) |
| [`reference/`](./reference/)               | One page per subpath plus `cli`, `options` and `theme`                                            | [`vi/reference/`](./vi/reference/)               |

## Advanced (shown on the site `/docs`)

| File                                   | Contents                                                               | Tiếng Việt                                   |
| -------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| [`components.md`](./components.md)     | The six sample components (examples, not an API) and how to add one    | [`vi/components.md`](./vi/components.md)     |
| [`architecture.md`](./architecture.md) | Architecture: data flow, registry, `themeAxes`, spacing, exports, site | [`vi/architecture.md`](./vi/architecture.md) |
| [`testing.md`](./testing.md)           | The test layers, why they exist, where they run                        | [`vi/testing.md`](./vi/testing.md)           |
| [`deploy.md`](./deploy.md)             | Git flow (features branch from `main`), CI, release, npm publishing    | [`vi/deploy.md`](./vi/deploy.md)             |

Migration guides, the Vietnamese mirror rules and the repo standards follow below.

The site renders the files listed in `site/src/lib/docs-meta.json` at `/docs/<slug>` and their Vietnamese twins at `/vi/docs/<slug>`; `site/scripts/check-doc-links.mjs` fails when a rendered file has no entry or no `vi.title`.

## Vietnamese mirror ([`vi/`](./vi/README.md))

English is the source of truth. Every file listed in `site/src/lib/docs-meta.json` has a Vietnamese twin at the same path under `vi/` (the repo `README.md` → `vi/README.md`); the site renders it at `/vi/docs/<slug>` with the entry's `vi.title`. `yarn check:docs-i18n` (CI check job, after `check:docs-embed`) fails when a twin is missing, when line 1 (`<!-- source: <english path> sha256: <hash> -->`) records an older version of the English file, or when the twin's heading levels (with their inline code), doc-script markers (`embed`, `signature`, `snippet`, `> [!NOTE]`-style alerts), code blocks or signature blocks differ from the English file. Code blocks and signature blocks are copied verbatim; everything else is translated.

When you change an English doc:

1. Edit the English file and run `yarn docs:embed` (it also rewrites the code embedded in the twins). Signature blocks: `yarn docs:signatures` (needs `yarn build:all`) rewrites them in the English page and in its twin, and moves the twin's source hash along when the twin was in step with the English page. Never copy a signature block by hand.
2. Update the twin's text to match: same headings and levels, the same markers and code blocks, links to the twins of rendered docs (`./guide.md`), one more `../` for any other repo file, and `#anchors` that match the translated headings.
3. `yarn exec prettier --write <twin>`, then `yarn check:docs-i18n --write-hash <twin>` to record the new source hash. Use `--write-hash` only when the twin matches the current English file, never to silence the gate.
4. `yarn check:docs-i18n && yarn workspace site check:links`. `--only <path>` limits the check to one twin or directory; `--untranslated` (advisory, never a gate) also lists prose lines copied from the English file.

A new rendered doc needs its `docs-meta.json` entry with `vi.title` and its twin in the same change.

Glossary (prose only; identifiers, commands and code stay English):

| English                                           | Vietnamese                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| token, design token                               | token, design token                                                     |
| utility, utility class                            | utility, class utility                                                  |
| theme                                             | theme                                                                   |
| theme axis (`themeAxes`)                          | trục theme                                                              |
| variant                                           | variant                                                                 |
| token category                                    | nhóm token                                                              |
| alias                                             | alias                                                                   |
| recipe                                            | recipe                                                                  |
| component                                         | component                                                               |
| harness                                           | harness (first use on a page: "harness (bộ ví dụ dùng để kiểm thử DX)") |
| plain example                                     | ví dụ plain                                                             |
| breakpoint                                        | breakpoint                                                              |
| spacing                                           | spacing                                                                 |
| subpath (export)                                  | subpath                                                                 |
| peer dependency                                   | peer dependency                                                         |
| schema                                            | schema                                                                  |
| option(s)                                         | tùy chọn (identifiers stay `options`)                                   |
| build, commit, branch, merge, PR, CI, release tag | kept as is                                                              |
| release (the act)                                 | phát hành                                                               |
| breaking change                                   | thay đổi phá vỡ tương thích (breaking change)                           |
| migration                                         | nâng cấp                                                                |
| getting started                                   | bắt đầu                                                                 |
| guide                                             | hướng dẫn                                                               |
| reference                                         | tham chiếu                                                              |
| table of contents                                 | mục lục (heading `## Mục lục`)                                          |
| test, testing                                     | kiểm thử (command names stay)                                           |
| gate                                              | gate (cổng kiểm tra)                                                    |
| deploy                                            | triển khai                                                              |
| validate                                          | kiểm tra hợp lệ                                                         |
| fallback                                          | giá trị dự phòng                                                        |
| generate, generated                               | sinh, được sinh                                                         |

## Standards (not shown on the site)

| File                                                               | Contents                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| [`standards/git-workflow-app.md`](./standards/git-workflow-app.md) | Git standard for apps with 4 environment branches (`develop` → `staging` → `pre-release` → `release`), for team use |

## Migration

| File                                                                                       | Contents                                                                  |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [`migration/6.x-to-7.0.md`](./migration/6.x-to-7.0.md)                                     | Breaking changes 6.x → 7.0.0: no `extraSources`, no `axes` option         |
| [`migration/5.x-to-6.0.md`](./migration/5.x-to-6.0.md)                                     | Breaking changes 5.x → 6.0.0: generator-only root, no `plugin` config key |
| [`migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md)                                     | Breaking changes 4.x → 5.0.0, grep recipes and the generated CSS diff     |
| [`migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md)                                     | Breaking changes 3.x → 4.0.0 and the rollback runbook                     |
| [`migration/4.0-to-4.1.md`](./migration/4.0-to-4.1.md)                                     | Stricter validation in 4.1.0 (options, config, CSS variables, brackets)   |
| [`migration/5.3-to-5.4.md`](./migration/5.3-to-5.4.md)                                     | Color prefixes, opacity steps and new validation in 5.4.0                 |
| [`migration/3.x-subpath-exports.md`](./migration/3.x-subpath-exports.md)                   | History of the 3.x subpath exports                                        |
| [`migration/v4-ac4-letterspacing-proof.md`](./migration/v4-ac4-letterspacing-proof.md)     | Proof that adding a category touches exactly 3 files                      |
| [`migration/v4-schema-autocomplete-proof.md`](./migration/v4-schema-autocomplete-proof.md) | Proof that `theme.schema.json` rejects unknown keys (AC6)                 |
| [`migration/poc-custom-variant.md`](./migration/poc-custom-variant.md)                     | PoC of `@custom-variant` for the state palette                            |

## Local notes (not published)

`documents/plans/` and `documents/brainstorm/` are git-ignored local working directories (plans, reports, journals, brainstorm). Rules: `.claude/rules/validation.md` (Plan layout).
