---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output). 
The reply is a research report about the fixture repo. It passes only if all of these hold:

1. It states the call is attempted at most 4 times (`MAX_ATTEMPTS = 4`) and that the delay is exponential starting at 250 ms (doubling per attempt).
2. Its claims cite `path:line` evidence in `src/retry.ts`, and the cited lines match the content.
3. It does not invent files, lines or values that are absent from the fixture.
4. It separates findings from assumptions or gaps.
