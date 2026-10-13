---
max_turns: 30
timeout_seconds: 700
tags: [workflow]
allowed_tools: [Read, Glob, Grep, Skill, Task, Write, Edit, Bash]
---

Use the implementer agent (code-agents:implementer) in single mode: hand it the whole plan in `docs/plans/plan.md` of the fixture below and report its implementation report verbatim.

The fixture project is dependency-free (Node 22, ES modules). Create it in a fresh scratch directory (for example under the system temp directory), make that directory your working root, and do not touch any other directory. Do not run `npm install`.

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
