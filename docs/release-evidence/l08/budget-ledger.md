# Budget ledger (AC-47, AC-48)

Every `claude -p` and `claude plugin eval` run of the homework is one row, appended with
`node scripts/evidence/ledger.mjs add ...` before the next paid step starts. The orchestrating
session is not measurable and is not counted. Total limit USD 20.00, API-equivalent. Default
allocations: cost experiment at most 13, evals at most 3, version-evidence captures at most 1,
reserve about 3.

| date | purpose | total_cost_usd | running total | note |
|---|---|---|---|---|
