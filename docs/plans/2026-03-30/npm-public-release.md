# NPM Public Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `@duydpdev/style-generator` automatically to the public npm registry from GitHub Actions using `semantic-release`.

**Architecture:** Keep the existing two-stage release flow. `release.yml` remains responsible for versioning and tagging through `semantic-release`, while `deploy.yml` builds the tagged source and publishes it to `registry.npmjs.org`. `main` produces stable releases and `develop` produces `DEV` prereleases.

**Tech Stack:** GitHub Actions, Yarn 4, semantic-release, npm public registry

---

### Task 1: Align package and registry metadata

**Files:**

- Modify: `package.json`
- Modify: `.yarnrc.yml`
- Test: `package.json`

- [ ] **Step 1: Review publish-relevant metadata**

Check package name, versioning strategy, `files`, `bin`, `repository`, and any registry overrides.

- [ ] **Step 2: Update npm registry configuration**

Set Yarn/npm publishing to target `https://registry.npmjs.org` instead of GitHub Packages while keeping the package scoped and public.

- [ ] **Step 3: Verify package metadata remains publishable**

Confirm `bin`, `files`, and repository fields are valid for npm package consumers.

### Task 2: Make semantic-release produce npm releases

**Files:**

- Modify: `release.config.cjs`
- Test: `release.config.cjs`

- [ ] **Step 1: Review current semantic-release plugins**

Check whether `@semantic-release/npm` is disabled and whether branch rules already match stable/prerelease expectations.

- [ ] **Step 2: Enable npm publishing in semantic-release**

Configure semantic-release to publish to npm public registry and preserve changelog/git/github release behavior.

- [ ] **Step 3: Ensure tagged release artifacts stay compatible**

Verify semantic-release still updates `package.json` and `CHANGELOG.md` and that publish happens from built package contents.

### Task 3: Update CI workflows for npmjs.org publishing

**Files:**

- Modify: `.github/workflows/release.yml`
- Modify: `.github/workflows/deploy.yml`
- Test: `.github/workflows/release.yml`
- Test: `.github/workflows/deploy.yml`

- [ ] **Step 1: Replace GitHub Packages-specific environment values**

Remove package-registry settings and token wiring that are tied to `npm.pkg.github.com`.

- [ ] **Step 2: Configure npm auth for GitHub Actions**

Use an npm automation token secret and set the registry explicitly to `https://registry.npmjs.org`.

- [ ] **Step 3: Keep workflow orchestration unchanged**

Preserve the existing flow: release tags first, deploy only when a new tag exists, back-merge only for stable `main` releases.

### Task 4: Verify build and package contents

**Files:**

- Test: `package.json`
- Test: `dist/**`
- Test: `README.md`

- [ ] **Step 1: Run the production build**

Run: `yarn build:all`
Expected: build completes and emits library + CLI artifacts into `dist/`.

- [ ] **Step 2: Inspect npm tarball contents**

Run: `npm pack --dry-run`
Expected: tarball includes built files, type declarations, README, and package metadata only.

- [ ] **Step 3: Document required repository secrets**

Note the required GitHub secret name for npm publishing and any one-time npm package visibility requirement such as `--access public`.
