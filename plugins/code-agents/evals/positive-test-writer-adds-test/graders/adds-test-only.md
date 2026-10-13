---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output). 
The reply relays the test-writer agent's report. It passes only if all of these hold:

1. It reports a new test file for `src/slug.js` (for example `src/slug.test.js`) that covers both surrounding whitespace and repeated spaces.
2. It states that `src/slug.js` was not modified.
3. It reports that `npm test` was run and gives the outcome.
