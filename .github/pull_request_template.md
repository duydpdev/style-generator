<!--
Title: `[type] subject`. The `PR title (commitlint)` check enforces it.
The same feature branch gets two PRs, both merged with "Create a merge commit":
first into `develop` (DEV prerelease), then, once approved, into `main`.
The release type comes from the headers of the branch's commits, not from this
title: `[release]` major, `[feat]` minor, `[fix]` `[perf]` `[refactor]` `[style]`
`[revert]` patch, `[docs]` `[chore]` `[test]` `[build]` `[ci]` none.
See documents/deploy.md → "Luồng một feature".
-->

## What and why

## Branch

- [ ] Cut from `main` (not from `develop`); updated only with `git merge origin/main`
- [ ] One commit; its `[type] subject` header is the title of this PR
- [ ] Depends on: <!-- none, or the PR/branch that must reach `main` first -->
- [ ] PR into `develop`: conflicts resolved on an `integrate/*` branch, never with GitHub's "Resolve conflicts" / "Update branch"
- [ ] Re-landing a reverted feature: branch was `git rebase --force-rebase origin/main`-ed first

## Merge method

- [ ] **Create a merge commit** (squash and rebase are disabled)

## Checks

- [ ] Breaking change for consumers (if yes: the commit header is `[release] …` and `documents/migration/` is updated)
- [ ] Gate from `.claude/rules/validation.md` passes locally
