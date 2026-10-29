#!/bin/sh
# Branch-name rule, shared by .husky/pre-push and the `Check branch name`
# step of .github/workflows/pr-title.yml (documents/deploy.md → Branching
# Strategy). Usage: sh scripts/check-branch-name.sh <branch>
types='feat|fix|docs|chore|ci|build|refactor|test|perf|revert'
slug='[a-z0-9]+(-[a-z0-9]+){0,5}'
pattern="^(($types|integrate)/$slug|(release|promote)/[^/]+|dependabot/.+)\$"
if printf '%s\n' "$1" | grep -Eq "$pattern"; then
  exit 0
fi
printf "Branch '%s' does not match <type>/<slug>.\n" "$1" >&2
printf '  type: %s; slug: 1-6 words of [a-z0-9] joined by "-" (feat/theme-axes).\n' "$types" >&2
printf '  Also allowed: release/<x>, promote/<x>, dependabot/**, integrate/<slug>.\n' >&2
printf '  See documents/deploy.md (Branching Strategy).\n' >&2
exit 1
