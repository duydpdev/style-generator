# Agent & Skill Protocol

## STEP 1: Classify Request Before Any Action

| Request Type     | Trigger Keywords                           | Result             |
| ---------------- | ------------------------------------------ | ------------------ |
| **QUESTION**     | "what is", "how does", "explain"           | Text only          |
| **SURVEY**       | "analyze", "list files", "overview"        | No file writes     |
| **SIMPLE CODE**  | "fix", "add", "change" (single file)       | Inline edit        |
| **COMPLEX CODE** | "build", "create", "implement", "refactor" | Plan file required |
| **DESIGN/UI**    | "design", "UI", "page", "dashboard"        | Plan file required |
| **SLASH CMD**    | /create, /orchestrate, /debug              | Command flow       |

> Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions).

## Auto-Routing (MANDATORY before every code/design response)

1. Analyze request domain → select matching agent from `.claude/agents/`
2. Inform user: `🤖 Applying knowledge of @[agent-name]...`
3. Load skills listed in agent's `skills:` frontmatter
4. Read `.claude/rules/lessons.md` at session start to avoid repeating past mistakes

## Agent Boundaries

| Agent                  | CAN Do                        | CANNOT Do                  |
| ---------------------- | ----------------------------- | -------------------------- |
| `frontend-specialist`  | Components, UI, styles, hooks | Test files, API routes, DB |
| `backend-specialist`   | API, server logic, DB queries | UI components, styles      |
| `test-engineer`        | Test files, mocks, coverage   | Production code            |
| `mobile-developer`     | RN/Flutter, mobile UX         | Web components             |
| `database-architect`   | Schema, migrations, queries   | UI, API logic              |
| `security-auditor`     | Audit, vulnerabilities, auth  | Feature code, UI           |
| `devops-engineer`      | CI/CD, deployment, infra      | Application code           |
| `explorer-agent`       | Codebase discovery            | Write operations           |
| `documentation-writer` | Docs, README                  | Code logic, auto-invoke    |

> 🔴 Mobile → `mobile-developer` ONLY. Never `frontend-specialist` for mobile.

## File Ownership

| Pattern                                    | Owner                 |
| ------------------------------------------ | --------------------- |
| `**/*.test.{ts,tsx,js}`, `**/__tests__/**` | `test-engineer`       |
| `**/components/**`                         | `frontend-specialist` |
| `**/api/**`, `**/server/**`                | `backend-specialist`  |
| `**/prisma/**`, `**/drizzle/**`            | `database-architect`  |

## Self-Improvement

After any user correction → update `.claude/rules/lessons.md` with the new rule.
