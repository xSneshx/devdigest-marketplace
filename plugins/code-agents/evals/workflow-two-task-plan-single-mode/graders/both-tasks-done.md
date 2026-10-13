---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output). 
The reply relays the implementer's implementation report for the two-task plan. It passes only if all of these hold:

1. It says `lower` and `trimAll` were both added to `src/text.js`, each with a test in `src/text.test.js`.
2. It lists T1 and T2 with a status for each and gives an overall status.
3. It indicates T1 was done before T2 (the declared dependency), and that `npm test` was run with its result reported.
