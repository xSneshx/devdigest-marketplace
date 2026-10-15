# Evidence: making the repository public

Spec: SPEC-2026-10-15-l08-homework, AC-1 to AC-3. Recorded 2026-10-15, before the visibility
change.

## AC-3: rewritten history is what origin serves

The author and committer e-mails were rewritten to the GitHub noreply address, and the release
tags were recreated with the same noreply tagger. The rewritten history was then force-pushed.

`git ls-remote --heads --tags origin`:

| Ref | SHA |
|---|---|
| `main` | `6d9f43e6a06be167c2047f6b284c477e50cbd1b5` |
| `feat/catalog-site` (PR #1 head) | `a3cd25a2bacb6b2294dc3c5e95e9539d0a0b97d0` |
| `*--v1.0.0` (five tags, annotated) | target commit `7382f2b` |
| `sdd-engineering--v1.1.0` (annotated) | target commit `2fc64c5` |

The tag targets match the per-release evidence files (updated in `6d9f43e`). All six GitHub
releases are still attached to their tags.

## AC-1: full-history scan

Scope: a fresh `git clone --mirror` that fetched every ref (`refs/heads/*`, `refs/tags/*`,
`refs/pull/1/*`). That is 28 commits.

```sh
git log --all --format='%ae%n%ce' | sort -u
git rev-list --all | xargs git grep -I -E -n "$PATTERN"
git log --all --format='%B' | grep -E "$PATTERN"
```

`$PATTERN` matches the following. It is not written out literally here, because this repo's own
content check would flag the literal text.

- macOS, Linux and Windows home or drive paths;
- GitHub tokens (classic, fine-grained and OAuth);
- OpenAI-, Anthropic- and OpenRouter-style API keys;
- AWS access key ids and Slack tokens;
- PEM private-key headers.

Results:

- **E-mails.** Only `34837055+xSneshx@users.noreply.github.com` and `noreply@github.com`. The
  second is GitHub's own committer on the `refs/pull/1/merge` test-merge commit.
- **Contents.** 0 findings. Every hit is one of two things:
  - a detection regex itself (`scripts/ci/check-content.mjs`, `site/indexer/leak-patterns.ts`,
    the security skill);
  - a synthetic negative fixture under `tests/ci/content/fixtures/`: user `alice`, an
    all-letters `ghp_`/`AKIA`/`xoxb-` token, or a private-key header line with no body.
- **Commit messages.** 0 findings.

AC-2: nothing had to be removed, so the visibility change may proceed.
