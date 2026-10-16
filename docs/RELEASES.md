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

For a consumer on the latest channel, roll back by switching to the `stable` channel
(see "Release channels" below). For the `stable` channel itself, roll back with a new
promotion commit to the previous verified release (see "Stable rollback rule" below). Rename or remove a plugin
through the catalog's append-only `renames` mechanism. Never delete or move a published tag,
and never force-push a channel branch.

## Release channels

The marketplace is published as two channels from one repository. Both serve the same plugin
names.

| Channel | Ref | Catalog name | Add command |
|---|---|---|---|
| latest | `main` | `devdigest-marketplace` | `claude plugin marketplace add xSneshx/devdigest-marketplace` |
| stable | `stable` | `devdigest-marketplace-stable` | `claude plugin marketplace add xSneshx/devdigest-marketplace#stable` |

Plugin ids carry the catalog name: `sdd-engineering@devdigest-marketplace` on latest,
`sdd-engineering@devdigest-marketplace-stable` on stable. `main` always holds the newest
release. `stable` holds a verified snapshot and moves only by promotion.

The repository is public, so adding either channel over HTTPS needs no git credentials.

### One channel per project

Enable plugins from one channel only in a project. Both channels serve the same plugin names,
and when two enabled copies share a manifest name one copy's `hooks.json` is dropped, which
silently removes guards. After every step of a switch, list the plugins and check that no
manifest name is enabled twice at any scope.

### Switch procedure

Switch a project from channel X to channel Y at project scope. Run the commands from the
project root.

1. Uninstall every plugin installed from X in the project. Uninstall `sdd-engineering` first,
   then the four dependencies:
   `claude plugin uninstall <plugin>@<X catalog> --scope project`.
2. Removing X's marketplace first is not required. Observed on CLI 2.1.296 (isolated
   configuration, see `docs/release-evidence/l08/channel-probe.md`): adding
   `xSneshx/devdigest-marketplace#stable` while the same repository is registered as
   `devdigest-marketplace` succeeds, and both registrations coexist (`devdigest-marketplace` and
   `devdigest-marketplace-stable`). Skip this step. Remove X's marketplace
   (`claude plugin marketplace remove <X catalog> --scope project`) only if you also want to stop
   offering X in this project; the plugins of X are already uninstalled by step 1.
3. Add Y's marketplace at project scope (add command from the table above, with
   `--scope project`).
4. Install `sdd-engineering` from Y; its dependencies follow from Y:
   `claude plugin install sdd-engineering@<Y catalog> --scope project`.
5. Prune auto-installed dependencies that are no longer needed:
   `claude plugin prune --scope project --yes`. Prune does not remove a dependency that was
   explicitly installed or enabled in the project settings. If any plugin id from X is still
   installed or enabled after step 1 or step 5, uninstall it explicitly with the command of
   step 1. After the switch no plugin id from X may remain.
6. Verify: run `claude plugin list --json` and check that it shows exactly five entries for
   the project, each with id `<plugin>@<Y catalog>`, `enabled: true`, scope `project`, empty
   or absent `errors`, an install path ending in `/<version>`, and the versions
   `sdd-engineering` 1.0.0 on stable or 1.1.0 on latest, the four dependencies 1.0.0. Assert
   on `errors`, never on `enabled`: an unsatisfied dependency still shows `enabled: true`.
   Repeat the "no manifest name enabled twice" check after every step above.
7. Start a new session. Hooks, agents and skills are not reloaded in a running session. To
   prove which version a session loaded, capture the `system/init` message of a headless
   `claude -p --output-format stream-json --verbose` run: `plugins[]` must contain
   `sdd-engineering` with a path ending in `/<Y catalog>/sdd-engineering/<version>`, and
   `plugin_errors` must be empty or absent.

The consumer's committed project settings must reference only the active channel's
marketplace and plugin ids after each switch. A switch changes no other consumer file.

### Promotion rule

`stable` is promoted with one new commit, never a force push and never a tag move. The commit
makes the `plugins/` tree equal to a release commit already published on `main`. Promote only
a release that has both:

- a release evidence entry in `docs/release-evidence/` with strict validation passed and its
  required evals passing;
- a recorded successful consumer workflow or smoke eval on that version, installed from the
  latest channel.

The promotion pull request carries the new row of the promotion log below, linking both pieces
of evidence. `stable` is protected on GitHub: no force push, no deletion, changes only through
a pull request with a green `validate` run. CI checks that the catalog name is
`devdigest-marketplace` on `main` and `devdigest-marketplace-stable` on `stable`.

### Stable rollback rule

If a promoted stable release turns out bad, roll `stable` back with a new promotion commit to
the previous verified release, following the promotion rule. Never roll back with a force
push, and never move or delete a tag.

### Option B: a separate catalog pinned by sha

A stronger alternative is not built: a second catalog repository whose entries use a
`git-subdir` source with a `sha` pin, so each stable release is an immutable commit reference
instead of a branch tip. It would remove the dependence on branch protection and on the
shallow-clone head resolution, at the price of a second repository and a manual pin update for
every promotion. This homework builds Option A (the `stable` branch) only.

### Promotion log

| Date | From release | To release | `stable` commit | Release evidence | Consumer verification |
|---|---|---|---|---|---|
| 2026-10-16 | none (stable initial snapshot) | 1.0.0 (all five plugins) | `d569114a68392cde3e10136511c9a915f1f31893` (PR #2) | `docs/release-evidence/sdd-engineering--v1.0.0.md`, `docs/release-evidence/evals-1.0.0.md`, `docs/release-evidence/l08/ci-channel.md` | `docs/release-evidence/l08/channel-switches.md` (step 1) and the successful baseline run `docs/release-evidence/l08/cost-runs/b1.md` |

### Deferred plugin-README wording

The five plugin READMEs still describe the repository as private and credentials as required.
The repository is public now, but editing a released plugin folder forces a version bump, so
the public wording is not applied in this change. Each plugin README receives it in that
plugin's next release.

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
