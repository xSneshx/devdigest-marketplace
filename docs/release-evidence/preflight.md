# Preflight evidence (before 1.0.0)

Recorded by the maintainer on 2026-10-13. Home paths are shown as `~`; no tokens are included.

## G1 — CLI upgrade (AC-57)

- `cli_version`: `2.1.296 (Claude Code)` (upgraded from 2.1.170 with `claude update`).
- `claude plugin eval` is available. Flags used by `scripts/evals/run-evals.sh`: `--runs`, `--max-cost-usd` (exit 2 on cap), `--json`, `--output-dir`, `-j`, `--trust-plugin`, `--no-publish`.

## G2 — Live probes (`tests/probes/run-probes.sh`, budget USD 1)

| Decision | Result | Evidence |
|---|---|---|
| D1 — agent identifier in hook input (AC-31) | `agent_type` is present and scoped: `"probe-agents:probe-writer"` (also `agent_id`). Guard ids use `<plugin>:<agent>`. AC-32 not triggered. | `hook-input.jsonl`: `"hook_event_name":"PreToolUse","tool_name":"Write","agent_type":"probe-agents:probe-writer"` |
| Plugin-level guard refusal | refusal seen; `allowed.txt` written, `forbidden.txt` not written | `summary.json`: `refusal_seen: true`, `allowed_written: true`, `forbidden_written: false` |
| D2 — cross-plugin `skills:` preload (AC-33/36) | `yes` — the agent reproduced the sentinel phrase from `probe-skills:probe-skill`; the debug log did not show an explicit preload line. The Skill-tool fallback line stays in every agent. | `summary.json`: `preload: "yes"`, `preload_evidence: {reply: true, debug_log: false}` |
| D3 — command vs skill with the same name (AC-66) | `/probe-agents:collide` resolved to the **command**; the same-named skill is shadowed. → Keep the `run-plan` skill (lab name), rename the command. | `collide-reply.txt`: `COLLIDE-OUTCOME: command` |

Note: `--debug` logs include the user's settings (permission allow rules). They are not committed; only the excerpts above are kept.

## R1 — Local dependency-range test (`tests/dependency-resolution/local-negative.sh`, AC-73/AC-74)

Marketplace added as a **local git folder**; `dep` tagged `dep--v1.0.0` and `dep--v2.0.0`, HEAD = 2.0.0.

| App | Dependency form | Result |
|---|---|---|
| `app-obj` | `{ "name": "dep", "version": "^1.0.0" }` | enabled, no errors; `dep` installed at tag: `1.0.0-<sha>` (folderVersion 2.0.0) |
| `app-obj-miss` | `{ "name": "dep", "version": "^3.0.0" }` | fails to load: `errors: ["Requires \"dep@testmp\" ^3.0.0, installed 2.0.0"]`, `errorDetails[].type = "dependency-version-unsatisfied"` |
| `app-str` | `"dep@testmp@^1.0.0"` | enabled, no errors; `dep` 2.0.0 — range ignored |
| `app-str-miss` | `"dep@testmp@^3.0.0"` | enabled, no errors; `dep` 2.0.0 — range ignored |

`claude plugin list --json`: `enabled` is the user setting; a load failure is reported in `errors` / `errorDetails`.

## G4 — GitHub-hosted marketplace (AC-75)

Throwaway private repo `xSneshx/mp-resolution-probe`, same fixture, both tags pushed (`git ls-remote --tags` shows `dep--v1.0.0` and `dep--v2.0.0`).

| App | Result |
|---|---|
| `app-obj` (`^1.0.0`) | **fails to load**: `Requires "dep@testmp" ^1.0.0, installed 2.0.0` |
| `app-obj-miss` (`^3.0.0`) | fails to load: `Requires "dep@testmp" ^3.0.0, installed 2.0.0` |
| `app-str`, `app-str-miss` | enabled, `dep` 2.0.0, no errors — string range ignored |

Cause: the CLI clones the marketplace **shallow** (`git rev-parse --is-shallow-repository` → `true` in `plugins/marketplaces/testmp`), and the clone holds only the tag on HEAD (`dep--v2.0.0`). No older tag is available to satisfy a range, so the marketplace's current copy is installed and the range is checked at load time.

**D4 — dependency-resolution rule in force: `head-in-range` (AC-76).** Every plugin's HEAD version must satisfy every dependent's range on the default branch; CI enforces it (`check-head-in-range`). Tags are still created for every release (`<plugin>--v<version>`) for traceability and rollback.

## Summary of rules established here

- Version ranges are declared **only** in the object form; the `name@marketplace@range` string form is rejected by CI because the CLI silently ignores the range (AC-73).
- Guards key on `agent_type` = `<plugin>:<agent>`.
- The SDD command that executes a plan must not be named `run-plan` (it would shadow the skill).
