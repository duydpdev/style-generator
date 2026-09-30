<!--
Title: `[type] subject` — the `PR title (commitlint)` check enforces it.
Feature → develop is squash-merged, so the title becomes the commit and drives
the version bump: `[release]` major, `[feat]` minor, `[fix]` `[perf]` `[refactor]`
`[style]` `[revert]` patch, `[docs]` `[chore]` `[test]` `[build]` `[ci]` none.
A BREAKING CHANGE footer in the body is dropped by the squash; declare a major
with `[release]` in the title.
-->

## What and why

## Merge method

- [ ] Feature → `develop`: **Squash and merge**
- [ ] Promote `develop` → `main`: **Create a merge commit** (never squash)

## Checks

- [ ] Breaking change for consumers (if yes: title is `[release] …` and `documents/migration/` is updated)
- [ ] Gate from `.claude/rules/validation.md` passes locally
