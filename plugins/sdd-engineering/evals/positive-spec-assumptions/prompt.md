---
max_turns: 25
timeout_seconds: 600
tags: [positive]
allowed_tools: [Read, Write, Glob, Grep, Skill, Agent]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review", "../../../code-agents"]
---

/sdd-engineering:spec Write the spec now; do not ask questions and do not stop at a question stage. The working directory is intentionally empty: there is no code to read, and that is fine; specify from this text only.

Feature: add a `--dry-run` flag to the `export` command of the `fixture` CLI.

Requirements:
- `fixture export <target-dir> --dry-run` prints one line per file it would write, in the form `would write <path>`, and exits 0.
- With `--dry-run` nothing is written or modified on disk.
- Without `--dry-run` the command behaves exactly as it does today.
- Out of scope: any other command, other flags, config files.

One detail was not specified and is deliberately NOT a blocking question: the request does not say whether the printed paths are relative to the current directory or absolute. Do not ask about it; choose a sensible default yourself and record that choice in the spec's `## Assumptions` section, labelled as an assumption together with its consequence if wrong.

Write the spec file under `specs/` with numbered acceptance criteria (`AC-1`, `AC-2`, ...), then report the file path and quote the assumption you recorded.
