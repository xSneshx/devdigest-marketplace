---
max_turns: 25
timeout_seconds: 600
tags: [positive]
allowed_tools: [Read, Write, Glob, Grep, Skill, Agent]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review", "../../../code-agents"]
---

/sdd-engineering:spec Write the spec now; all requirements are given here and there are no open product decisions, so do not ask questions and do not stop at a question stage. The working directory is intentionally empty: there is no code to read, and that is fine; specify from this text only.

Feature: add a `--dry-run` flag to the `export` command of the `fixture` CLI.

Requirements (final):
- `fixture export <target-dir> --dry-run` prints one line per file it would write, in the form `would write <path>`, and exits 0.
- With `--dry-run` nothing is written or modified on disk: no files, no directories, no timestamps.
- Without `--dry-run` the command behaves exactly as it does today.
- The output order and the exit code are identical to a real run; a real run that would fail on an unwritable target also fails in dry-run with the same message and a non-zero exit.
- Out of scope: any other command, other flags, config files.
- Project rules (the project's `CLAUDE.md`): **no-default-export** (named exports only). No other rules, no other constraints, no deadlines.

Write the spec file under `specs/` with numbered acceptance criteria (`AC-1`, `AC-2`, ...) covering each requirement above, then report the file path.
