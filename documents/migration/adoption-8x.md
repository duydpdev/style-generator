# Adopting 8.x in two real apps

This page records every snag two applications hit while moving to 8.x, and what became of each one.
An entry stays on the page after it is resolved, so the next upgrade can start from the same evidence.

## How an entry reads

```md
### <app>: <short title>

- Step: the migration step that was running
- The docs said: what the guide or reference stated for that step
- What happened: the observed result, with the command or error text
- Time lost: how long the snag took to clear
- Conclusion: `fix lib`, `fix docs` or `no fix: <reason>`
```

## learn-sql (7.2.0 to 8.1.1)

### learn-sql: pin 8.0.2 with TypeScript 7.0.2 installed

- Step: `bun add --dev --exact @duydpdev/style-generator@8.0.2`
- The docs said: nothing about the TypeScript peer
- What happened: `bun add` printed no peer warning although the 8.0.2 range is `typescript ^5.0.0 || ^6.0.0` and TypeScript 7.0.2 is installed; `tsc --noEmit` for both tsconfig files exits 0 against the 8.0.2 declarations. bun does not report unmet peers, so this says nothing about yarn or npm
- Time lost: 0
- Conclusion: no fix: a clean run; the peer range itself moved to `^7.0.0` in 8.1.0

### learn-sql: `init --rules-only` prints a CSS snippet for a default path

- Step: `style-gen init --rules-only` from the repo root
- The docs said: [7.x to 8.0](./7.x-to-8.0.md) "New in 8.0": refresh only the agent rules with `style-gen init --rules-only`
- What happened: the rules file was updated, then the command printed `Keep these lines in styles/index.css … @import "./theme.css"; @source not "../.claude";`. This app's CSS is `ui/src/index.css` importing `./theme/theme.css`, and the config names `src/theme/`; the hint ignores the configured `output`
- Time lost: 1 minute to confirm the app needs no change
- Conclusion: fix lib

### learn-sql: bare `: RecipeFn` annotations on 53 recipes in 24 files

- Step: [7.x to 8.0](./7.x-to-8.0.md) B9
- The docs said: a `: RecipeFn` annotation still compiles but opts out of the check; remove it to get the check
- What happened: removing every annotation and the `type RecipeFn` import took 24 import lines by hand and 53 declarations by one AST codemod; `tsc` exits 0 for both tsconfig files and no value was flagged
- Time lost: 5 minutes
- Conclusion: fix docs

### learn-sql: an existing config gets no `$schema`

- Step: `style-gen schema`
- The docs said: `style-gen schema` also writes `style-gen.config.schema.json`, which editors use for the `$schema` key
- What happened: the file appeared untracked; an existing config does not get the `$schema` key (only `init` for a new config writes it). The key was added by hand
- Time lost: 1 minute
- Conclusion: fix docs

### learn-sql: generated CSS identical across 7.2.0 and 8.0.2

- Step: regenerate `theme.css` after the upgrade
- The docs said: regenerating `theme.css` after the upgrade produces the same file
- What happened: after deleting the working-copy `theme.css`, `style-gen generate` (8.0.2) wrote a file that `cmp` reports equal to the 7.2.0 output; CSS gzip 12669 B (budget 14000 B); `make ui-test` exits 0 with `drift: ok` once. The file is also byte-identical on 8.1.0 and 8.1.1
- Time lost: 0
- Conclusion: no fix: the migration promise holds

Summary: 7.2.0 to 8.1.1 (8.0.2, then 8.1.0, then 8.1.1). Time lost on listed snags: 7 minutes. The sections that produced an entry or a change: B1 (options in `style-gen.config.json`), B2 (generated `theme.tokens.ts`), B9 (`RecipeFn`). The other sections of the 7.x to 8.0 page produced no entry.

## ecommerce-repo (4.0.3 to 8.1.1)

### ecommerce-repo: install source for a private `@duydpdev` scope

- Step: pin 8.1.1
- The docs said: nothing about an app whose `.npmrc` sends the `@duydpdev` scope to GitHub Packages (8.x is on npmjs.org, GitHub Packages stops at 7.1.1)
- What happened: `@duydpdev/logger` still lives on GitHub Packages, so the scope line stays. The app depends on the npmjs.org tarball URL `https://registry.npmjs.org/@duydpdev/style-generator/-/style-generator-8.1.1.tgz` in three manifests. A `peerDependencies` entry cannot be a URL, so the `ui` package peer is the bare `8.1.1`; `pnpm why` shows one version
- Time lost: about 10 minutes (decision plus lockfile)
- Conclusion: fix docs

### ecommerce-repo: renames and removed root exports across four majors

- Step: the four migration pages in order, `pnpm typecheck` after each
- The docs said: [4.x to 5.0](./4.x-to-5.0.md) "Token naming" table (`variantColor` to `colors`, `roundedOption` to `borderRadius`), `Breakpoint` stays a const object, [7.x to 8.0](./7.x-to-8.0.md) B6 (one export site) and B7 (`resolveSpacingProps` replaced by `splitSpacing`)
- What happened: 10 `DesignTokens.Web.*` reads renamed across 6 `style.ts` files and 2 web sections; `Breakpoint` now from `/tokens`; `ResponsiveValueStrict` from `/types` (2 files); `Box.tsx` and `Text.tsx` moved to `splitSpacing` with `DesignTokens.Web.spacingProperties` (B7's Before and After mapped one to one, `classNames` to `className`). Typecheck reported 16 errors before and 0 after
- Time lost: about 15 minutes
- Conclusion: no fix: the tables were enough

### ecommerce-repo: stale `theme.schema.json` (B5)

- Step: [7.x to 8.0](./7.x-to-8.0.md) B5
- The docs said: a committed `theme.schema.json` lists `backDropBlurs`; regenerate it with `style-gen schema`
- What happened: `style-gen schema --out` refuses a path outside the project root and also writes `style-gen.config.schema.json`; the app passed in-root `--out` and `--config-out` names, replaced its schema and deleted the config schema. The new schema also bounds `fontWeight` to 1 to 1000 and no longer requires `letterSpacing`, which the page did not mention
- Time lost: 5 minutes
- Conclusion: fix docs

### ecommerce-repo: local `cn` replaced by `createCn`

- Step: replace the app's own `tailwind-merge` setup
- The docs said: [UI kit](../reference/ui.md) `createCn(tokens)` is `clsx` plus `tailwind-merge` extended by `createTailwindMergeExtension`; peer `tailwind-merge ^3.0.0`
- What happened: a test (`cn("text-16-medium text-primary")` keeps both classes, `cn("px-2", "px-4")` is `px-4`) passed on the old `tailwind-merge` 2 `cn`, then on `createCn(DesignTokens.Web)` with `tailwind-merge ^3.0.0`; the 18-line typography group is gone. The old `cn` already kept both classes, so the swap removed code, not a bug
- Time lost: about 10 minutes
- Conclusion: no fix: `createCn` works as documented

### ecommerce-repo: default color coverage grew the CSS over budget

- Step: the app's `check:css-budget` (14925 B gzip) after the pin
- The docs said: [5.3 to 5.4](./5.3-to-5.4.md) "colors now feed seven prefixes", with `coverage.colors.prefixes: ["bg", "text", "border"]` to keep three
- What happened: the budget failed at 17589 B gzip against 13351 B on 4.0.3 (+3811 B gzip; the 5.3 to 5.4 page lists +540 to 630 B). Raw CSS grew from 27251 B to 29213 B: the `--sg-color-` variable prefix plus four more prefixes on every color and state line. `coverage: { colors: { prefixes: ["bg", "text", "border"] } }` brought it to 13778 B. Apart from the `--sg-color-` rename, the trimmed 8.1.1 CSS differs from 4.0.3 by one line: the border line gains `border-s`, `border-e`, `divide-x`, `divide-y`. The app builds every `ring-*` class as a literal, so nothing it uses is lost
- Time lost: about 15 minutes
- Conclusion: fix docs

### ecommerce-repo: stale facts in the app's own docs

- Step: grep the app's docs for old library statements
- What happened: two app rule files said Tailwind v4 has no `--border-width-*` namespace, so `borderWidth` was out of scope; the library supports it ([4.x to 5.0](./4.x-to-5.0.md)). Both were corrected, plus three places that still named `3.1.0-DEV.2` and GitHub Packages for `style-generator`
- Time lost: about 10 minutes
- Conclusion: no fix: the statements were the app's own

### ecommerce-repo: tests and hygiene on the migrated branch

- Step: `pnpm test`, `pnpm knip`, `pnpm syncpack`
- What happened: `@ecommer/ui` (110 tests) and `web` (39 tests) pass; the `@ecommer/api` e2e suite needs Postgres and fails without it, as the app's docs say. `knip` (report-only) names no library package. `syncpack` (report-only) reports the tarball URL in three manifests against the bare `8.1.1` in the `ui` peer
- Time lost: about 5 minutes
- Conclusion: no fix: a URL dependency cannot match a peer range textually

Summary: 4.0.3 to 8.1.1. Time lost on listed snags: 70 minutes. Sections that applied: the 4.x to 5.0 token renames, 7.x to 8.0 B5, B6, B7, and the 5.3 to 5.4 coverage option; the app also adopted `createCn` (UI kit).

4.x to 8.x: the four pages in order were sufficient (time: 70 minutes). The two gaps were the size cost of the default color coverage and the install route behind a scope mapped to GitHub Packages, both `fix docs` above, so no merged 4.x to 8.x page is written.

## style-generator itself (8.0.2 to 8.1.1)

### style-generator CI: Tailwind 4.3.3 flattens nesting in `build()`

- Step: `yarn verify` with Tailwind 4.3.5
- The docs said: nothing (the peer range is `^4.1.0`; CI pinned 4.3.0)
- What happened: 60 integration tests failed; `generate().css` is byte-identical on 4.3.0 and 4.3.5, but `build()` output changed shape at 4.3.3 (tailwindlabs/tailwindcss#20124): `.divide-primary { :where(…) }` became `:where(.divide-primary > …)`. Production `optimize()` output is byte-identical for consumers. From 4.3.4, pseudo-element variants on divide utilities (`placeholder:divide-*`) no longer emit. The tests now use shape-agnostic helpers
- Time lost: about 25 minutes
- Conclusion: no fix: a Tailwind change; the tests match both shapes

### style-generator CI: a peer range change needs `yarn.lock`

- Step: the TypeScript peer PR
- The docs said: nothing
- What happened: workspace `peerDependencies` are recorded in `yarn.lock`; `yarn install --immutable` failed on every CI job (YN0028) until the regenerated `yarn.lock` was committed
- Time lost: 8 minutes
- Conclusion: no fix: a repo rule worth remembering when touching `peerDependencies`

### TypeScript peer discovery

- Step: the packed 8.1.0 tarball in a scratch npm project (`vite@7`, `tailwindcss@4`, `tailwind-merge@3`, `@types/react@19`, a `.cts` and an `.mts` consumer, `module` and `moduleResolution` `node16`, strict)
- What happened: TypeScript 5.0.4 (`skipLibCheck` true), 5.2.2 (true), 5.9.3 (false), 6.0.3 (false) and 7.0.2 (false) all exit 0 with no output
- Time lost: 0
- Conclusion: no fix: a clean run on every leg

### style-generator build: Vite 8 and the size budgets

- Step: `vite` ^8.3.8 with `manualChunks` removed
- The docs said: `manualChunks` is deprecated in favour of `advancedChunks` (now `output.codeSplitting.groups`)
- What happened: with no chunk rules `cva` measured 1007 B (126 % of 800) and `tokens` 1835 B (99 %); groups `helpers`, `cva`, `tokens` (`includeDependenciesRecursively: false`) give `cva` 752 B, `tokens` 1675 B, `spacing` 819 B and no budget changed. A group named like an entry merges with it. Declarations are byte-identical to 8.1.0
- Time lost: about 40 minutes
- Conclusion: no fix: the chunk rules moved to `codeSplitting.groups` in 8.1.1

### style-generator build: Rolldown ships no sourcemap for code-free files

- Step: `yarn check:externals`
- What happened: seven files had no `.map` (`spacing`, `types` and `ui-react` in both formats, plus the `rolldown-runtime-*.cjs` interop shim: pure re-exports, empty type-only entries). The gate now accepts a map-less file only when it is that shim or contains only relative import, export or require statements; real code without a map still fails (negative controls in `publish-gates.test.ts`)
- Time lost: about 30 minutes
- Conclusion: no fix: already handled in 8.1.1 by the adjusted gate

### style-generator CI: a rendered-page change fails `Site visual regression`

- Step: the 8.1.1 PR that changed the architecture page
- What happened: 6 snapshots of one page failed; regenerating baselines rewrote 32 files (the later slices shift with the paragraph length). `check:next-build` also hit a transient registry 404 once and passed on rerun
- Time lost: about 20 minutes
- Conclusion: no fix: the expected behaviour of the visual gate
