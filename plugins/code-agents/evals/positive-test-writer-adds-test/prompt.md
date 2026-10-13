---
max_turns: 20
timeout_seconds: 500
tags: [positive]
allowed_tools: [Read, Glob, Grep, Skill, Task, Write, Edit, Bash]
---

Use the test-writer agent (code-agents:test-writer) for the request below and report its report verbatim.

The fixture project is dependency-free (Node 22, ES modules). Create it in a fresh scratch directory (for example under the system temp directory), make that directory your working root, and do not touch any other directory. Do not run `npm install`.

## Fixture files to create first

`package.json`:

```json
{ "name": "fixture", "type": "module", "scripts": { "test": "node --test" } }
```

`src/slug.js`:

```js
export function slug(text) {
  return text.trim().toLowerCase().replace(/\s+/g, "-");
}
```

## Request

Add a test file for `src/slug.js` covering surrounding whitespace and repeated spaces, then run the project's `test` script. Do not change `src/slug.js`.
