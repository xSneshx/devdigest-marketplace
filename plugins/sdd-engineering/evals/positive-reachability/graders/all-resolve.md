---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output). 
The reply lists namespaced skills grouped by plugin (including skills from `engineering-paved-path`), reports each of the four commands (`spec`, `plan`, `execute-plan`, `verify`) as resolved whether it lists them as commands or as skills of `sdd-engineering`, and reports each of the five agents as resolved. It passes only if none of those four commands or five agents is reported unresolved and it does not invent skill names that look unrelated to the plugins.
