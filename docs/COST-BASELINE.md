# Cost baseline: cost per successful SDD workflow

How much does one successful run of the spec-driven chain cost (spec, plan, execute-plan, verify),
and does one cheap change to the consumer's setup lower it without lowering quality? This document
holds the setup, the numbers before and after, the quality gate and the verdict. All numbers come
from the records in `docs/release-evidence/l08/cost-runs/`, produced by `scripts/evidence/`.

Status: the experiment has not run yet. Every `(pending)` marker is filled from the run records.

## Setup

| Item | Value |
|---|---|
| Fixed task text | `docs/release-evidence/l08/cost-runs/task.txt`, quoted verbatim below; its SHA-256 is in every run record |
| Consumer base commit | (pending) the consumer commit of rehearsal step 1, stable 1.0.0 enabled |
| Consumer checkout per run | a clean worktree of the base commit, fresh session, dependencies installed with `npm ci` |
| CLI version | 2.1.296 |
| Channel and plugin versions | stable channel, `devdigest-marketplace-stable`: `sdd-engineering` 1.0.0 and its four dependencies at 1.0.0, verified from `system/init` of every run |
| Protected path | `src/generated/` (the consumer's declared do-not-touch path) |
| Per-run spend cap | USD 4 (`--max-budget-usd 4`), about twice the lab run |
| Runs per arm | N = 3, dropping to N = 2 for both arms if the median baseline run costs more than USD 3 (AC-39) |
| Run order | B1, O1, B2, O2, then B3, O3 if N = 3 (baseline and optimized runs alternate, so drift hits both arms) |
| Stop rules | the ledger check before each run: no run if the total would exceed USD 18 (exit 3); no further baseline run once the total is USD 17 (exit 4); never above USD 20 (exit 5) |
| Success | decided by the harness after the run (AC-38), see "Quality gate" |

Headless command, identical in both arms except `--model` (planned; confirmed on the first probe):

```sh
claude -p "<task text>" --output-format stream-json --verbose \
  --model opus|sonnet --max-budget-usd 4 --no-session-persistence \
  --permission-mode acceptEdits --allowed-tools "Read Write Edit Glob Grep Bash Skill Agent"
```

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

| Run | Date | Cost USD | Turns | Duration | Successful | Record |
|---|---|---|---|---|---|---|
| B1 | (pending) | | | | | |
| B2 | (pending) | | | | | |
| B3 | (pending, only if N = 3) | | | | | |

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

## Results

(pending) Produced by `node scripts/evidence/cost-summary.mjs --smoke pass|fail docs/release-evidence/l08/cost-runs/*.md`.

Primary metric (AC-40): cost per successful run = total spend of all runs in the arm, failed runs
included, divided by the number of successful runs. If an arm has zero successful runs, its cost
per successful run is reported as "undefined (0 successes)" and the optimization is marked not
adopted (AC-41).

| Arm | Runs | Successes | Success rate | Total spend USD | Cost per successful run | Median | Min | Max |
|---|---|---|---|---|---|---|---|---|
| baseline | | | | | | | | |
| optimized | | | | | | | | |

Delta (optimized minus baseline): (pending) USD and (pending) %.

Per-model share of spend:

| Model | Baseline | Optimized |
|---|---|---|
| | | |

## Quality gate

The gate passes only when all three criteria hold (AC-42). A run is successful only when the
harness confirms all seven checks (AC-38): a spec with `AC-N` ids exists, a plan cites those ids,
the project's `test` and `typecheck` scripts pass, the plan-verifier's verdict is COMPLETE (read
from its tool result, not from the final message), no file under `src/generated/` changed, and the
run did not hit its spend cap.

| Criterion | Result |
|---|---|
| Optimized success rate is at least the baseline success rate | (pending) |
| Every successful optimized run meets all seven checks | (pending) |
| The smoke eval case `sdd-engineering/positive-spec-command` still passes with the main session on Sonnet | (pending) |

## Verdict

Verdict: (pending) `adopted` or `not adopted`.

Rules: if the quality gate fails, the optimization is recorded as `not adopted` with the failing
criterion, both arms' numbers stay in this document, and the homework item "cost recorded before
and after" is still met by those numbers (AC-43). If an arm has no successful run, the optimization
is `not adopted` (AC-41). If the difference between the arms is smaller than the baseline's min to
max spread, the verdict says the difference is within noise.

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

## Re-measure

Measure the baseline again when any of these happens:

- a new `sdd-engineering` minor or major release;
- a change of the default models in an agent's frontmatter;
- a CLI minor-version upgrade (this baseline was taken on 2.1.296).
