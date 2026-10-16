# Smoke eval record (AC-27, AC-28, AC-42)

The smoke eval is green only if every deterministic check passes, the eval report has
`casesTotal` at least 1, and the case passes. A failed check marks the rehearsal as failed with
the failing check named; nothing is marked done until a re-run is green.

## Record: after the rollback (AC-24 step 5)

| Field | Value |
|---|---|
| Date | 2026-10-16 |
| `origin/stable` SHA | `d569114a68392cde3e10136511c9a915f1f31893` |
| Checkout SHA used as eval target | `d569114` (a git worktree whose HEAD equals `origin/stable`), target folder `plugins` |
| AC-23 plugin list assertion | PASS after the rollback: five entries `<plugin>@devdigest-marketplace-stable`, 1.0.0, project scope, errors none (`channel-switches.md`, step 4) |
| AC-25 installed SHA and Assumptions count | PASS: `gitCommitSha` equals the `origin/stable` SHA above; Assumptions marker count 0 (`channel-switches.md`, step 4) |
| AC-29 `system/init` assertion | PASS: all plugin paths under `devdigest-marketplace-stable/<plugin>/1.0.0`, `plugin_errors` empty (`channel-switches.md`, step 4) |
| Eval case | `sdd-engineering/positive-spec-command`, `--runs 1`, default model |
| Eval report (`casesTotal`, pass or fail) | `eval-smoke.json`: `casesTotal` 1, `casesPassed` 1; graders `spec-creator-dispatched`, `spec-file-written` and `spec-written` all passed |
| Eval cost USD | 0.3755 |
| Verdict | **green** |

The consumer repository holds the pointer to this record in `docs/rehearsal/l08-smoke-eval.md`
(its commit is rehearsal step 5).

## Record: with the optimization applied (AC-42)

The same case, run with the orchestrating main session on Sonnet. This is the third criterion of
the quality gate in `docs/COST-BASELINE.md`.

| Field | Value |
|---|---|
| Date | 2026-10-16 |
| Main-session model | Sonnet (`--model sonnet`, recorded in the report as `modelOverride: sonnet`); target `plugins` of the worktree at `origin/stable` (`d569114`) |
| Eval case | `sdd-engineering/positive-spec-command`, `--runs 1` |
| Eval report (`casesTotal`, pass or fail) | `eval-smoke-sonnet.json`: `casesTotal` 1, `casesPassed` 1 |
| Eval cost USD | 0.3924 |
| Verdict | **green** |

Reading: the single-step case passes on Sonnet, while the full spec, plan, execute-plan and verify
chain does not (0 of 3 successes, see `docs/COST-BASELINE.md`). The smoke case therefore does not
catch the failure mode of the optimization; the gate fails on its first criterion.
