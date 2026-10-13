---
max_turns: 60
timeout_seconds: 1500
tags: [workflow, chain]
allowed_tools: [Read, Write, Edit, Glob, Grep, Bash, Skill, Task]
---

Run the spec-driven chain end to end on the tiny fixture project described below, in a scratch directory you create (`tmp/fixture/`). Do not touch anything outside it. Steps: (1) `/sdd-engineering:spec` for the feature, (2) `/sdd-engineering:plan` on that spec, (3) `/sdd-engineering:execute-plan` on the plan (implement, review with `architecture-review:architecture-reviewer`, verify), (4) finish with a traceability matrix mapping every `AC-N` to a task and to evidence.

## Fixture project

Create these files first. `tmp/fixture/CLAUDE.md`:

- **no-default-export**: Every module uses named exports only.
- **pure-core**: Files under `src/core/` do no I/O and import nothing from `src/io/`.

`tmp/fixture/src/core/greet.ts`:

```ts
export function greet(name: string): string {
  return `Hello, ${name}`;
}
```

`tmp/fixture/package.json` with a `test` script that prints `ok`.

## Feature request

Add a `farewell(name)` function next to `greet` in `src/core/`, with a one-line unit-test note in the plan.

Keep every step minimal; do not ask questions, assume sensible defaults and record them as open questions.
