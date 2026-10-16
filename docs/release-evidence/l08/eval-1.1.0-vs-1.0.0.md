# Eval: the 1.1.0 behaviour against 1.0.0 (AC-33, AC-34)

Case: `sdd-engineering/positive-spec-assumptions`, `--runs 1`, `--allow-tools` as in the lab, the
target is the `plugins` parent folder of a checkout (dependencies load only from there).

| Half | Plugin content | Checkout SHA | Expected | Report | Cost USD | Result |
|---|---|---|---|---|---|---|
| 1.1.0 | tag `sdd-engineering--v1.1.0` | | pass, `casesTotal` at least 1 | | | |
| 1.0.0 | `origin/stable` | | fail or absent behaviour | | | |

If the lab's earlier rerun was made on content byte-identical to the 1.1.0 tag, cite it for the
1.1.0 half and link the `git diff` that proves the identity:

| Field | Value |
|---|---|
| Cited rerun | |
| Identity proof | |

AC-34: if the 1.1.0 half fails, `stable` is not promoted to 1.1.0 by this homework and the
failure is recorded here.

| Verdict | |
|---|---|
