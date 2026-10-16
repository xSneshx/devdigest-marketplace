# Isolated probes (AC-20, AC-10, AC-6)

Run with an isolated Claude configuration directory (`CLAUDE_CONFIG_DIR` pointing at an empty
scratch folder) and with git credentials disabled, so the user configuration is untouched and no
credential helper can be used. CLI version 2.1.296. Date of all probes: 2026-10-16. Raw outputs:
`evals-out/l08/probe-1-latest.txt` to `probe-4-help.txt` (ignored folder, not committed).

Note on scope: the probes registered the marketplaces at the CLI's default scope ("declared in
user settings" of the isolated config), not with `--scope project`. The question they answer is
whether two registrations of the same repository can coexist. The consumer rehearsal in
`channel-switches.md` then used `--scope project`.

## AC-20: does a second registration of the same repository work?

Question: does adding `xSneshx/devdigest-marketplace#stable` succeed while the same repository is
registered as `devdigest-marketplace`?

| Field | Value |
|---|---|
| Date | 2026-10-16 |
| Command | step 1: `claude plugin marketplace add xSneshx/devdigest-marketplace`; step 2: `claude plugin marketplace add xSneshx/devdigest-marketplace#stable` |
| Exit code and output | both exit 0. Step 2 output ends with `Successfully added marketplace: devdigest-marketplace-stable (declared in user settings)` |
| Observed behaviour | the marketplace list after step 2 holds both registrations: `devdigest-marketplace` (source `github`, no ref) and `devdigest-marketplace-stable` (source `github`, `ref: stable`) |
| Decision for `docs/RELEASES.md` | remove X's marketplace before adding Y's: **no** (`REMOVE_FIRST=no`); both registrations coexist, so step 2 of the switch procedure is optional |

Output of step 2 (clone lines abbreviated, no credential involved):

```text
Adding marketplace…SSH not configured, cloning via HTTPS: https://github.com/xSneshx/devdigest-marketplace.git
Cloning repository (timeout: 120s): https://github.com/xSneshx/devdigest-marketplace.git (ref: stable)
Clone complete, validating marketplace…
✔ Successfully added marketplace: devdigest-marketplace-stable (declared in user settings)
exit=0
```

## AC-10: the stable command copied from the site

| Field | Value |
|---|---|
| Date | 2026-10-16 |
| Copied command | `claude plugin marketplace add xSneshx/devdigest-marketplace#stable` (the text the site's getting-started screen copies) |
| Marketplace name that results | expected `devdigest-marketplace-stable` |
| Observed | in a fresh configuration the command exits 0 and registers `devdigest-marketplace-stable` with `ref: stable` |

## AC-6: add without a git credential helper

| Field | Value |
|---|---|
| Date | 2026-10-16 |
| Environment | isolated configuration directory, git credentials disabled (no GitHub credential helper) |
| Command and result | `claude plugin marketplace add xSneshx/devdigest-marketplace` exits 0 and clones over HTTPS (`SSH not configured, cloning via HTTPS`); the marketplace `devdigest-marketplace` is registered |

## Supporting probe: CLI surface (`probe-4-help.txt`)

On CLI 2.1.296 the help output shows these options, which the switch procedure relies on:
`marketplace add` and `marketplace remove` accept `--scope`; `plugin uninstall` accepts `--prune`,
`--keep-data`, `-s` and `-y`; `plugin install` accepts `-s`.
