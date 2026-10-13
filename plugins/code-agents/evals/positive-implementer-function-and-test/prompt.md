---
max_turns: 25
timeout_seconds: 600
tags: [positive]
allowed_tools: [Read, Glob, Grep, Skill, Agent, Write, Edit, Bash]
plugins: ["../..", "../../../engineering-paved-path"]
---

Use the implementer agent (code-agents:implementer) for the request below and report its DONE/PARTIAL/BLOCKED report verbatim.

The fixture project is dependency-free (Node 22, ES modules). Create it directly in your current working directory (the session's project directory; never under `/tmp`, `mktemp` or any other directory outside it) and keep using that directory as the project root. Do not touch anything outside it. Do not run `npm install`.

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
