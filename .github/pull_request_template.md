<!--
Title: `[type] subject`. The `PR title (commitlint)` check enforces it.
A feature is one PR into `develop`, merged with "Create a merge commit"; that
merge publishes nothing. A stable release is the separate PR `develop` -> `main`
(documents/deploy.md -> "Cutting a release").
The release type comes from the headers of the branch's commits, not from this
title: `[release]` major, `[feat]` minor, `[fix]` `[perf]` `[revert]` patch,
`[refactor]` `[style]` `[docs]` `[chore]` `[test]` `[build]` `[ci]` none.
See documents/deploy.md -> "Feature flow".
-->

## What and why

## Branch

- [ ] Cut from `develop`; updated only with `git merge origin/develop`
- [ ] One commit; its `[type] subject` header is the title of this PR
- [ ] Depends on: <!-- none, or the PR/branch that must reach `develop` first -->
- [ ] Hotfix only: cut from `main`, PR into `main`, branch `fix/<slug>` or `docs/<slug>`
- [ ] Re-landing a reverted feature: branch was `git rebase --force-rebase origin/develop`-ed first

## Merge method

- [ ] **Create a merge commit** (squash and rebase are disabled)

## Checks

- [ ] Breaking change for consumers (if yes: the commit header is `[release] …`, the major cycle is open (`gh variable get MAJOR_CYCLE` prints `open`) and `documents/migration/` is updated)
- [ ] Gate from `.claude/rules/validation.md` passes locally
