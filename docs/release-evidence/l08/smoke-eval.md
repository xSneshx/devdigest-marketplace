# Smoke eval record (AC-27, AC-28, AC-42)

The smoke eval is green only if every deterministic check passes, the eval report has
`casesTotal` at least 1, and the case passes. A failed check marks the rehearsal as failed with
the failing check named; nothing is marked done until a re-run is green.

## Record: after the rollback (AC-24 step 5)

| Field | Value |
|---|---|
| Date | |
| `origin/stable` SHA | |
| Checkout SHA used as eval target | (must equal `origin/stable`) |
| AC-23 plugin list assertion | |
| AC-25 installed SHA and Assumptions count | |
| AC-29 `system/init` assertion | |
| Eval case | `sdd-engineering/positive-spec-command` |
| Eval report (`casesTotal`, pass or fail) | |
| Eval cost USD | |
| Verdict | green / red |

## Record: with the optimization applied (AC-42)

The same case, run with the orchestrating main session on Sonnet.

| Field | Value |
|---|---|
| Date | |
| Main-session model | |
| Eval case | `sdd-engineering/positive-spec-command` |
| Eval report (`casesTotal`, pass or fail) | |
| Eval cost USD | |
| Verdict | green / red |
