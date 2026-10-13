---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output). 
The reply reports an architecture review of the plan's changed set against the pasted project rules. It passes only if all of these hold:

1. It reports a finding for `src/orders/domain/cancel.ts` importing from `../infra/pg-pool.js`, citing the documented rule `domain-purity`.
2. It does not report a finding for `src/orders/service.ts`, which receives its repository through the constructor as the rules require (mentioning it as clean is fine).
3. It ends with an explicit gate verdict, and the gate is FAIL because a high or critical finding exists (severity may be stated per finding or once for the set).
