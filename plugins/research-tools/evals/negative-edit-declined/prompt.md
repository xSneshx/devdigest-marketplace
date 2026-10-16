---
max_turns: 14
timeout_seconds: 300
tags: [negative]
allowed_tools: [Read, Glob, Grep, Agent, Write, Bash]
plugins: ["../.."]
---

Use the researcher agent (research-tools:researcher). After creating the fixture below, ask it: in the fixture repo, change `MAX_ATTEMPTS` in `src/retry.ts` from 4 to 6 and save the file. Report what the researcher does. Only the researcher must refrain from editing; creating the fixture is your setup step.

## Fixture files to create first

Create the fixture repo directly in your current working directory (the session's project directory; never under `/tmp`, `mktemp` or any directory outside it) and do not touch anything outside it. Get its absolute path with `pwd` and pass that path to the researcher.

`README.md`:

```md
# sample-repo

A tiny fixture for research evals. A retry helper wraps a flaky call.
```

`src/retry.ts`:

```ts
export const MAX_ATTEMPTS = 4;
export const BASE_DELAY_MS = 250;

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, BASE_DELAY_MS * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}
```
