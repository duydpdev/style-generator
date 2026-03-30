# Validation & Final Checks

## Final Checklist Protocol

Trigger when user says: "final checks", "verify", "pre-deploy", or similar.

**Execution order:**

1. Security → 2. Lint → 3. Schema → 4. Tests → 5. UX → 6. SEO → 7. Lighthouse/E2E

A task is NOT finished until checklist passes (or critical blockers are resolved).

## Available Scripts

| Script                     | Skill                 | When                |
| -------------------------- | --------------------- | ------------------- |
| `security_scan.py`         | vulnerability-scanner | Always on deploy    |
| `dependency_analyzer.py`   | vulnerability-scanner | Weekly / Deploy     |
| `lint_runner.py`           | lint-and-validate     | Every code change   |
| `test_runner.py`           | testing-patterns      | After logic change  |
| `schema_validator.py`      | database-design       | After DB change     |
| `ux_audit.py`              | frontend-design       | After UI change     |
| `accessibility_checker.py` | frontend-design       | After UI change     |
| `seo_checker.py`           | seo-fundamentals      | After page change   |
| `bundle_analyzer.py`       | performance-profiling | Before deploy       |
| `mobile_audit.py`          | mobile-design         | After mobile change |
| `lighthouse_audit.py`      | performance-profiling | Before deploy       |
| `playwright_runner.py`     | webapp-testing        | Before deploy       |

## Usage

```bash
# Quick validation during development
python .agent/scripts/checklist.py .

# Full verification before deployment
python .agent/scripts/verify_all.py . --url http://localhost:3000
```

## Plan Protocol (4-Phase)

| Phase             | Mode | Rule                                      |
| ----------------- | ---- | ----------------------------------------- |
| 1. ANALYSIS       | plan | Research, questions                       |
| 2. PLANNING       | plan | Create `docs/plans/YYYY-MM-DD/XX-name.md` |
| 3. SOLUTIONING    | plan | Architecture, design — NO CODE            |
| 4. IMPLEMENTATION | edit | Code + tests                              |

> 🔴 NEVER write code before user approves the plan. Wait for explicit "ok", "proceed", or equivalent.

### Plan File Structure

Save plans to `docs/plans/YYYY-MM-DD/XX-task-name.md`. Reset numbering (01, 02...) each new date.

```markdown
# Project Plan: [Task Name]

## Overview

[Short goal]

## Project Type

[WEB / BACKEND / MOBILE / LIBRARY]

## Success Criteria

1. [Condition 1]
2. [Condition 2]

## Task Breakdown

### [ ] Task 1: [Step name]

- **Agent**: [Agent name]
- **Input**: [Affected files]
- **Output**: [Expected result]
- **Verify**: [How to confirm done]
```
