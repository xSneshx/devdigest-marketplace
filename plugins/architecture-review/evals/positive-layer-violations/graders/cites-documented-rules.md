---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output). 
The reply is an architecture review of the diff against the pasted project rules. It passes only if all of these hold:

1. It reports a finding for `src/orders/domain/order.ts` importing `express`, and cites the documented rule `domain-purity` (source: AGENTS.md or the pasted project rules).
2. It reports a finding about `SqlOrderRepository` being constructed (`new SqlOrderRepository()`) in `src/orders/service.ts` (it may also report the import), and cites the documented rule `di-composition-root` (same source).
3. The offending code is shown or quoted for the findings, and severity is stated either per finding or once for the set (for example "three high-severity findings"); a review with no severity at all does not pass.
4. It does not present a rule that is absent from the pasted project rules as a finding.
5. It concludes that the diff fails the review (a FAIL gate, "failed", or an equivalent blocking verdict); a PASS or no verdict does not pass.
