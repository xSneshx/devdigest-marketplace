---
type: llm
weight: 1
---

The run produced the full chain for the fixture project. It passes only if all of these hold:

1. A spec exists under the fixture's `specs/` with numbered acceptance criteria of the form `AC-N`.
2. The spec cites the fixture's own rule file (`CLAUDE.md`, rules `no-default-export` or `pure-core`) and cites no rule that is not in that file.
3. A plan exists whose tasks cite the spec's `AC-N` identifiers.
4. A code diff adds `farewell` in `src/core/` using a named export.
5. An architecture review report from the architecture-reviewer was produced for the changed set.
6. The final output contains a traceability matrix in which every `AC-N` maps to a task and to evidence.
