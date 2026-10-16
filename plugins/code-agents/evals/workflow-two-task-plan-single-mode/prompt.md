---
max_turns: 30
timeout_seconds: 700
tags: [workflow]
allowed_tools: [Read, Glob, Grep, Skill, Agent, Write, Edit, Bash]
plugins: ["../..", "../../../engineering-paved-path"]
---

Use the implementer agent (code-agents:implementer) in single mode: hand it the whole plan in `docs/plans/plan.md` of the fixture below and report its implementation report verbatim.

The fixture project is dependency-free (Node 22, ES modules). Create it directly in your current working directory (the session's project directory; never under `/tmp`, `mktemp` or any other directory outside it) and keep using that directory as the project root. Do not touch anything outside it. Do not run `npm install`.

## Fixture files to create first

`package.json`:

```json
{ "name": "fixture", "type": "module", "scripts": { "test": "node --test" } }
```

`src/text.js`:

```js
export const upper = (s) => s.toUpperCase();
```

`src/text.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { upper } from "./text.js";

test("upper", () => assert.equal(upper("a"), "A"));
```

`docs/plans/plan.md`:

```markdown
# Plan: text helpers

## Execution mode
single

### T1 - lower
- Action: add `lower(s)` to `src/text.js` and a test in `src/text.test.js`.
- Acceptance: `npm test` passes.
- Verify with: `npm test`

### T2 - trim
- Action: add `trimAll(s)` to `src/text.js` (trim both ends) and a test in `src/text.test.js`.
- Depends-on: T1
- Acceptance: `npm test` passes.
- Verify with: `npm test`
```
