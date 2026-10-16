---
max_turns: 25
timeout_seconds: 600
tags: [negative]
allowed_tools: [Read, Glob, Grep, Skill, Agent]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review", "../../../code-agents"]
---

/sdd-engineering:execute-plan Dry run for dispatch only: do not implement anything beyond reporting. The plan:

Execution mode: single

- **T1** (Owned paths: `src/a/**`): add function `a()` in `src/a/a.ts`. Depends-on: none.

Treat the implementer's report as DONE with all checks passing, then finish the run and give your final report.
