# Release evidence: sdd-engineering 1.1.0

| Field | Value |
|---|---|
| Plugin | `sdd-engineering` |
| Version | 1.1.0 (minor, backward-compatible) |
| Tag (`<plugin>--v<version>`) | `sdd-engineering--v1.1.0` |
| Commit SHA | `8dbde50828f39ab370ac111b4f1ad2b088c26403` |
| Date | 2026-10-13 |
| CLI version | 2.1.296 (Claude Code) |
| Validation result | `claude plugin validate --strict` passed; CI `validate.yml` green on `main`; `versions` check passes against `sdd-engineering--v1.0.0` |
| Change | optional `## Assumptions` section in the spec-creator template (additions only); new eval `positive-spec-assumptions` |
| Eval results | `positive-spec-assumptions` passes with the plugin and fails without it (rerun 2026-10-13, see evals-1.0.0.md) |
| Dependency-resolution rule in force | HEAD-within-range — dependencies stay at 1.0.0 within `^1.0.0` |

## Update in the consumer project (G11)

Project `xSneshx/sdd-lab-target`, plugins installed at project scope from `xSneshx/devdigest-marketplace`:

1. Before: all five plugins at 1.0.0.
2. `claude plugin marketplace update devdigest-marketplace` → "Successfully updated marketplace".
3. `claude plugin update sdd-engineering@devdigest-marketplace -s project` → "updated from 1.0.0 to 1.1.0 … Restart to apply changes."
4. After (`claude plugin list --json`): `sdd-engineering` 1.1.0, the four dependencies 1.0.0, no errors.
5. Installed copy `~/.claude/plugins/cache/devdigest-marketplace/sdd-engineering/1.1.0/agents/spec-creator.md` contains `## Assumptions   (optional …)`.

## SDD run in the consumer project on 1.0.0 (G10)

One headless session (cost USD 2.05) ran `/sdd-engineering:spec` → `plan` → `execute-plan` (dispatching `code-agents:implementer`, then `architecture-review:architecture-reviewer`: PASS) → `verify` for a `truncate` utility. Output committed in `sdd-lab-target` (`specs/`, `docs/plans/`, `src/truncate.ts`, `src/truncate.test.ts`); `npm test` 10 passed, `tsc --noEmit` clean. Observations: spec-creator refused to set `Status: approved` itself (human-only rule) — the orchestrator set it; run-plan did not commit without being asked.
