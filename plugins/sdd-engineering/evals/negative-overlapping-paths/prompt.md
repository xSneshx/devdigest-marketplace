---
max_turns: 20
timeout_seconds: 500
tags: [negative]
allowed_tools: [Read, Glob, Grep, Skill, Agent]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review", "../../../code-agents"]
---

/sdd-engineering:execute-plan Execute this plan:

Execution mode: parallel

- **T1** (Owned paths: `src/shared/**`): add `x()` in `src/shared/x.ts`. Depends-on: none.
- **T2** (Owned paths: `src/shared/util/**`): add `y()` in `src/shared/util/y.ts`. Depends-on: none.
