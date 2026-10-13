---
name: run-plan
description: >
  Runs an already-approved Implementation Plan end-to-end: refuses on overlapping owned paths,
  dispatches implementer agents per the plan's DAG (concurrently only in parallel mode), then gates
  with architecture-reviewer and plan-verifier in parallel, then resolves their comments in a bounded
  fix loop. Starts FROM a plan - spec authoring and planning are run separately beforehand. Never
  pushes or merges, and never starts a retrospective.
  TRIGGER when: "run the plan", "execute the plan", "implement this plan", "run-plan plan:<path>".
  Does NOT cover: writing specs, writing the plan, pushing or merging.
---

# Run Plan - Implementation Plan executor

> **Take an approved Implementation Plan and drive it to reviewed code: implement per the DAG, gate
> with the reviewers, and resolve their comments in a bounded fix loop.**

You are the **orchestrator**, running in the main session. The spec and the plan already exist and
were approved by a human beforehand (`sdd-engineering:spec-creator` and
`sdd-engineering:implementation-planner` are run separately; they are **not** part of this skill).
You do **not** implement or review yourself: you dispatch the specialized agents and keep only their
short final reports in context. Spawn agents with the `Agent` tool; run independent agents
**concurrently** (several calls in one message).

## Agents you dispatch

| Role | Agent |
|------|-------|
| Implement a task | `code-agents:implementer` |
| Architecture review | `architecture-review:architecture-reviewer` |
| Plan verification | `sdd-engineering:plan-verifier` |

If one of them is not installed, stop and tell the user which plugin is missing.

## Inputs (args)

| Token | Meaning | Default |
|-------|---------|---------|
| `plan:<path>` | Path to the approved Implementation Plan. **Required.** | - |
| free-text prose | Optional notes or constraints for this run (e.g. "skip phase 3 for now"). | - |
| `mode:parallel` / `mode:single` | Override the plan's `## Execution mode`. | read from the plan |
| `max-fix:<n>` | Cap on the fix loop (Step 3). | `3` |

If no `plan:` is given, ask for the plan path and stop. Do not guess. State your interpretation of
the args in one line before starting.

## Guardrails (always)

- **Starts from a plan.** Do not author a spec or a plan here. If the plan is missing or unreadable,
  stop and say so.
- **Never `git push`, merge, or open a PR.** The run ends at a review-clean working tree.
- **Never start a retrospective.** Do not invoke `workflow-retro` or `/sdd-retro`, not at the end of
  this run and not when asked implicitly. The user runs it by hand.
- **Bound the fix loop** to `max-fix` iterations. If findings remain, stop and report them.
- **Respect owned-path non-overlap** (Step 0b) whenever implementers could run concurrently.
- **Keep context lean.** Hold the plan path and each agent's short report, never a full transcript.

## Execution algorithm

### Step 0 - Read the plan

Read the plan file. Extract for every task: `T-id`, `Action`, `Package`, `Type`, `ACs`,
`Skills to use`, `Owned paths`, `Depends-on`, `Known gotchas`, `Acceptance`, `Verify with`. Read the
plan's `## Execution mode` (`parallel` or `single`); a `mode:` arg overrides it. Read the spec the
plan's `Source spec:` line points to, because `plan-verifier` needs it. If the spec still holds a
`[NEEDS CLARIFICATION]` line, stop: the spec is not approved. Build the dependency DAG from
`Depends-on`. Print a one-line summary of what will run.

### Step 0b - Overlap check (before any dispatch)

Before spawning **any** agent, compute the overlap between the `Owned paths` of every pair of tasks
that could run concurrently (tasks with no dependency path between them, in the same ready batch).
Two paths overlap when they are equal, or one is a prefix directory of the other, or their globs can
match the same file.

- In **parallel** mode: if any pair overlaps, **refuse to dispatch**. Report each overlapping pair
  with the tasks and the paths, and ask the user to fix the plan (or switch to `mode:single`). Do not
  resolve the overlap yourself.
- In **single** mode: tasks run one at a time, so overlap is reported as a note only.

### Step 1 - Implement

**Parallel mode:**
1. Find the **ready set**: tasks whose `Depends-on` are all complete and whose `Owned paths` do not
   overlap any task already running in this batch.
2. Spawn one `code-agents:implementer` per ready task, **concurrently** (one message, multiple
   `Agent` calls). Give each its full task block **plus the list of the other tasks' `Owned paths`**
   so it stays in its lane.
3. Wait for the batch, collect reports, mark tasks done.
4. Repeat from (1) until all tasks are complete.

**Single mode:** run the tasks sequentially in plan order, one `code-agents:implementer` at a time.
Never run implementers concurrently in single mode.

Each implementer self-verifies before returning. If one reports blocked or failing and cannot fix it
in scope, record it and either dispatch a targeted retry or surface it to the user. Do not silently
continue past a red task that others depend on.

### Step 2 - Review gate (parallel, read-only)

Compute the **changed-file set** from the working tree: `git status --porcelain` plus `git diff`
(and `git diff --cached`), or accumulate it from the implementer reports. Do not assume a particular
base branch. Then spawn, **concurrently**:

- `architecture-review:architecture-reviewer` on the changed-file set, with the project's documented
  architecture rules (discover them, for example `AGENTS.md`, `CLAUDE.md`, `docs/`) -> structural
  findings (severity and rule) and a PASS/FAIL gate.
- `sdd-engineering:plan-verifier` with the plan, the source spec and the changed set -> an
  AC -> task -> test -> commit matrix and a COMPLETE/INCOMPLETE/BLOCKED verdict. The commit column is
  empty until Step 4 commits; it is reported as `uncommitted`, not as a gap.

If a task's `Verify with` command cannot be run by a read-only agent, run it yourself and hand the
saved output to `plan-verifier`.

If the plan's feature is observable (a page, an endpoint, a CLI), also run it once yourself against
real data and record each defect as a `smoke` finding. Skip, with the reason, when nothing is
observable.

### Step 3 - Fix loop (bounded)

Build the **fix backlog**:
- reviewer findings with severity **critical** or **high** (medium and low: report only);
- `plan-verifier` rows with status **missing** or **partial**;
- every `smoke` finding.

If the backlog is empty, go to Step 4. Otherwise loop for `i = 1 ... max-fix`:

1. **Group** findings by file or owned path into non-overlapping fix tasks.
2. **Dispatch `code-agents:implementer`(s)**, one per group, concurrent only where owned paths are
   disjoint. Instruct each: "Fix exactly these findings in these files, stay in scope, self-verify."
   Pass each finding's text, `file:line` and the recommendation.
3. **Re-review only the changed files**: re-run the architecture reviewer scoped to the touched
   files and `plan-verifier` only for the `missing` or `partial` rows.
4. Recompute the backlog: empty -> gate PASS; no progress since last iteration -> stop and flag as
   stuck; otherwise continue.

If `max-fix` is reached with a non-empty backlog, stop and list the remaining findings for a human.

### Step 4 - Commit for traceability (ask first)

Implementers never commit. If the user wants commits, group the changes by task (or by phase when
tasks are tiny) and commit each group following the project's own commit convention, with a trailer
naming what it closes:

```
Refs: <SPEC-ID> AC-3 AC-4 - T5 T6
```

**Ask before committing** if the user has not already asked for commits in this run. Never push.

### Step 5 - Final report

Output the summary below. Do **not** push, merge, open a PR or start a retrospective.

## Output format (final report)

```
## Run Plan - <feature>

- **Plan:** `<plan path>` - mode: parallel | single
- **Implemented:** <N> tasks (T1...Tn) - <one line>
- **Self-verify:** green | failing (<detail>)

### Review gate
- architecture-reviewer: PASS | FAIL - <critical/high counts>
- plan-verifier: COMPLETE | INCOMPLETE | BLOCKED - <met N/M; missing/partial ids>
- smoke: PASS | FAIL - <defects> | skipped (<reason>)

### Fix loop
- iterations run: <i> / <max-fix>
- resolved: <findings fixed>
- **remaining (needs human):** <list, or "none">

### Next step
Review the working tree and run your project's pre-push review. (Not pushed, by design.)
```

## When you cannot proceed

If `plan:` is missing or unreadable, owned paths overlap in parallel mode, a required agent is not
installed, or an implementer is blocked on something only a human can decide: stop and say plainly
what you need. A clear "blocked here, need X" is a valid result; a half-run pretending to be complete
is not.
