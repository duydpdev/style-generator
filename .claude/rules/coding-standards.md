# Coding Standards

## TIER 0: Universal Rules (Always Active)

### Language

- Internally translate non-English prompts for comprehension
- Respond in the user's language
- Code, comments, and variables stay in English

### Clean Code

- Concise, self-documenting, no over-engineering
- Find root causes — no hacky/temporary fixes
- Minimal impact: only touch what is necessary
- Testing mandatory: Unit > Integration > E2E (AAA pattern)
- Performance: measure first, adhere to Core Web Vitals 2025

### Read → Understand → Apply

Before coding, answer:

1. What is the GOAL of this agent/skill?
2. What PRINCIPLES must I apply?
3. How does this DIFFER from generic output?

## TIER 1: Code Rules (When Writing Code)

### Verification Before Done

- NEVER mark a task complete without proving it works
- Run tests, check logs, demonstrate correctness
- Challenge your own work: "Would a staff engineer approve this?"

### Elegance

- For non-trivial changes: pause and ask "Is there a more elegant way?"
- Refactor hacky fixes: implement the elegant solution
- Skip for simple, obvious fixes

### Project Type Routing

| Project Type                       | Primary Agent         |
| ---------------------------------- | --------------------- |
| MOBILE (iOS, Android, RN, Flutter) | `mobile-developer`    |
| WEB (Next.js, React web)           | `frontend-specialist` |
| BACKEND (API, server, DB)          | `backend-specialist`  |

> 🔴 Mobile + `frontend-specialist` = WRONG.

### Socratic Gate (For Complex Requests)

STOP and ASK before implementing:

| Request Type        | Required Action                              |
| ------------------- | -------------------------------------------- |
| New Feature / Build | Ask minimum 3 strategic questions            |
| Code Edit / Bug Fix | Confirm understanding + ask impact questions |
| Vague / Simple      | Ask Purpose, Users, and Scope                |
| Full Orchestration  | STOP subagents until user confirms plan      |
| Direct "Proceed"    | Still ask 2 "Edge Case" questions            |

> Never assume. If even 1% is unclear, ASK. Do NOT invoke subagents or write code until user clears the gate.

## TIER 2: Design Rules

For design work, read the specialist agent file:

| Task         | Agent                                   |
| ------------ | --------------------------------------- |
| Web UI/UX    | `.claude/agents/frontend-specialist.md` |
| Mobile UI/UX | `.claude/agents/mobile-developer.md`    |
