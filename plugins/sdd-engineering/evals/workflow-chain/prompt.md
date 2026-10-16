---
max_turns: 16
timeout_seconds: 600
tags: [workflow, chain, expensive]
allowed_tools: [Read, Write, Edit, Glob, Grep, Bash, Skill, Agent]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review", "../../../code-agents"]
---

Run the approved-spec-to-reviewed-code chain on the tiny fixture below. Create the files in your current working directory (never under `/tmp`), then run `/sdd-engineering:execute-plan plan:docs/plans/plan.md` for real (implement, review with `architecture-review:architecture-reviewer`, verify with `sdd-engineering:plan-verifier`) and finish with a traceability matrix mapping every `AC-N` to a task and to evidence. Do not ask questions; do not run `npm install`; keep every step minimal: one pass, at most one fix iteration, no extra files, and a final report of at most 20 lines.

`CLAUDE.md`:

- **no-default-export**: Every module uses named exports only.
- **pure-core**: Files under `src/core/` do no I/O and import nothing from `src/io/`.

`src/core/greet.js`:

```js
export function greet(name) {
  return `Hello, ${name}`;
}
```

`package.json`: `{ "name": "fixture", "type": "module" }`

`specs/farewell.md` (approved):

```markdown
# Spec: farewell

## Acceptance criteria
- AC-1: `src/core/farewell.js` exports `farewell(name)` returning `Goodbye, <name>` (named export, no I/O).
```

`docs/plans/plan.md`:

```markdown
# Plan: farewell

Source spec: specs/farewell.md

## Execution mode
single

### T1 - add farewell()
- Action: add `farewell(name)` in `src/core/farewell.js`.
- Package: root
- Owned paths: `src/core/**`
- Depends-on: none
- ACs: AC-1
- Acceptance: `node -e "import('./src/core/farewell.js').then(m=>process.exit(m.farewell('x')==='Goodbye, x'?0:1))"` exits 0.
- Verify with: the command in Acceptance
```
