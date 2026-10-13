---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output). 
The reply is the output of a dispatched researcher agent. It passes only if all of these hold:

1. It follows the researcher's structured report template: a "Research result" heading with a summary or conclusion, findings with evidence/location, and a section for what was not found or gaps (it may say "none"), with assumptions kept separate.
2. It states that after the last attempt `withRetry` rethrows the last error (`throw lastError`), citing `path:line` in `src/retry.ts`.
3. It is not a "Clarification needed" block, since the question is concrete.
