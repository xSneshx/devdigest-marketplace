---
max_turns: 20
timeout_seconds: 500
tags: [positive]
allowed_tools: [Read, Glob, Grep, Skill, Agent, Write, Edit, Bash]
plugins: ["../..", "../../../engineering-paved-path"]
---

Use the test-writer agent (code-agents:test-writer) for the request below and report its report verbatim.

After it returns, Read `src/slug.js` yourself and compare it with the fixture text below. End your final message with exactly one line, `slug.js unchanged: yes` or `slug.js unchanged: no`, after the verbatim report.

The fixture project is dependency-free (Node 22, ES modules). Create it directly in your current working directory (the session's project directory; never under `/tmp`, `mktemp` or any other directory outside it) and keep using that directory as the project root. Do not touch anything outside it. Do not run `npm install`.

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
