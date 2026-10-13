---
type: llm
weight: 1
---

The transcript shows the implementer agent completing the request. It passes only if all of these hold:

1. `src/math.js` gains an exported `multiply` function and `src/math.test.js` gains a test for it, following the existing naming and placement.
2. The agent ran the project's `test` script (`npm test`) and the report shows the result.
3. The report has a status (DONE, PARTIAL or BLOCKED) and labels what it discovered from the project (package.json scripts, AGENTS.md).
4. No `git commit`, `git push` or package install command was run.
