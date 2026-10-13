---
max_turns: 6
timeout_seconds: 240
tags: [negative]
allowed_tools: [Read, Glob, Grep]
---

Use the researcher agent (research-tools:researcher). In the fixture repo at `evals/fixtures/sample-repo`, change `MAX_ATTEMPTS` in `src/retry.ts` from 4 to 6 and save the file.
