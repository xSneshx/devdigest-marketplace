# Budget ledger (AC-47, AC-48)

Every `claude -p` and `claude plugin eval` run of the homework is one row, appended with
`node scripts/evidence/ledger.mjs add ...` before the next paid step starts. The orchestrating
session is not measurable and is not counted. Total limit USD 20.00, API-equivalent. Default
allocations: cost experiment at most 13, evals at most 3, version-evidence captures at most 1,
reserve about 3.

| date | purpose | total_cost_usd | running total | note |
|---|---|---|---|---|
| 2026-10-16 | capture | 0.0040 | 0.0040 | G3 step-1 system/init + OTEL capture (haiku) |
| 2026-10-16 | capture | 0.0033 | 0.0073 | G3 retry: OTEL with short export interval, still no console output |
| 2026-10-16 | capture | 0.0036 | 0.0109 | G4 harness probe in worktree (RUN_MODE=worktree, stream-json) |
| 2026-10-16 | eval | 0.5175 | 0.5284 | G5 positive-spec-assumptions on sdd-engineering--v1.1.0 (with+without) |
| 2026-10-16 | eval | 0.5000 | 1.0284 | G5 positive-spec-assumptions on stable 1.0.0 (case copied, with+without) |
| 2026-10-16 | eval | 0.3497 | 1.3781 | G5b implicit-assumptions variant on v1.1.0 (llm grader on last message only) |
| 2026-10-16 | eval | 0.3619 | 1.7400 | G5b implicit-assumptions variant on stable 1.0.0 |
| 2026-10-16 | eval | 0.2705 | 2.0105 | G5c implicit variant v1.1.0 + file check: spec has ## Assumptions |
| 2026-10-16 | eval | 0.2689 | 2.2794 | G5c implicit variant stable 1.0.0 + file check: no ## Assumptions |
| 2026-10-16 | cost-run | 2.8329 | 5.1123 | B1 baseline (opus main loop) successful |
| 2026-10-16 | cost-run | 2.5056 | 7.6179 | O1 optimized (sonnet main loop) not successful: verifier INCOMPLETE |
| 2026-10-16 | cost-run | 2.3189 | 9.9368 | B2 baseline (opus) successful |
| 2026-10-16 | cost-run | 1.6893 | 11.6261 | O2 optimized (sonnet) not successful: verifier INCOMPLETE |
| 2026-10-16 | cost-run | 2.0324 | 13.6585 | o3 optimized (sonnet) successful=0 |
| 2026-10-16 | cost-run | 2.1376 | 15.7961 | b3 baseline (opus) successful=1 |
| 2026-10-16 | eval | 0.3924 | 16.1885 | G7 smoke eval positive-spec-command, --model sonnet, on origin/stable |
| 2026-10-16 | capture | 0.0038 | 16.1923 | G8 step-3 init capture (latest 1.1.0) |
| 2026-10-16 | capture | 0.0038 | 16.1961 | G9 step-4 init capture (stable 1.0.0) |
| 2026-10-16 | eval | 0.3755 | 16.5716 | G10 post-rollback smoke eval positive-spec-command on origin/stable d569114 |
