---
type: llm
weight: 1
---

The response is a research report about the fixture repo. It passes only if all of these hold:

1. It states the call is attempted at most 4 times (`MAX_ATTEMPTS = 4`) and that the delay is exponential starting at 250 ms (doubling per attempt).
2. Each project claim cites `path:line` evidence in `src/retry.ts` (for example `src/retry.ts:1` and `src/retry.ts:10`), and the cited lines match the content.
3. It does not invent files, lines or values that are absent from the fixture.
4. It separates findings from assumptions or gaps.
