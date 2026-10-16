# CI on the stable channel (AC-13, AC-14, AC-15)

## AC-13: catalog name check

The `channel` check compares the catalog `name` with the channel the checked ref belongs to:
`devdigest-marketplace` on `main`, `devdigest-marketplace-stable` on `stable`. The channel ref is
`--channel`, else the pull request target (`GITHUB_BASE_REF`), else the pushed ref
(`GITHUB_REF_NAME`). A ref that is not a channel ref is skipped with a logged reason.

Negative run (a test branch that targets `stable` and carries the latest catalog name):

| Field | Value |
|---|---|
| Date | |
| Pull request / run link | |
| Expected failure text | the log names the expected value `devdigest-marketplace-stable` |
| Observed | |

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
| Date | |
| Run link | |
| Log excerpt of skipped checks | |

## AC-15: branch protection

Protection settings of `stable` (force pushes and deletion off; changes only through a pull
request with a green `validate` run):

```json
(paste the protection settings JSON)
```

Attempted direct push, rejected:

```text
(paste the rejection message)
```
