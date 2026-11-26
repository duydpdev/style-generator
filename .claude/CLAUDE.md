# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository. Area rules live in `.claude/rules/` and load when you read files of that area; before editing or creating a file in an area you have not read a file of, Read that area's rule file.

## Project Overview

`@duydpdev/style-generator` — TypeScript library + CLI that compiles a theme JSON into Tailwind CSS **v4** utilities through one `generate()` call:
a CSS string (`@theme inline` variables, `themeAxes` overrides, registry-generated `@source inline` coverage), typed design tokens and a JSON Schema.
**Tailwind v4 only**, ESM-first (`"type": "module"`) with CJS interop. Flow: `theme.json → generate(theme, options) → { css, tokens, schema }`.
Source layout: `documents/architecture.md`; public exports per subpath and the CLI: `documents/reference/`.

## Package Manager

Use **Yarn Berry v4** only. Never `npm`/`npx` directly: `yarn install`, `yarn add <package>`.

## Common Commands

```bash
yarn install                 # Yarn Berry never runs `prepare`; Husky is installed by `postinstall`
yarn build                   # library: Vite build, ESM + CJS + .d.ts
yarn build:cli               # CLI: tsdown, then the packaged canvas standard JSON
yarn build:all               # both; run before `yarn lint` (type-aware ESLint reads the built library)
yarn test                    # Vitest unit tests (*.test.ts)
yarn vitest                  # watch mode; `yarn test:coverage` for v8 coverage
yarn test:types              # *.test-d.ts (expectTypeOf); `yarn test` does not run them
yarn test:e2e                # Playwright (Chromium + WebKit): spacing inheritance, compiled CSS
yarn vitest run src/features/registry/generateSourceInline.test.ts   # one file
yarn verify:fast             # fast gate (<1 min): pre-commit chain on the files this branch changed vs origin/develop
yarn verify                  # base gate + src gate (documents/testing.md → Gate table)
yarn lint                    # ESLint, --max-warnings 0; `yarn lint --fix` writes
yarn prettier:check          # CI gate; `yarn prettier:fix` writes
yarn tsc --noEmit            # type check
yarn check:comments          # comment ceiling for src/** (JSDoc <= 8 lines, runs <= 3, ratio < 20%)
yarn site:build              # library build + landing site (renders documents/*.md)
```

Publish gates, smoke checks, schema refresh and docs gates: `.claude/rules/build-publish.md`, `.claude/rules/examples-site.md`.
The gate a task must pass before it is reported done: `.claude/rules/validation.md`.
Pre-commit (Husky) runs `yarn lint-staged` only; branch names are `<type>/<slug>` (`.husky/pre-push`, details in `.claude/rules/build-publish.md`).

## Commit Convention

Custom format `[type] subject`, lowercase type (NOT conventional-commits `type:`), parsed by `release.config.cjs`:

| Type                                                                | Release |
| ------------------------------------------------------------------- | ------- |
| `[release]`                                                         | major   |
| `[feat]`                                                            | minor   |
| `[fix]` `[perf]` `[revert]`                                         | patch   |
| `[chore]` `[docs]` `[test]` `[build]` `[ci]` `[refactor]` `[style]` | none    |

`[conf]` `[temp]` `[wip]` are valid, no release. Release flow (feature branches, `develop` → `main`, hotfixes): `.claude/rules/publishing-guards.md`, `documents/deploy.md`.

## Where things live

```text
src/core/        generate(), schemas, option resolution       → .claude/rules/theme-rules.md
src/features/    registry, theme-css, tokens, cva, ui, vite…   → .claude/rules/theme-rules.md
src/shared/      shared defaults and class-prefix tables       → .claude/rules/theme-rules.md
src/cli/ src/node/  CLI commands, config loading, watchers      → .claude/rules/cli-node.md
scripts/ .github/ package.json build configs                   → .claude/rules/build-publish.md
examples/ site/  sample apps, landing site                      → .claude/rules/examples-site.md
documents/       all documentation (index: documents/README.md) → .claude/rules/documentation-layout.md
```

Always loaded: `.claude/rules/publishing-guards.md` (registry lock, trusted publishing, no `NPM_TOKEN`).

## Project-Specific Workflow Rules

Read before any code or design work:

- `.claude/rules/agent-protocol.md` — request classification (plan required for complex code/design), session start; the repo vendors no agents, commands or skills.
- `.claude/rules/coding-standards.md` — TIER 0/1 rules; Socratic gate before complex changes.
- `.claude/rules/validation.md` — yarn gate before reporting done; **4-Phase plan protocol**. **NEVER write code before the user approves the plan.**
- `.claude/rules/lessons.md` — past mistakes; review at session start; append an entry on every user correction.

All documentation lives under `documents/`; never create a root `docs/` or `plans/` directory. `documents/plans/` and `documents/brainstorm/` are git-ignored local directories.
Docs use relative paths only. Plan layout: `documents/plans/YYYY-MM-DD/<plan-slug>/` (`plan.md` + `phase-NN-<name>.md`).

### ESM gotcha

`package.json` is `"type": "module"`. Ad-hoc Node scripts must use `import` syntax or the `.cjs` extension; `require()` in a `.js` file throws `ReferenceError: require is not defined in ES module scope`.
