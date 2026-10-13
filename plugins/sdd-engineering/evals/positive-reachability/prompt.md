---
max_turns: 15
timeout_seconds: 400
tags: [positive, reachability]
allowed_tools: [Read, Glob, Grep, Skill, Task]
---

Report what this plugin set makes reachable. Do not do any other work.

1. List the skills that are available in your context under a namespaced name (`plugin:skill`), grouped by plugin.
2. For each of these commands say whether it resolves: `/sdd-engineering:spec`, `/sdd-engineering:plan`, `/sdd-engineering:execute-plan`, `/sdd-engineering:verify`, `/sdd-engineering:sdd-retro`.
3. For each of these agents say whether it resolves: `sdd-engineering:spec-creator`, `sdd-engineering:implementation-planner`, `sdd-engineering:plan-verifier`, `code-agents:implementer`, `architecture-review:architecture-reviewer`.

Say "unresolved" for anything you cannot see; do not guess.
