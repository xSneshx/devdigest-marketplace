---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output). 
The reply passes only if it reports that a spec was written under `specs/` and that the missing ticket-system (Jira/MCP) access is recorded as an open question or assumption, rather than being an error that stopped the work.
