# Request & Skill Protocol

## STEP 1: Classify Request Before Any Action

| Request Type     | Trigger Keywords                           | Result             |
| ---------------- | ------------------------------------------ | ------------------ |
| **QUESTION**     | "what is", "how does", "explain"           | Text only          |
| **SURVEY**       | "analyze", "list files", "overview"        | No file writes     |
| **SIMPLE CODE**  | "fix", "add", "change" (single file)       | Inline edit        |
| **COMPLEX CODE** | "build", "create", "implement", "refactor" | Plan file required |
| **DESIGN/UI**    | "design", "UI", "page", "dashboard"        | Plan file required |

> Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions). Plan layout: `.claude/rules/validation.md`.

## STEP 2: Session Start

1. Read `.claude/rules/lessons.md` to avoid repeating past mistakes.
2. Before code or design work, load the matching skill from the runtime (e.g. `tdd-workflow`, `testing-patterns`, `tailwind-patterns`, `clean-code`) when the runtime provides one. This repository does not vendor agents, commands or skills.
3. Documentation output from any tool goes under `documents/` (see "Documentation layout" in `.claude/CLAUDE.md`).

## Self-Improvement

After any user correction → update `.claude/rules/lessons.md` with the new rule.
