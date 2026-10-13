---
max_turns: 25
timeout_seconds: 600
tags: [positive]
allowed_tools: [Read, Write, Glob, Grep, Skill, Task]
---

/sdd-engineering:spec Add a `--dry-run` flag to the fixture CLI's `export` command that prints what would be written and writes nothing. The project has no spec yet; the project rules are in its `CLAUDE.md`: **no-default-export** (named exports only). Write the spec under `specs/`.
