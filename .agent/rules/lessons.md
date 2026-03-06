# Lessons Learned

> **Self-Improvement Loop:** This file tracks mistakes, user corrections, and important project-specific patterns. **Review this file at the start of every session.**

Whenever the user corrects you on a mistake:

1. Identify the pattern or root cause.
2. Add a new entry here with the date, description, and the new rule to follow.

---

## Example Entry

### [2026-03-01] - Avoid Hardcoding API Keys

- **Mistake:** Hardcoded development API key in a test file.
- **New Rule:** ALWAYS use `process.env.TEST_API_KEY` for any test environments. Never commit literal tokens.

---

_(Add new lessons below this line)_
