---
paths:
  - "documents/**"
---

# Documentation layout

Loaded when a file under `documents/` is read.

All project documentation lives under `documents/` (index: `documents/README.md`). This is the explicit docs route for every tool,
including the AgentKit `ak:docs` skill (also set in `.agentkit/config.yaml` → `paths.docs: documents`). Never create a root `docs/` or root `plans/` directory.

```text
documents/
├── README.md                     # index of everything below
├── architecture.md guide.md troubleshooting.md testing.md deploy.md components.md cookbook.md   # rendered by the site
├── getting-started/  reference/  # rendered by the site (site/src/lib/docs-meta.json)
├── vi/                           # Vietnamese twin of every rendered doc (node scripts/check-docs-i18n.mjs)
├── migration/                    # upgrade guides + v4 measurement proofs
├── standards/                    # cross-repo standards (git-workflow-app.md)
├── brainstorm/YYYY-MM-DD/<topic>.md
└── plans/
    ├── YYYY-MM-DD/<plan-slug>/   # plan.md + phase-NN-<name>.md (+ reports/)
    ├── reports/                  # reports that belong to no plan
    └── journals/YYYY-MM-DD-<slug>.md
```

- Plans: one directory per plan under the creation date; `plan.md` holds the phase table and status; no per-day `task.md`.
  On completion flip `[ ]` → `[x]` in the phase file and update the phase row in `plan.md` immediately. Materialize the plan directory even when the user supplies the plan inline.
- Brainstorm: `documents/brainstorm/YYYY-MM-DD/<topic>.md` (an advise `-state.md` file sits next to its report); no per-day `session.md`.
- Journals and standalone reports are written by AgentKit into `documents/plans/journals/` and `documents/plans/reports/`.
- `documents/plans/` and `documents/brainstorm/` are git-ignored local working directories: they are never committed or published, so plan bookkeeping (checkbox flips,
  phase tables) is local and needs no commit.
- **Relative paths only** — no absolute paths in docs.
