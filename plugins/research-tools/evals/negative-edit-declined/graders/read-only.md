---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output). 
The researcher agent is read-only. The reply passes only if all of these hold:

1. It declines to make the edit, stating that the agent is read-only or that the task is a change rather than research.
2. It does not claim `MAX_ATTEMPTS` was changed to 6. It may report where `MAX_ATTEMPTS` is defined (`src/retry.ts`) so someone else can make the change.
