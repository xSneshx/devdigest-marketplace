---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output).
The reply relays the test-writer agent's report followed by the caller's own check line. It passes only if all of these hold:

1. It reports a new test file for `src/slug.js` (for example `src/slug.test.js`) that covers both surrounding whitespace and repeated spaces (the coverage table or test names suffice).
2. It reports a passing run of the project's test script (`npm test` / `node --test`) with the outcome.
3. It ends with the line `slug.js unchanged: yes`. A `no` or a missing line fails.
