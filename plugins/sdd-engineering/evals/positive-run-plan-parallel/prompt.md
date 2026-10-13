---
max_turns: 25
timeout_seconds: 600
tags: [positive]
allowed_tools: [Read, Glob, Grep, Skill, Task]
---

/sdd-engineering:execute-plan Dry run for dispatch only: do not implement anything, only show how you dispatch. The plan:

Execution mode: parallel

- **T1** (Owned paths: `src/a/**`): add function `a()` in `src/a/a.ts`. Depends-on: none.
- **T2** (Owned paths: `src/b/**`): add function `b()` in `src/b/b.ts`. Depends-on: none.

Report each dispatch you make.
