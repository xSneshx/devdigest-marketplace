# Cost baseline: cost per successful SDD workflow

How much does one successful run of the spec-driven chain cost (spec, plan, execute-plan, verify),
and does one cheap change to the consumer's setup lower it without lowering quality? This document
holds the setup, the numbers before and after, the quality gate and the verdict. All numbers come
from the records in `docs/release-evidence/l08/cost-runs/`, produced by `scripts/evidence/`.

Status: the experiment ran on 2026-10-16, N = 3 runs per arm. Result in one line: baseline
(Opus main session) USD 2.4298 per successful workflow, 3 of 3 runs successful; optimized (Sonnet
main session) cost per successful run undefined (0 of 3 successful). The quality gate did not
pass, so the optimization is **not adopted**.

## Setup

| Item | Value |
|---|---|
| Fixed task text | `docs/release-evidence/l08/cost-runs/task.txt`, quoted verbatim below; its SHA-256 is in every run record |
| Consumer base commit | `21153eb`, the consumer commit of rehearsal step 1 (stable 1.0.0 enabled), on branch `chore/l08-channel-rehearsal` of `xSneshx/sdd-lab-target` |
| Consumer checkout per run | `RUN_MODE=worktree`: a fresh git worktree of the base commit, dependencies installed with `npm ci`, a fresh headless session. A probe (USD 0.0036) confirmed that in such a worktree all five plugins load from stable 1.0.0 |
| CLI version | 2.1.296 |
| Channel and plugin versions | stable channel, `devdigest-marketplace-stable`: `sdd-engineering` 1.0.0 and its four dependencies at 1.0.0 (`stable` head `d569114`), verified from `system/init` of every run (every record lists the five stable 1.0.0 paths and `plugin_errors: []`) |
| Protected path | `src/generated/` (the consumer's declared do-not-touch path) |
| Per-run spend cap | USD 4 (`--max-budget-usd 4`), about twice the lab run |
| Runs per arm | N = 3, dropping to N = 2 for both arms if the median baseline run costs more than USD 3 (AC-39) |
| Run order | B1 and O1 in parallel, then B2 and O2 in parallel, then O3, then B3 sequentially. O3 ran before B3 so that the stop rule could be checked against the real running total |
| Stop rules | the ledger check before each run: no run if the total would exceed USD 18 (exit 3); no further baseline run once the total is USD 17 (exit 4); never above USD 20 (exit 5). No rule fired: every check exited 0; the ledger total is USD 16.5716 of 20 (`docs/release-evidence/l08/budget-ledger.md`) |
| Success | decided by the harness after the run (AC-38), see "Quality gate" |
| Number of runs | N = 3 per arm; the median baseline run is at most USD 3, so N stays 3 (AC-39, `cost-summary.mjs`) |

Headless command as actually run, identical in both arms except `--model`:

```sh
claude -p "$(cat task.txt)" --output-format stream-json --verbose \
  --model opus|sonnet --max-budget-usd 4 --permission-mode acceptEdits \
  --allowedTools "Bash(npm test*)" "Bash(npm run typecheck*)" "Bash(npx tsc*)" \
  "Bash(npx vitest*)" "Bash(git status*)" "Bash(git diff*)" "Bash(git log*)" "Bash(ls*)"
```

Permission denials were recorded in both arms: 6 to 7 ad-hoc Bash commands per run were denied
(for example `python3`, `sed`, and a command with a variable that could not be checked). The same
flags applied to both arms, so the denials are not a difference between them.

Output format (spec Errata E-3): cost runs use `--output-format stream-json --verbose` instead of
`--output-format json`, because the JSON output may omit the `system/init` message that carries the
plugin paths. The final `result` event of the stream carries the same `total_cost_usd`,
`modelUsage`, `num_turns` and `duration_ms` as the JSON output, and `system/init` shows which
plugin versions the very same session loaded.

Deviation recorded: the task text authorises the session to set the spec's `Status:` line to
`approved` itself, because a headless run cannot wait for a human approval.

Fixed task text:

```text
Deliver one small feature in this project through the full spec-driven chain, in this order.

Feature: add `src/word-count.ts` exporting the function `wordCount(text: string): number`.
- A word is a maximal run of non-whitespace characters.
- An empty string or a whitespace-only string returns 0.
- Named export, no new dependency, no I/O. Put its unit tests in `src/word-count.test.ts`.

Chain:
1. Run `/sdd-engineering:spec` with the feature above. When the spec exists, set its `Status:` line to `approved` yourself. You are explicitly authorised to do that for this task.
2. Run `/sdd-engineering:plan` on that spec, in single-implementer mode.
3. Run `/sdd-engineering:execute-plan` on the plan.
4. Run `/sdd-engineering:verify` on the plan.

Rules:
- Do not ask questions. Make the smallest reasonable decision and continue.
- Do not commit, do not push, do not run `npm install`.
- Follow the project's `CLAUDE.md`. Never edit `src/generated/`.
- Finish by quoting the verifier's verdict line verbatim, then stop.
```

## Baseline

Arm `baseline`: the orchestrating main session runs on Opus (`--model opus`); plugin agents keep the
models in their frontmatter.

Reference point, not a data point of this experiment (AC-44): the lab's single `sdd-engineering`
workflow-chain run cost USD 2.05. It used another task, another base and no cap, and it is not in
the table below.

| Run | Date | Cost USD | Turns | Duration | Verifier verdict | Successful | Record |
|---|---|---|---|---|---|---|---|
| B1 | 2026-10-16 | 2.8329 | 25 | 415 s | COMPLETE | yes | `cost-runs/b1.md` |
| B2 | 2026-10-16 | 2.3189 | 34 | 363 s | COMPLETE | yes | `cost-runs/b2.md` |
| B3 | 2026-10-16 | 2.1376 | 24 | 319 s | COMPLETE | yes | `cost-runs/b3.md` |

Baseline result: 3 of 3 runs successful, total spend USD 7.2894, **cost per successful workflow
USD 2.4298** (all in `docs/release-evidence/l08/cost-runs/`). B1 is also the verified workflow of
rehearsal step 2 in the consumer repository.

## Optimization

One lever per experiment: run the orchestrating main session on Sonnet instead of Opus
(`--model sonnet`), and let the plugin agents keep their frontmatter models (`spec-creator` and
`implementation-planner` on Opus, the others on Sonnet).

Rationale: in the lab run the Opus main loop accounted for about 80 % of the USD 2.05. The change
is consumer-side, needs no plugin release and is reversible by one flag, so it is the cheapest
credible optimization.

Rejected alternatives:

- `CLAUDE_CODE_SUBAGENT_MODEL`: it overrides the models of the Opus agents as well, so it changes
  the measured product, not the consumer's setup.
- Editing `model:` or `effort:` in the agent frontmatter: it needs a plugin patch release and a
  re-run of the evals, which is a different, more expensive experiment.

The optimization can be applied without editing plugin content, so no patch release is made.

Optimized arm runs (same task, same base, same flags except `--model sonnet`):

| Run | Date | Cost USD | Turns | Duration | Verifier verdict | Successful | Record |
|---|---|---|---|---|---|---|---|
| O1 | 2026-10-16 | 2.5056 | 32 | 412 s | INCOMPLETE | no | `cost-runs/o1.md` |
| O2 | 2026-10-16 | 1.6893 | 21 | 255 s | INCOMPLETE | no | `cost-runs/o2.md` |
| O3 | 2026-10-16 | 2.0324 | 21 | 295 s | INCOMPLETE | no | `cost-runs/o3.md` |

Why the optimized runs failed (from the run records and the verifier's verdicts):

- O1: a plan item grepped the test for the escape forms `u200B` and `u00A0` and found none,
  because the test used the braced form `\u{200B}`. The verifier said INCOMPLETE, and the Sonnet
  orchestrator did not repair it.
- O2: all 15 plan items were met, but two untracked spec and plan files were outside the first
  task's declared owned paths ("unplanned changes"), and the verifier said INCOMPLETE.
- O3: the verifier said INCOMPLETE (see `cost-runs/o3.md`; the record keeps the verdict, not a
  cause).

In all three the tests and the typecheck passed and the protected path was untouched; the only
failed check of the AC-38 checklist was the verifier verdict.

## Results

Produced by `node scripts/evidence/cost-summary.mjs --smoke pass docs/release-evidence/l08/cost-runs/[bo]*.md`.

Primary metric (AC-40): cost per successful run = total spend of all runs in the arm, failed runs
included, divided by the number of successful runs. If an arm has zero successful runs, its cost
per successful run is reported as "undefined (0 successes)" and the optimization is marked not
adopted (AC-41).

| Arm | Runs | Successes | Success rate | Total spend USD | Cost per successful run | Median (successful) | Min | Max | Median duration |
|---|---|---|---|---|---|---|---|---|---|
| baseline | 3 | 3 | 100.0 % | 7.2894 | **USD 2.4298** | 2.3189 | 2.1376 | 2.8329 | 363 s |
| optimized | 3 | 0 | 0.0 % | 6.2273 | **undefined (0 successes)** | n/a | n/a | n/a | 295 s |

Delta (optimized minus baseline): undefined in USD and in %, because the optimized arm has no
successful run (AC-41). Per run, the optimized arm was cheaper (total spend USD 6.2273 against
USD 7.2894, about USD 2.08 against USD 2.43 per run), but none of its runs delivered a verified
result, so the cheaper runs do not count as savings.

Per-model share of spend:

| Model | Baseline | Optimized |
|---|---|---|
| claude-opus-5-5 | 70.4 % | 49.2 % |
| claude-sonnet-5-5 | 29.6 % | 50.8 % |

In the optimized arm Opus still carries about half of the spend, because the plugin agents
`spec-creator` and `implementation-planner` keep their Opus frontmatter model; only the
orchestrating main session moved to Sonnet.

## Quality gate

The gate passes only when all three criteria hold (AC-42). A run is successful only when the
harness confirms all seven checks (AC-38): a spec with `AC-N` ids exists, a plan cites those ids,
the project's `test` and `typecheck` scripts pass, the plan-verifier's verdict is COMPLETE (read
from its tool result, not from the final message), no file under `src/generated/` changed, and the
run did not hit its spend cap.

| Criterion | Result |
|---|---|
| Optimized success rate is at least the baseline success rate | **fail**: 0 % (0 of 3) against 100 % (3 of 3) |
| Every successful optimized run meets all seven checks | vacuously true: there is no successful optimized run (all three failed the verifier-verdict check). This is not evidence in favour of the optimization |
| The smoke eval case `sdd-engineering/positive-spec-command` still passes with the main session on Sonnet | pass: 1 of 1, USD 0.3924 (`docs/release-evidence/l08/smoke-eval.md`) |

Gate: **not passed** (first criterion failed). Note that the single-step smoke case passes on
Sonnet while the full spec, plan, execute-plan and verify chain does not, so the smoke case alone
would not have caught the regression.

## Verdict

Verdict: **not adopted**. Failing criterion: the optimized success rate (0 of 3) is below the baseline success rate (3 of 3). Cost per successful run for the optimized arm: undefined (0 successes).

Both arms' numbers stay in this document, so the homework item "cost recorded before and after" is met by them (AC-43). The difference in cost per run is not interpreted as a saving.

Rules: if the quality gate fails, the optimization is recorded as `not adopted` with the failing
criterion, both arms' numbers stay in this document, and the homework item "cost recorded before
and after" is still met by those numbers (AC-43). If an arm has no successful run, the optimization
is `not adopted` (AC-41). If the difference between the arms is smaller than the baseline's min to
max spread, the verdict says the difference is within noise.

### What to try next (a recommendation, untested)

Nothing below has been run. These are hypotheses for a next experiment, not results.

- Keep the orchestrator on Opus and move one subagent to Sonnet instead of moving the main
  session. The Sonnet runs failed in the orchestrator's decisions (repairing a plan item,
  handling the verifier's verdict), so the orchestrator is the part that seems to need the
  stronger model, while a subagent such as the implementer may not.
- Relax the verifier's "unplanned changes" rule so that spec and plan files written by the
  workflow itself are not counted as unplanned (this would change the product and needs a plugin
  release and a re-run of the evals; O2 failed only on this rule).
- In either case run N = 3 again for both arms with the same task, base and flags.

## Limitations

- `total_cost_usd` is a client-side, API-equivalent estimate. The runs use a Claude Team
  subscription, so it is not a bill.
- With N of at most 3 runs per arm, the numbers give no statistical significance. They show an
  order of magnitude, not a proven difference.
- A per-run spend cap can be overshot: the CLI checks it between turns, so a run can end above it.
- Whether the `model:` frontmatter of plugin agents is honoured is not assumed: read it from
  `modelUsage` of the records, which lists the models that actually ran.
- One task of one size on one project; another feature may split cost differently between the main
  loop and the agents.
- The `model:` frontmatter of the plugin agents was observed to be honoured in the sense that
  both Opus and Sonnet appear in `modelUsage` of both arms; this document does not verify which
  agent ran on which model.
- The task text authorises the session to set the spec's `Status:` line to `approved` itself;
  this differs from the normal human approval step.
- Runs of a pair ran in parallel (B1 with O1, B2 with O2), so they shared machine and API load;
  O3 and B3 ran sequentially. No effect of this on cost is claimed or measured.
- The optimized failures differ (a plan grep on an escape form, an unplanned-files rule, an
  unexplained INCOMPLETE); with N = 3 they do not establish that Sonnet as orchestrator always fails.

### Harness fix found during the experiment (an honest note)

A session that resumes after background tasks emits several `result` events. `total_cost_usd` and
`modelUsage` are cumulative across them, but `num_turns` and `duration_ms` are per segment. Run B2
had 3 result events, and its first record showed 4 turns and 66 s instead of 34 turns and 363 s.
`findResult` in `scripts/evidence/lib/common.mjs` was changed to take the cost from the last
event and to sum turns and duration, a test was added in `tests/evidence/cost-record.test.mjs`,
and B2 was re-recorded.

## Re-measure

Measure the baseline again when any of these happens:

- a new `sdd-engineering` minor or major release;
- a change of the default models in an agent's frontmatter;
- a CLI minor-version upgrade (this baseline was taken on 2.1.296).
