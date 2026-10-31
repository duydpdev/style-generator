# Lessons Learned

> **Self-Improvement Loop:** This file records mistakes made, user corrections, and project-specific patterns. **Re-read it at the start of every session.**

When the user corrects a mistake:

1. Identify the pattern or root cause.
2. Add a new entry at the end of the file: date, context/mistake, new rule.

When a new rule replaces an old entry, edit or merge it in place; never leave two contradictory rules in the file.

---

### [2026-03-07 → 2026-09-29] - Always write a physical plan before coding, in the right layout

- **Mistake (repeated 2026-03-07, 03-08, 03-13, 03-16):** coded without a plan file; put the plan in the wrong directory; forgot to tick `[x]`; skipped creating the file when the user supplied the plan in the prompt.
- **New Rule:**
  1. Every non-trivial task MUST have a plan directory `documents/plans/YYYY-MM-DD/<plan-slug>/` containing `plan.md` + `phase-NN-<name>.md`, following the template in `.claude/rules/validation.md`, BEFORE coding. There is no per-day `task.md`.
  2. When the user supplies the plan inline ("Implement the following plan"), the plan directory MUST still be materialized as the first step.
  3. When a task is done, tick `[x]` in the phase file and update the Status column of `plan.md` in the same change, before reporting.

### [2026-03-07] - Never execute code before the plan is approved

- **Mistake (repeated 2026-03-08):** jumped to implementation before the user approved; combined the error explanation and the fix in a single turn.
- **New Rule:** STOP AND WAIT FOR APPROVAL after submitting a plan ("ok", "approved", "go ahead" or equivalent). A `[ ] Task` only becomes `[x]` after the user has agreed to the plan and the gate has exited 0.

### [2026-03-07] - Cross-platform and automated tests

- **Mistake:** fixed only for macOS and failed to notice the project lacked tests.
- **New Rule:** scripts and code MUST run on Linux, Windows and macOS (Node scripts, no dependency on one OS's shell). A new function MUST have a test proving its behavior.

### [2026-03-07] - No absolute paths in docs

- **Mistake:** used `file://` + a personal machine path in a README/plan — it leaks a personal directory structure and breaks the link on other machines.
- **New Rule:** every link in the project's git-tracked documentation uses a **relative path**.

### [2026-03-07] - Gate before reporting done

- **Mistake:** did not read the relevant skill instructions before starting, and reported done without running the verification gate.
- **New Rule:** NEVER mark a task done while the gate in `.claude/rules/validation.md` has not exited 0. Read the appropriate runtime skill before the implementation step.

### [2026-03-09] - Watch out for scripts in an ESM environment

- **Mistake:** ran a `.js` script that uses `require()` in a `"type": "module"` project → `ReferenceError: require is not defined in ES module scope`.
- **New Rule:** before creating a Node script, check `package.json`. If it is ESM, use `import` or a `.cjs` extension.

### [2026-06-07] - Expired CI token + reusable workflow permissions + GitHub Packages

- **Mistake/Context:** Release CI failed because the PAT `CI_WORKER_REPOSITORY_TOKEN` expired (checkout "could not read Username") and npm publish returned 404 because `NPM_TOKEN` expired. When moving to GitHub Packages, `packages: write` was almost left out of the caller workflow.
- **New Rule:**
  1. Prefer the built-in `GITHUB_TOKEN` (it expires with the job and needs no manual rotation) over an expiring PAT/npm token for CI publish/checkout. If a PAT is unavoidable → set a long expiry + a renewal reminder.
  2. **Reusable workflow (`workflow_call`)**: token permissions ⊆ caller job. For the called job (e.g. `deploy.yml`) to have `packages: write`, that permission MUST be declared on the **calling job** in `release.yml` (job `deploy`, `permissions: { contents: read, packages: write }`), not only in the called file. The top-level `permissions` of `release.yml` stay `contents: read` (least privilege), never raised to `packages: write`.
  3. Yarn Berry auth comes from `.yarnrc.yml` (`npmScopes.<scope>.npmAuthToken` interpolating an env var), NOT from the `.npmrc` that `setup-node registry-url` creates. Set the env var `YARN_NPM_AUTH_TOKEN` correctly.
  4. GitHub Packages on a private repo: only collaborators/granted users can install, even with a `read:packages` PAT → to share with outsiders, invite them or use an org.

### [2026-06-07] - An example workspace MUST NOT have a `postinstall` build hook

- **Mistake:** Added `"postinstall": "nuxt prepare"` to `examples/nuxt-v4/package.json`. CI `yarn install --immutable` runs this hook in the Link step — BEFORE the library `dist/` is built — and `nuxt.config.ts` importing `@duydpdev/style-generator/vite` could not resolve → the workspace build failed (exit 1) → the whole install failed. It passed locally because `dist/` already existed.
- **New Rule:** In a monorepo, an example/consumer workspace MUST NEVER define a lifecycle hook (`postinstall`/`prepare`) that calls a tool needing the built library (e.g. `nuxt prepare`, codegen). `yarn install --immutable` runs those hooks before the root build → fails. Change it to a manual script (`prepare:nuxt`) or let `dev`/`build`/`typecheck` handle it themselves. Check the existing examples (the current examples have NO install hook) before adding a script.
- **Related:** the root `tsconfig.json` uses `"include": ["src", "e2e"]`, so new `examples/*` are outside the scope of the pre-commit `tsc --noEmit` and need not be added to `exclude`. Each example type-checks with its own script (CI `peer-matrix` builds/type-checks `examples/react-v4`).

### [2026-09-29] - One `documents/` tree; do not vendor an agent/skill framework; keep history only from v4

- **Context:** The Antigravity/Gemini agent framework (a root `.agent` directory plus copies of agents/commands/skills under `.claude`) was out of sync with the runtime and forced running Python scripts that are not part of a TypeScript library's workflow. Docs were scattered across root `docs/` and `plans/`; plans as flat files + a per-day `task.md` were hard to follow when one plan has several phases. Plans/brainstorms before 2026-09-28 describe the API removed in 4.0.0.
- **New Rule:**
  1. The source of truth for agents is `.claude/CLAUDE.md` + `.claude/rules/*.md`. Do not add agent/command/skill directories back to the repo; use the runtime's skills.
  2. All documentation lives under `documents/` following the layout in the "Documentation layout" section of `.claude/CLAUDE.md`; `.agentkit/config.yaml` points `paths.docs`/`paths.plans` there. If any tool creates a root `docs/` or `plans/`, move the files into `documents/` before committing and fix that tool's configuration.
  3. Look up pre-2026-09-28 history in git history; do not restore it into the tree.

### [2026-09-30] - "Local build green" is not proof when node_modules holds hand-made links

- **Mistake:** Reported `yarn site:build` green in a gate. It passed only because of a stale hand-made symlink `node_modules/@duydpdev/style-generator -> ../..`. On a clean install Yarn never creates that link (root package = library, so `workspace:*` from site/examples is a dropped self-reference), and `Deploy Site` failed on the first push to `main`.
- **New Rule:** Prove build or resolution claims for workspace consumers in a clean worktree (`git worktree add --detach <tmp> HEAD && yarn install --immutable && …`), or in CI. Consumers of the root package use `link:`, not `workspace:*`.

### [2026-10-06] - chokidar `ready` does not mean the OS watch is armed

- **Mistake:** Replaced a test's `delay(200)` with `await once(watcher, "ready")` and wrote to the watched file right after. On macOS the change was never delivered (0/10), and the test hit Vitest's 5000 ms timeout because `vi.waitFor` also used `timeout: 5000`, so the real assertion was never reported.
- **New Rule:**
  1. Never write to a watched file synchronously after `ready`. Unit-test watcher wiring (singleton, debounce, error logging) with a fake `EventEmitter` watcher and fake timers. Keep a single real-chokidar test, and make sure it waits for an observable result (e.g. the initial debounced write) before its first mutation.
  2. Keep a `vi.waitFor` timeout (≤ 2000) below the test timeout.
  3. On Linux (`fs.watch`), `ready` fires after the root scan, before subdirectories are watched, so a write right after it can still be lost. Gate the first mutation on `server.watcher.getWatched()` listing the target file, bounded by a timeout that dumps the watched dirs on failure. Never retry-write to mask the race: it hides the bug and makes the test pass for the wrong reason.

### [2026-10-07] - Type tests against Zod types must spell `| undefined` on optional props

- **Mistake:** A `*.test-d.ts` compared `z.input<…>` with `toEqualTypeOf<{ prefixes?: string[]; … }>()`. Zod's `.optional()` infers `prefixes?: string[] | undefined`, and with `exactOptionalPropertyTypes: true` those are different types. TS 5.9 let it pass, but the TS 6 peer-matrix leg failed (`Expected 1 arguments, but got 0`) on PR #123.
- **New Rule:** When a type test mirrors a Zod-inferred type, write the expected optional props as `prop?: T | undefined`. Hand-written public types (e.g. `CoverageRule`) keep `prop?: T`. Reproduce a peer-matrix failure in a temporary worktree pinned through `resolutions` instead of loosening the assertion (`toExtend`) or making the leg non-blocking.

### [2026-10-28] - A failing CommonJS-mode check is a gate gap, not a documentable limitation

- **Mistake:** Phase 11 shipped `dist/*.d.cts` as byte copies of the `.d.ts`, reproduced `TS1479` for `vite.d.cts` under `module: node16`, and recorded it as a "known limitation" instead of making the repo gate model that consumer. The ESM-only gate (`typecheck:dist`, Bundler) passed locally on Vite 7; the peer-matrix Vite 5/6 legs failed with `TS2305` on PR #133, and `attw` was green throughout because it never resolves peer imports.
- **New Rule:** When a consumer-mode check fails on our own output, fix the output and add that mode to the repo gate (here `tsconfig.dts-check.cjs.json`, `node16`, `skipLibCheck: false`), then verify with a negative control (the plain copy must fail). Do not document it away. Check which TypeScript versions can parse new syntax in published declarations: `with { … }` import attributes are a parse error on TS < 5.3 even under `skipLibCheck`, `assert { … }` parses on every 5.x/6.x.

### [2026-10-29] - ESLint on `examples/**` needs the built library

- **Mistake:** Enabled type-aware ESLint on `examples/**` (CI-06) and verified it locally, where `dist/` existed. In a clean worktree (and in CI, where Lint ran before Build) every import of the `link:../..` library resolved to an error type and `no-unsafe-*` reported hundreds of findings.
- **New Rule:** Run `yarn build:all` before `yarn lint` (CI, `validation.md` gate, `gate.sh`). Prove lint changes that touch type resolution in a clean worktree before pushing; the local tree's `dist/` hides the failure. `lint-staged` runs `eslint --fix` on staged example files, so it also needs a local `dist/`.
