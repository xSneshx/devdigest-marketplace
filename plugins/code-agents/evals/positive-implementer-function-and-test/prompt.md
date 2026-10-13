---
max_turns: 25
timeout_seconds: 600
tags: [positive]
allowed_tools: [Read, Glob, Grep, Skill, Task, Write, Edit, Bash]
---

Use the implementer agent (code-agents:implementer) for the request below and report its DONE/PARTIAL/BLOCKED report verbatim.

The fixture project is dependency-free (Node 22, ES modules). Create it in a fresh scratch directory (for example under the system temp directory), make that directory your working root, and do not touch any other directory. Do not run `npm install`.

## Fixture files to create first

`package.json`:

```json
{ "name": "fixture", "type": "module", "scripts": { "test": "node --test" } }
```

`src/math.js`:

```js
export function add(a, b) {
  return a + b;
}
```

`src/math.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { add } from "./math.js";

test("add", () => assert.equal(add(1, 2), 3));
```

`AGENTS.md`: "Tests live next to the source as `<name>.test.js`. Run `npm test`."

## Request

Add `multiply(a, b)` to `src/math.js` and a test for it in `src/math.test.js`, then run the project's `test` script.
