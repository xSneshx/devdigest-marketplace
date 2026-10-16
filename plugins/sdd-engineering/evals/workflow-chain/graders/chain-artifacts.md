---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agents' output). The reply summarises the run of the plan for the fixture project. It passes only if all of these hold:

1. It reports an implementation of `farewell` in `src/core/` with a named export.
2. It reports an architecture review of the changed set (gate PASS, or findings if any).
3. It reports a verification result for AC-1 (for example from plan-verifier).
4. It contains a traceability matrix in which `AC-1` maps to task T1 and to evidence.
