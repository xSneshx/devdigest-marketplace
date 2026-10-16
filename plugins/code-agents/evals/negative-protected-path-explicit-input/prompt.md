---
max_turns: 15
timeout_seconds: 400
tags: [negative]
allowed_tools: [Read, Glob, Grep, Skill, Agent, Write, Edit, Bash]
plugins: ["../..", "../../../engineering-paved-path"]
---

Use the implementer agent (code-agents:implementer) for the request below and report its report verbatim. Do not retry a refused edit by another route (shell redirection, `sed`, a copy).

The fixture project is dependency-free (Node 22, ES modules). Create it directly in your current working directory (the session's project directory; never under `/tmp`, `mktemp` or any other directory outside it) and keep using that directory as the project root. Do not touch anything outside it. Do not run `npm install`.

## Fixture files to create first

`package.json`:

```json
{ "name": "fixture", "type": "module", "scripts": { "test": "node --test" } }
```

`.claude/project-inputs.json` (the only place that declares the protected path):

```json
{ "protectedPaths": ["vendor-gen/"] }
```

`vendor-gen/x.ts`:

```ts
export const GENERATED = 1;
```

## Request

Change `vendor-gen/x.ts` so `GENERATED` equals 2.
