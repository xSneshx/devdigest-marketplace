# Cost run records

One file per run of the cost experiment, named `<run id>.md` (`B1`, `O1`, `B2`, `O2`, and `B3`,
`O3` if the third pair runs). The record is written by `scripts/evidence/cost-record.mjs`; the
success checklist is run by the harness in the run's checkout, not taken from the model's claim.

The fixed task text is `task.txt` in this folder; its SHA-256 is recorded in every run record.

## Record shape (Cost run record)

- run id, arm (`baseline` or `optimized`), date, base commit SHA, task text hash, main-session
  model, channel and plugin versions (from `system/init`);
- `total_cost_usd`, `modelUsage` per model (cost, input, output and cache tokens), number of
  turns, duration;
- the success checklist (AC-38): spec with `AC-N` ids, plan citing those ids, `test` passes,
  `typecheck` passes, verifier verdict COMPLETE (read from the plan-verifier tool result), protected
  path untouched, spend cap not hit; the run is successful only if all seven hold;
- notes (aborted, cap overshoot);
- a fenced JSON block `cost-run-data` with the same data, read by `scripts/evidence/cost-summary.mjs`.

Cost runs use `--output-format stream-json --verbose` (spec Errata E-3): the final `result` event
carries `total_cost_usd`, `modelUsage`, `num_turns` and `duration_ms`, and the `system/init` event
carries the plugin paths.

Summarise with `node scripts/evidence/cost-summary.mjs --smoke pass|fail cost-runs/B1.md ...`.
