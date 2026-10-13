---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output). 
The reply relays the implementer agent's report. It passes only if all of these hold:

1. The report says `multiply` was added to `src/math.js` and a test for it to `src/math.test.js` (or the existing test file), and gives a status (DONE, PARTIAL or BLOCKED).
2. It reports that the project's `test` script (`npm test`) was run and states the outcome.
3. It labels what it discovered from the project (for example package.json scripts or AGENTS.md) instead of presenting it as assumed.
