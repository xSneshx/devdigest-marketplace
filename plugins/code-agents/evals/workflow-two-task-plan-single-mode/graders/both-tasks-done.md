---
type: llm
weight: 1
---

Grade the transcript. It passes only if all of these hold:

1. `lower` and `trimAll` were both added to `src/text.js`, each with a test in `src/text.test.js`.
2. The report has a per-task table listing T1 and T2 with a status for each, and an overall status.
3. T1 was done before T2 (the declared dependency), and `npm test` was run and its result reported.
4. No `git commit`, `git push` or package install command was run.
