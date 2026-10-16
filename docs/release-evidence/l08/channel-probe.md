# Isolated probes (AC-20, AC-10, AC-6)

Run with an isolated Claude configuration directory and a scratch project, so the user
configuration is untouched. CLI version 2.1.296.

## AC-20: does a second registration of the same repository work?

Question: does adding `xSneshx/devdigest-marketplace#stable` succeed while the same repository is
registered as `devdigest-marketplace`?

| Field | Value |
|---|---|
| Date | |
| Command | `claude plugin marketplace add xSneshx/devdigest-marketplace#stable --scope project` |
| Exit code and output | |
| Observed behaviour | |
| Decision for `docs/RELEASES.md` | (remove X's marketplace before adding Y's: yes or no) |

## AC-10: the stable command copied from the site

| Field | Value |
|---|---|
| Date | |
| Copied command | |
| Marketplace name that results | expected `devdigest-marketplace-stable` |
| Observed | |

## AC-6: add without a git credential helper

| Field | Value |
|---|---|
| Date | |
| Environment | shell with no GitHub credential helper |
| Command and result | |
