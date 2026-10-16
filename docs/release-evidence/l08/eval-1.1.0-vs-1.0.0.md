# Eval: the 1.1.0 behaviour against 1.0.0 (AC-33, AC-34)

**Honest summary.** The 1.1.0 half of AC-33 is met. The 1.0.0 half ("fails or shows no such
behaviour on `origin/stable`") is **not met** by the case the spec names: that case passes on
1.0.0 as well. A supplementary variant of the case, added at the user's decision, gives weak,
non-deterministic evidence that 1.1.0 and 1.0.0 differ. It does not replace the AC-33 result.

Command (all runs): `claude plugin eval plugins --case <case> --runs 1 --allow-tools Write
--trust-plugin --max-cost-usd <cap>` on CLI 2.1.296, where `plugins` is the parent folder of a
checkout (dependencies load only from there). The default ablation is `with-without`;
`--trust-plugin` is required headless. Date: 2026-10-16. Raw reports are in `evals-out/l08/`
(ignored folder).

## AC-33: `sdd-engineering/positive-spec-assumptions`

| Half | Plugin content | Checkout | Expected | Report | Cost USD | Result |
|---|---|---|---|---|---|---|
| 1.1.0 | tag `sdd-engineering--v1.1.0` | git worktree at the tag | pass, `casesTotal` at least 1 | `eval-assumptions-110.json`: `casesTotal` 1, `casesPassed` 1, `meanDelta` 0 | 0.5175 | **pass**; the without-plugin arm also passed (delta 0) |
| 1.0.0 | `origin/stable` (`d569114`) | git worktree at `origin/stable`; the case folder was copied from `2fc64c5`, untracked, and removed afterwards | fail or absent behaviour | `eval-assumptions-100.json`: `casesTotal` 1, `casesPassed` 1, `meanDelta` 0.67 | 0.5000 | **pass**: the with-plugin arm passed; only the without-plugin arm failed the assumptions grader (delta 0.67) |

Reuse of the lab rerun was checked and rejected: `git diff 755c769 sdd-engineering--v1.1.0 --
plugins/` is not empty (prompts of other cases differ), so the lab rerun is not byte-identical to
the 1.1.0 tag and was not cited. Both halves were re-run.

Why the 1.0.0 half does not discriminate: the case prompt itself orders the session to write a
`## Assumptions` section, so any model, with or without the 1.1.0 template change, writes one.
The case measures instruction following, not the template change in 1.1.0.

**AC-33 verdict: not met.** The 1.1.0 half passed; the 1.0.0 half passed as well instead of failing.

## Supplementary (not an AC-33 result): `positive-spec-assumptions-implicit`

A variant case that keeps the same feature but only says "choose a sensible default yourself and
write the spec", without naming an Assumptions section. It exists only in the two worktrees, was
not committed to the marketplace, and a copy is kept in `evals-out/l08/` (ignored). `--ablation
none`, one run per version.

| Run | Version | Cost USD | Grader | Result |
|---|---|---|---|---|
| 1 | 1.1.0 | 0.3497 | llm grader on the last message | FAIL |
| 1 | 1.0.0 | 0.3619 | llm grader on the last message | FAIL |
| 2 | 1.1.0 | 0.2705 | llm judge, 3 votes | PASS (2 of 3 votes) |
| 2 | 1.0.0 | 0.2689 | llm judge, 3 votes | FAIL (0 of 3) |

Run 1 judged only the last message; the written spec files were not inspected. Run 2 kept the
temporary folder, so the spec file each version wrote was extracted from the run trace and
checked directly:

| Version | Written spec file | `## Assumptions` section |
|---|---|---|
| 1.1.0 | `evals-out/l08/implicit-spec-v110.md` | present |
| 1.0.0 | `evals-out/l08/implicit-spec-stable.md` | absent |

Run 2 also had a `regex` file grader that errored, because that grader does not accept a glob
path; its result is not used.

Interpretation, with its limits: when the request leaves a non-blocking gap without naming the
section, 1.1.0 can produce the Assumptions section and 1.0.0 did not. It is non-deterministic: 1
of the 2 runs of 1.1.0 passed the judge. This is one run per version in run 2, so it is
suggestive, not proof.

Static evidence, independent of any model run: the `## Assumptions` marker count in the
`spec-creator` agent file is 0 in 1.0.0 and 3 in 1.1.0 (`installed-check`, see
`channel-switches.md`, steps 1, 3 and 4).

## AC-34

The 1.1.0 half of AC-33 passed, so nothing in AC-34 blocks a promotion. This homework does not
promote `stable` to 1.1.0 (out of scope), so the promotion log of `docs/RELEASES.md` has no row
for 1.1.0.

| Verdict | AC-33: 1.1.0 half met, 1.0.0 half **not met** (case does not discriminate); AC-34 not triggered, no promotion to 1.1.0 in this homework |
|---|---|
