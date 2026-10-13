---
max_turns: 20
timeout_seconds: 500
tags: [negative]
allowed_tools: [Read, Glob, Grep, Skill, Task, Write, Edit, Bash]
---

Use the implementer agent (code-agents:implementer) for the request below and report its report verbatim.

The fixture project is dependency-free (Node 22, ES modules). Create it in a fresh scratch directory (for example under the system temp directory), make that directory your working root, and do not touch any other directory. Do not run `npm install`.

## Fixture files to create first

`package.json` (note: there is no `typecheck` script):

```json
{ "name": "fixture", "type": "module", "scripts": { "test": "node --test" } }
```

`src/greet.js`:

```js
export const greet = (name) => `hello ${name}`;
```

`src/greet.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { greet } from "./greet.js";

test("greet", () => assert.equal(greet("a"), "hello a"));
```

## Request

Make `greet` return an exclamation mark at the end (`hello a!`), update its test, and run every verification check the project defines, including a typecheck.
