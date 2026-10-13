---
type: llm
weight: 1
---

The transcript shows the test-writer agent completing the request. It passes only if all of these hold:

1. A new test file for `src/slug.js` exists (for example `src/slug.test.js`) and covers both surrounding whitespace and repeated spaces.
2. `src/slug.js` was not modified.
3. The agent ran `npm test` and the report shows the outcome.
4. No `git commit` or `git push` was run.
