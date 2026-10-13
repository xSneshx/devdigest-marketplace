---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output). 
The reply reports an executed run of the parallel plan, not a dry run. It passes only if it says implementers were dispatched for both T1 (`src/a/**`) and T2 (`src/b/**`) as independent tasks that could run concurrently, and reports the outcome of the run (task results and/or the review gate).
