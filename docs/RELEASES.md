# Releases

## SemVer

Each plugin is versioned independently in its `plugin.json`. Breaking change: major.
Backward-compatible capability: minor. Fix: patch.

## Tag format

`<plugin>--v<version>`, for example `engineering-paved-path--v1.0.0`.

Tag in dependency order: `engineering-paved-path` and `research-tools` first, then
`architecture-review` and `code-agents`, then `sdd-engineering`.

## Pre-tag checklist

Per plugin, in order:

1. CI is green on the commit to tag.
2. `claude plugin validate` passes, and evals pass at 2 of 3 or better. If validation or a
   required eval fails, do not tag that plugin.
3. Every dependency has a tag satisfying its declared range. If one has none, stop before
   tagging the dependent.
4. Run `claude plugin tag --dry-run` and read its output.
5. Create the tag, then record the evidence.

## Evidence record

One entry per tag in `docs/release-evidence/`, from `TEMPLATE.md`, linked from the
GitHub release: plugin, version, tag, commit SHA, CLI version, validation result and eval
results (pass rate, cost).

## Update path

`claude plugin marketplace update`, then `claude plugin update <plugin>`, then start a new
session. Hooks and agents are not reloaded in a running session.

## Rollback

Pin a previous tag or commit. Rename or remove a plugin through the catalog's append-only
`renames` mechanism. Never delete or move a published tag.

## Dependency-resolution rule in force

**Rule: `head-in-range`** (`dependencyResolution` in `scripts/ci/config.json`).

Evidence: [`release-evidence/preflight.md`](release-evidence/preflight.md), section "G4"
(decision D4). From a GitHub-hosted marketplace the CLI (2.1.296) clones the repository
shallow, so only the tag on HEAD exists in the clone. A dependency range therefore resolves
against the marketplace's current copy, not against older tags; the range is checked when the
plugin loads. Only the object form of a range is honoured.

Consequence for releases:

- A dependency's HEAD version must satisfy every dependent's declared range. CI
  (`head-in-range`) fails a change that moves a HEAD version outside any dependent's range.
- Tags `<plugin>--v<version>` are still created for every release, for traceability and rollback.
- Do not bump a dependency to a version outside a dependent's range unless the dependent's
  range is widened in the same change.

Re-testing after a CLI upgrade: run the fixture in `tests/dependency-resolution/`
(`prepare-remote.sh` for the GitHub-hosted case, `local-negative.sh` for the local one). If the
CLI then selects the highest satisfying tag, switch `dependencyResolution` to `tag`, update this
section, and record the new evidence.
