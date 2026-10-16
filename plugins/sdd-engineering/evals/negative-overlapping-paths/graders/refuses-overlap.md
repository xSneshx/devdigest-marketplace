---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output). 
The reply passes only if it names the overlapping owned paths (`src/shared/**` and `src/shared/util/**`) as the reason it will not run the plan in parallel, and asks for the plan to be fixed (or proposes a fix) instead of implementing.
