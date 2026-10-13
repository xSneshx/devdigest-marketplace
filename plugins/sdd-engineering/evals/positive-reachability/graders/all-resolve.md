---
type: llm
weight: 1
---

Judge only the final reply (the caller's last message, which may paraphrase the agent's output).
Commands may legitimately be reported as skills of the same plugin, and manual-only items (for example
`sdd-retro` / `workflow-retro`) are hidden from the model by design: never penalise their absence. It passes only if all of these hold:

1. The five agents `sdd-engineering:spec-creator`, `sdd-engineering:implementation-planner`, `sdd-engineering:plan-verifier`, `code-agents:implementer` and `architecture-review:architecture-reviewer` are each reported as resolved (visible). Any of them reported unresolved or missing fails.
2. The reply lists namespaced skills (`plugin:skill`) including at least `sdd-engineering:run-plan` and some `engineering-paved-path:*` skills, each under its plugin.
3. Each of the four commands `spec`, `plan`, `execute-plan`, `verify` is reported as resolved, whether listed as a command or as a `sdd-engineering:<name>` skill. Reported unresolved fails.
4. It does not list skill names that are unrelated to these plugins.
