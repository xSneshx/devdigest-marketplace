---
type: llm
weight: 1
---

The response is the output of a dispatched researcher agent. It passes only if all of these hold:

1. The transcript shows a `Task` dispatch of `research-tools:researcher`.
2. The returned report follows the researcher's structured template: conclusions or findings, evidence, and an explicit list of what could not be found (gaps), with assumptions kept separate.
3. It states that after the last attempt `withRetry` rethrows the last error, citing `path:line` in `src/retry.ts`.
4. It is not a "Clarification needed" block, since the question is concrete.
