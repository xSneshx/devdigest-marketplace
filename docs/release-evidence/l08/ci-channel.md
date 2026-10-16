# CI on the stable channel (AC-13, AC-14, AC-15)

## AC-13: catalog name check

The `channel` check compares the catalog `name` with the channel the checked ref belongs to:
`devdigest-marketplace` on `main`, `devdigest-marketplace-stable` on `stable`. The channel ref is
`--channel`, else the pull request target (`GITHUB_BASE_REF`), else the pushed ref
(`GITHUB_REF_NAME`). A ref that is not a channel ref is skipped with a logged reason.

Negative run (a test branch that targets `stable` and carries the latest catalog name):

| Field | Value |
|---|---|
| Date | 2026-10-16 |
| Pull request / run link | draft pull request https://github.com/xSneshx/devdigest-marketplace/pull/3 (stable catalog name set back to `devdigest-marketplace`); closed unmerged, its branch deleted |
| Expected failure text | the log names the expected value `devdigest-marketplace-stable` |
| Observed | the `validate` run failed on `FAIL channel (1)` with the line below (`evals-out/l08/stable-negative.log`) |

```text
catalog name "devdigest-marketplace" on channel ref "stable"; expected "devdigest-marketplace-stable"
```

## AC-14: audit of every check on `stable`

Every check of the suite is meaningful on `stable`, so none is skipped on purpose. The only
logged skips are the existing, input-dependent ones: `versions` when there is no usable base ref,
`channel` for a ref that is not a channel ref, and `cli` unless `--with-cli` is given.

| Check | Runs on stable | Reason |
|---|---|---|
| `catalog` | yes | entry names, versions and sources are the same on `stable` |
| `channel` | yes | compares the catalog name with the channel ref |
| `cli` | yes | validates the catalog and every plugin with the pinned CLI; the tag dry-run reads the tags that CI fetches |
| `codeowners` | yes | `CODEOWNERS` is part of the branch |
| `content` | yes | the same secret, home-path and deny-list scan |
| `dep-form` | yes | dependencies keep the object form |
| `frontmatter` | yes | agent and skill frontmatter is unchanged |
| `graph` | yes | the dependency graph is unchanged |
| `guard-parity` | yes | the two guard copies stay byte-identical |
| `head-in-range` | yes | all five manifests carry 1.0.0 at the head of `stable`, so every range holds |
| `namespacing` | yes | cross-plugin references are unchanged |
| `skills-backed` | yes | cross-plugin skills stay backed by dependencies |
| `structure` | yes | README sections, changelog and eval classes are unchanged |
| `versions` | yes, with a base | a promotion pull request changes `plugins/` against a released version and needs a bump; skipped with a logged reason when no base resolves |

Green `validate` run on `stable` (skipped checks and their reasons are listed in the log):

| Field | Value |
|---|---|
| Date | 2026-10-16 |
| Run | the `validate` run of pull request https://github.com/xSneshx/devdigest-marketplace/pull/2 (target `stable`), log in `evals-out/l08/stable-pr-validate.log` |
| Result | `PASS channel` and all 14 checks PASS (`catalog`, `channel`, `cli`, `codeowners`, `content`, `dep-form`, `frontmatter`, `graph`, `guard-parity`, `head-in-range`, `namespacing`, `skills-backed`, `structure`, `versions`) |
| Log excerpt of skipped checks | none: the log has no `SKIP` line. (A `FAIL head-in-range` line appears in that log only inside a negative unit-test fixture, not in the marketplace checks.) |

Pull request #2 was squash-merged; the resulting `stable` head is
`d569114a68392cde3e10136511c9a915f1f31893`. `git diff sdd-engineering--v1.0.0 origin/stable -- plugins/`
is empty (0 lines). `git diff --stat` between the tag and `origin/stable` lists only
`.claude-plugin/marketplace.json`, `.github/workflows/validate.yml`, `README.md`,
`scripts/ci/check-channel.mjs`, `scripts/ci/config.json`, `scripts/ci/lib/check.mjs` and
`tests/ci/core/channel.test.mjs` (AC-11, the paths allowed by Errata E-1).

## AC-15: branch protection

Protection settings of `stable` (force pushes and deletion off; changes only through a pull
request with a green `validate` run):

Saved in full in `evals-out/l08/stable-protection.json`; the relevant fields:

```json
{
  "required_status_checks": { "strict": true, "contexts": ["validate"] },
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "enforce_admins": { "enabled": true },
  "allow_force_pushes": { "enabled": false },
  "allow_deletions": { "enabled": false }
}
```

Changes land only through a pull request with a green `validate` run. No approving review is
required (0 approvals).

Attempted direct push, rejected:

```text
remote: error: GH006: Protected branch update failed for refs/heads/stable.
remote: - Changes must be made through a pull request.
remote: - Required status check "validate" is expected.
 ! [remote rejected] HEAD -> stable (protected branch hook declined)
error: failed to push some refs to 'https://github.com/xSneshx/devdigest-marketplace.git'
```

The command was `git push origin HEAD:stable` (`evals-out/l08/stable-direct-push.txt`).
