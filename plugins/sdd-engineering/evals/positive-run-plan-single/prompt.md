---
max_turns: 30
timeout_seconds: 900
tags: [positive]
allowed_tools: [Read, Write, Edit, Glob, Grep, Bash, Skill, Agent]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review", "../../../code-agents"]
---

This is a real run, not a dry run: create the files below in your current working directory (never under `/tmp`), then execute the plan for real with `/sdd-engineering:execute-plan plan:docs/plans/plan.md` and report what the run did. The project is dependency-free (Node 22, ES modules); do not run `npm install`, do not ask me questions, and continue without waiting for confirmation.

`specs/tiny.md` (approved):

```markdown
# Spec: tiny functions

## Acceptance criteria
- AC-1: `src/a/a.js` exports `a()` returning `"a"`.
```

`docs/plans/plan.md`:

```markdown
# Plan: tiny functions

Source spec: specs/tiny.md

## Execution mode
single

### T1 - add a()
- Action: add function `a()` returning the string `"a"` in `src/a/a.js` (named export).
- Package: root
- Owned paths: `src/a/**`
- Depends-on: none
- ACs: AC-1
- Acceptance: `node -e "import('./src/a/a.js').then(m=>process.exit(m.a()==='a'?0:1))"` exits 0.
- Verify with: the command in Acceptance
```

`package.json`:

```json
{ "name": "fixture", "type": "module" }
```
