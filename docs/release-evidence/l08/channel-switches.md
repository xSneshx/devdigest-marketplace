# Channel switch evidence (AC-19 to AC-26, AC-29 to AC-32)

One *Version evidence record* per rehearsal step of the consumer (AC-24 steps 1, 3 and 4), plus
the start state. Home paths are shortened to `~`; no token is copied. Raw captures stay in the
ignored `evals-out/l08/` folder and are passed through `scripts/evidence/` before they are
pasted here. All captures were made on 2026-10-16 with CLI 2.1.296.

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
| Date | 2026-10-16 |
| CLI version | 2.1.296 |
| State | latest channel: `sdd-engineering@devdigest-marketplace` 1.1.0 plus four dependencies at 1.0.0, project scope |
| Plugin list | below (`step0-plugin-list.json`) |

```text
Plugin list assertion (channel latest)

| id | version | scope | enabled | errors | installPath |
|---|---|---|---|---|---|
| architecture-review@devdigest-marketplace | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace/architecture-review/1.0.0 |
| code-agents@devdigest-marketplace | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace/code-agents/1.0.0 |
| engineering-paved-path@devdigest-marketplace | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace/engineering-paved-path/1.0.0 |
| research-tools@devdigest-marketplace | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace/research-tools/1.0.0 |
| sdd-engineering@devdigest-marketplace | 1.1.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace/sdd-engineering/1.1.0 |

PASS
```

## Step 1: switch latest 1.1.0 to stable 1.0.0

| Field | Value |
|---|---|
| Step / date / CLI version | 1 / 2026-10-16 / 2.1.296 |
| From channel / to channel | latest / stable |
| Consumer commit | `21153eb` (changes only `.claude/settings.json`) |
| `origin/stable` SHA | `d569114a68392cde3e10136511c9a915f1f31893` |
| Installed `gitCommitSha` vs `origin/stable` | equal (`d569114...`); install path `~/.claude/plugins/cache/devdigest-marketplace-stable/sdd-engineering/1.0.0` |
| Assumptions marker count in the installed `spec-creator` (expected 0) | 0 (`installed-check`: PASS) |

Procedure followed: uninstall the five latest ids (each uninstall reported the auto-installed
dependencies as no longer needed), `claude plugin marketplace add xSneshx/devdigest-marketplace#stable
--scope project`, install `sdd-engineering@devdigest-marketplace-stable` (the four dependencies follow),
prune ("Nothing to prune"). The latest marketplace registration was not removed (AC-20, see
`channel-probe.md`).

Plugin list assertion (full):

```text
Plugin list assertion (channel stable)

| id | version | scope | enabled | errors | installPath |
|---|---|---|---|---|---|
| architecture-review@devdigest-marketplace-stable | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace-stable/architecture-review/1.0.0 |
| code-agents@devdigest-marketplace-stable | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace-stable/code-agents/1.0.0 |
| engineering-paved-path@devdigest-marketplace-stable | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace-stable/engineering-paved-path/1.0.0 |
| research-tools@devdigest-marketplace-stable | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace-stable/research-tools/1.0.0 |
| sdd-engineering@devdigest-marketplace-stable | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace-stable/sdd-engineering/1.0.0 |

PASS
```

Per-sub-step AC-22 captures:

| Capture (raw file) | What it shows | `--partial` result (AC-22) |
|---|---|---|
| `s1-1-list.json` | 0 plugin entries | PASS |
| `s1-3-list.json` | 0 plugin entries | PASS |
| `s1-4-list.json` | 5 entries, all `@devdigest-marketplace-stable` | PASS |
| `s1-5-list.json` | 5 entries, all `@devdigest-marketplace-stable` | PASS |

The raw capture numbers follow the order of the procedure (uninstall, add, install, prune); the
mapping of a number to its exact command is not recorded in the raw files, and the numbers present
differ per step. Each capture is listed with what it shows. No capture shows two enabled entries
with the same plugin name.

`system/init` excerpt (AC-29, AC-30), `claude -p --output-format stream-json --verbose --model haiku`
with a one-line prompt, cost USD 0.0040 (`s1-init.jsonl`):

```text
system/init excerpt

| name | path |
|---|---|
| sdd-engineering | ~/.claude/plugins/cache/devdigest-marketplace-stable/sdd-engineering/1.0.0 |
| engineering-paved-path | ~/.claude/plugins/cache/devdigest-marketplace-stable/engineering-paved-path/1.0.0 |
| research-tools | ~/.claude/plugins/cache/devdigest-marketplace-stable/research-tools/1.0.0 |
| architecture-review | ~/.claude/plugins/cache/devdigest-marketplace-stable/architecture-review/1.0.0 |
| code-agents | ~/.claude/plugins/cache/devdigest-marketplace-stable/code-agents/1.0.0 |
| cc-plugin-sec-default | builtin |
| cc-plugin-agents-md | builtin |
| cc-plugin-telemetry | builtin |
| cc-plugin-plugin-authoring | builtin |

plugin_errors: []

PASS
```

OTEL excerpt (AC-31): not available. See "OTEL finding" below.

## Step 3: switch stable to latest 1.1.0

| Field | Value |
|---|---|
| Step / date / CLI version | 3 / 2026-10-16 / 2.1.296 |
| From channel / to channel | stable / latest |
| Consumer commit | `fba0b72` (changes only `.claude/settings.json`) |
| `origin/main` SHA | `4dbaec8` |
| Installed `gitCommitSha` vs `origin/main` | equal (`4dbaec8...`); install path `~/.claude/plugins/cache/devdigest-marketplace/sdd-engineering/1.1.0` |
| Assumptions marker count in the installed `spec-creator` (expected at least 1) | 3 (`installed-check`: PASS) |

Procedure followed: uninstall the five stable ids, install `sdd-engineering@devdigest-marketplace` (the
latest marketplace was still registered at project scope, so no add was needed), prune removed nothing.

Plugin list assertion (full):

```text
Plugin list assertion (channel latest)

| id | version | scope | enabled | errors | installPath |
|---|---|---|---|---|---|
| architecture-review@devdigest-marketplace | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace/architecture-review/1.0.0 |
| code-agents@devdigest-marketplace | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace/code-agents/1.0.0 |
| engineering-paved-path@devdigest-marketplace | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace/engineering-paved-path/1.0.0 |
| research-tools@devdigest-marketplace | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace/research-tools/1.0.0 |
| sdd-engineering@devdigest-marketplace | 1.1.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace/sdd-engineering/1.1.0 |

PASS
```

Per-sub-step AC-22 captures:

| Capture (raw file) | What it shows | `--partial` result (AC-22) |
|---|---|---|
| `s3-1-list.json` | 0 plugin entries | PASS |
| `s3-4-list.json` | 5 entries, all `@devdigest-marketplace` | PASS |
| `s3-5-list.json` | 5 entries, all `@devdigest-marketplace` | PASS |

The raw capture numbers follow the order of the procedure (uninstall, add, install, prune); the
mapping of a number to its exact command is not recorded in the raw files, and the numbers present
differ per step. Each capture is listed with what it shows. No capture shows two enabled entries
with the same plugin name.

`system/init` excerpt (AC-29), cost USD 0.0038 (`s3-init.jsonl`):

```text
system/init excerpt

| name | path |
|---|---|
| sdd-engineering | ~/.claude/plugins/cache/devdigest-marketplace/sdd-engineering/1.1.0 |
| engineering-paved-path | ~/.claude/plugins/cache/devdigest-marketplace/engineering-paved-path/1.0.0 |
| research-tools | ~/.claude/plugins/cache/devdigest-marketplace/research-tools/1.0.0 |
| architecture-review | ~/.claude/plugins/cache/devdigest-marketplace/architecture-review/1.0.0 |
| code-agents | ~/.claude/plugins/cache/devdigest-marketplace/code-agents/1.0.0 |
| cc-plugin-sec-default | builtin |
| cc-plugin-agents-md | builtin |
| cc-plugin-telemetry | builtin |
| cc-plugin-plugin-authoring | builtin |

plugin_errors: []

PASS
```

OTEL excerpt (AC-31): not available. See "OTEL finding" below.

## Step 4: rollback, latest 1.1.0 to stable 1.0.0

| Field | Value |
|---|---|
| Step / date / CLI version | 4 / 2026-10-16 / 2.1.296 |
| From channel / to channel | latest / stable |
| Consumer commit | `36f7c56` (changes only `.claude/settings.json`) |
| `origin/stable` SHA | `d569114a68392cde3e10136511c9a915f1f31893` |
| Installed `gitCommitSha` vs `origin/stable` (AC-25) | equal; `installed-check --expect-sha` with the SHA above: PASS |
| Assumptions marker count in the installed `spec-creator` (AC-25, expected 0) | 0 (the 1.1.0 install of step 3 had 3) |

Same procedure as step 1.

Plugin list assertion (full):

```text
Plugin list assertion (channel stable)

| id | version | scope | enabled | errors | installPath |
|---|---|---|---|---|---|
| architecture-review@devdigest-marketplace-stable | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace-stable/architecture-review/1.0.0 |
| code-agents@devdigest-marketplace-stable | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace-stable/code-agents/1.0.0 |
| engineering-paved-path@devdigest-marketplace-stable | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace-stable/engineering-paved-path/1.0.0 |
| research-tools@devdigest-marketplace-stable | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace-stable/research-tools/1.0.0 |
| sdd-engineering@devdigest-marketplace-stable | 1.0.0 | project | true | none | ~/.claude/plugins/cache/devdigest-marketplace-stable/sdd-engineering/1.0.0 |

PASS
```

Per-sub-step AC-22 captures:

| Capture (raw file) | What it shows | `--partial` result (AC-22) |
|---|---|---|
| `s4-1-list.json` | 0 plugin entries | PASS |
| `s4-4-list.json` | 5 entries, all `@devdigest-marketplace-stable` | PASS |
| `s4-5-list.json` | 5 entries, all `@devdigest-marketplace-stable` | PASS |

The raw capture numbers follow the order of the procedure (uninstall, add, install, prune); the
mapping of a number to its exact command is not recorded in the raw files, and the numbers present
differ per step. Each capture is listed with what it shows. No capture shows two enabled entries
with the same plugin name.

`system/init` excerpt (AC-29), cost USD 0.0038 (`s4-init.jsonl`):

```text
system/init excerpt

| name | path |
|---|---|
| sdd-engineering | ~/.claude/plugins/cache/devdigest-marketplace-stable/sdd-engineering/1.0.0 |
| engineering-paved-path | ~/.claude/plugins/cache/devdigest-marketplace-stable/engineering-paved-path/1.0.0 |
| research-tools | ~/.claude/plugins/cache/devdigest-marketplace-stable/research-tools/1.0.0 |
| architecture-review | ~/.claude/plugins/cache/devdigest-marketplace-stable/architecture-review/1.0.0 |
| code-agents | ~/.claude/plugins/cache/devdigest-marketplace-stable/code-agents/1.0.0 |
| cc-plugin-sec-default | builtin |
| cc-plugin-agents-md | builtin |
| cc-plugin-telemetry | builtin |
| cc-plugin-plugin-authoring | builtin |

plugin_errors: []

PASS
```

OTEL excerpt (AC-31): not available. See "OTEL finding" below.

## Step 2 and step 5

Step 2 is the verified workflow on stable 1.0.0: baseline run B1 (`cost-runs/b1.md`, verifier
verdict COMPLETE, successful). Its spec, plan, `src/word-count.ts` and test were copied into the
consumer as commit `23006a5`; `npm test` passed (141 tests) and the typecheck was clean. The
`system/init` of the run shows the stable 1.0.0 paths of all five plugins (AC-30; the record lists
them).

Step 5 is the smoke eval recorded in `smoke-eval.md`; its pointer in the consumer is `docs/rehearsal/l08-smoke-eval.md` (commit `4bf982c`).

## OTEL finding (AC-31)

Not available. Sessions were run with the console exporters enabled through environment variables
(telemetry on, logs exporter and metrics exporter set to `console`). A second attempt added short export
intervals (logs 500 ms, metrics 1000 ms; cost USD 0.0033). In `claude -p` mode both attempts produced
0 bytes on stderr and no OTEL lines on stdout, so the `claude_code.plugin_loaded` event could not be inspected
for `plugin.version` and `marketplace.name`. No setting or variable disables telemetry that could explain it.
Recorded as "not available in headless `-p` mode on 2.1.296". The version evidence rests on
`plugin list --json`, `installed_plugins.json` (`gitCommitSha`) and the `system/init` paths above.

## Consumer diff check (AC-26)

Each of the commits 1, 3 and 4 (`21153eb`, `fba0b72`, `36f7c56`) changes only `.claude/settings.json`;
the consumer's `CLAUDE.md`, sources, tests and lockfile are not touched by a switch.
