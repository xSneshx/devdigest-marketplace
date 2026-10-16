# Channel switch evidence (AC-19 to AC-26, AC-29 to AC-32)

One *Version evidence record* per rehearsal step of the consumer (AC-24 steps 1, 3 and 4), plus
the start state. Home paths are shortened to `~`; no token is copied. Raw captures stay in the
ignored `evals-out/l08/` folder and are passed through `scripts/evidence/` before they are
pasted here.

How each field is produced:

| Field | Tool |
|---|---|
| plugin list assertion (AC-23, AC-21, AC-22) | `scripts/evidence/assert-plugin-list.mjs --project <consumer> --channel latest\|stable` |
| per-sub-step AC-22 capture | the same script with `--partial` after every command of the switch |
| installed SHA vs `origin/<ref>`, Assumptions count (AC-25) | `scripts/evidence/installed-check.mjs --catalog <name> --expect-sha <sha> --assumptions 0\|>=1` |
| `system/init` excerpt (AC-29, AC-30) | `scripts/evidence/extract-init.mjs --catalog <name> --version <sdd version>` (add `--all` for the five plugins) |
| OTEL excerpt (AC-31) | console export for one session, or the note "not available" |

## Step 0: start state

| Field | Value |
|---|---|
| Date | |
| CLI version | 2.1.296 |
| State | latest channel: `sdd-engineering@devdigest-marketplace` 1.1.0 plus four dependencies at 1.0.0, project scope |
| Plugin list | |

## Step 1: switch latest 1.1.0 to stable 1.0.0

| Field | Value |
|---|---|
| Step / date / CLI version | 1 / / 2.1.296 |
| From channel / to channel | latest / stable |
| Consumer commit | |
| `origin/stable` SHA | |
| Installed `gitCommitSha` vs `origin/stable` | |
| Assumptions marker count in the installed `spec-creator` (expected 0) | |

Plugin list assertion (full):

```text
(paste the output of assert-plugin-list.mjs)
```

Per-sub-step AC-22 captures:

| Sub-step | Command | `--partial` result |
|---|---|---|
| | | |

`system/init` excerpt (AC-29):

```text
(paste the output of extract-init.mjs)
```

OTEL excerpt (AC-31): (excerpt, or "not available" with the reason)

## Step 3: switch stable to latest 1.1.0

| Field | Value |
|---|---|
| Step / date / CLI version | 3 / / 2.1.296 |
| From channel / to channel | stable / latest |
| Consumer commit | |
| `origin/main` SHA | |
| Installed `gitCommitSha` vs `origin/main` | |
| Assumptions marker count in the installed `spec-creator` (expected at least 1) | |

Plugin list assertion (full):

```text
(paste the output of assert-plugin-list.mjs)
```

Per-sub-step AC-22 captures:

| Sub-step | Command | `--partial` result |
|---|---|---|
| | | |

`system/init` excerpt (AC-29):

```text
(paste the output of extract-init.mjs)
```

OTEL excerpt (AC-31): (excerpt, or "not available" with the reason)

## Step 4: rollback, latest 1.1.0 to stable 1.0.0

| Field | Value |
|---|---|
| Step / date / CLI version | 4 / / 2.1.296 |
| From channel / to channel | latest / stable |
| Consumer commit | |
| `origin/stable` SHA | |
| Installed `gitCommitSha` vs `origin/stable` (AC-25) | |
| Assumptions marker count in the installed `spec-creator` (AC-25, expected 0) | |

Plugin list assertion (full):

```text
(paste the output of assert-plugin-list.mjs)
```

Per-sub-step AC-22 captures:

| Sub-step | Command | `--partial` result |
|---|---|---|
| | | |

`system/init` excerpt (AC-29):

```text
(paste the output of extract-init.mjs)
```

OTEL excerpt (AC-31): (excerpt, or "not available" with the reason)

## Step 2 and step 5

Step 2 is the verified workflow on stable 1.0.0: it is baseline run B1 or the first successful
baseline run of `docs/COST-BASELINE.md`, whose record is under `cost-runs/`. Step 5 is the smoke
eval recorded in `smoke-eval.md`.
