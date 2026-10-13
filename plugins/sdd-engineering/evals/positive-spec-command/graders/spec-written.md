---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output). 
The reply passes only if it reports a spec written under `specs/` with numbered acceptance criteria (`AC-N`, at least two) that cover the `--dry-run` behaviour (prints what would be written, writes nothing).
