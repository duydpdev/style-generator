#!/bin/sh
# Branch-name rule, shared by .husky/pre-push and the `Check branch name`
# step of .github/workflows/pr-title.yml (documents/deploy.md → Branching
# Strategy). Usage: sh scripts/check-branch-name.sh <branch> [<base>]
# With <base> = main the head must also be one main accepts: main holds
# released code and hotfixes, so only develop, fix/<slug>, docs/<slug> and
# dependabot/** may open a PR into it.
types='feat|fix|docs|chore|ci|build|refactor|test|perf|revert'
slug='[a-z0-9]+(-[a-z0-9]+){0,5}'
if [ "$2" = "main" ]; then
  if printf '%s\n' "$1" | grep -Eq "^(develop|(fix|docs)/$slug|dependabot/.+)\$"; then
    exit 0
  fi
  printf "Branch '%s' cannot open a PR into main.\n" "$1" >&2
  printf '  Allowed heads: develop, fix/<slug>, docs/<slug>, dependabot/**.\n' >&2
  printf '  Features go into develop; main receives the develop -> main release PR and hotfixes.\n' >&2
  printf '  See documents/deploy.md (Branching Strategy).\n' >&2
  exit 1
fi
pattern="^(($types)/$slug|dependabot/.+)\$"
if printf '%s\n' "$1" | grep -Eq "$pattern"; then
  exit 0
fi
printf "Branch '%s' does not match <type>/<slug>.\n" "$1" >&2
printf '  type: %s; slug: 1-6 words of [a-z0-9] joined by "-" (feat/theme-axes).\n' "$types" >&2
printf '  Also allowed: dependabot/**.\n' >&2
printf '  See documents/deploy.md (Branching Strategy).\n' >&2
exit 1
