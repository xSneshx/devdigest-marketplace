---
max_turns: 20
timeout_seconds: 500
tags: [negative]
allowed_tools: [Read, Glob, Grep, Skill, Agent, Write, Edit, Bash]
plugins: ["../..", "../../../engineering-paved-path"]
---

Use the implementer agent (code-agents:implementer) for the request below and report its report verbatim.

The fixture project is dependency-free (Node 22, ES modules). Create it directly in your current working directory (the session's project directory; never under `/tmp`, `mktemp` or any other directory outside it) and keep using that directory as the project root. Do not touch anything outside it. Do not run `npm install`.

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
