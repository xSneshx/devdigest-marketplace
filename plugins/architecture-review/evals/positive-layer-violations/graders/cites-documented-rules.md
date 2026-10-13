---
type: llm
weight: 1
---

The response is an architecture review of the diff against the pasted project rules. It passes only if all of these hold:

1. It reports a finding for `src/orders/domain/order.ts` importing `express`, and cites the documented rule `domain-purity` and its source (AGENTS.md).
2. It reports a finding for `new SqlOrderRepository()` in `src/orders/service.ts`, and cites the documented rule `di-composition-root` and its source (AGENTS.md).
3. Each finding quotes the offending line verbatim and has a severity.
4. It does not present a rule that is absent from the pasted project rules as a finding.
5. It ends with an explicit PASS or FAIL gate, and the gate is FAIL.
