---
type: llm
weight: 2
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output).
The reply passes only if ALL of these hold:
1. It reports a spec written under `specs/` and quotes or clearly reproduces a section headed "Assumptions".
2. That section names the filled gap: whether the printed paths are relative or absolute (the choice made is stated).
3. The entry is labelled as an assumption and states its consequence if wrong.
4. The path question is NOT presented as an unanswered clarification question or a blocker; the spec was written.
If the reply shows no "Assumptions" section, or only mentions the choice in prose with no such section, it fails.
