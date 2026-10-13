# Dependency-resolution fixture (AC-73, AC-74, AC-75)

Static tree of the `testmp` marketplace used to check how the CLI resolves
dependency ranges:

- `dep`: HEAD at 2.0.0; the tags `dep--v1.0.0` and `dep--v2.0.0` are made by `../prepare-remote.sh`.
- `app-obj`: object-form dependency `{ "name": "dep", "version": "^1.0.0" }`. On CLI 2.1.296 the dependency resolves by tag (`dep` version `1.0.0-<sha>`, `folderVersion` 2.0.0) and `app-obj` is enabled.
- `app-str`: string-form dependency `"dep@testmp@^1.0.0"`. `claude plugin validate --strict` accepts it, and the CI check of AC-73 rejects it. Whether 2.1.296 honours or ignores the string range is recorded by `../local-negative.sh`, not asserted.
- `app-obj-miss`: object-form `{ "name": "dep", "version": "^3.0.0" }`, a range no tag satisfies (AC-74 negative).
- `app-str-miss`: string-form `"dep@testmp@^3.0.0"`, recorded only.

The tree is static, so no tag exists here. Tags only exist in the repo the scripts build.

## G4 procedure (maintainer gate, remote install)

1. `../prepare-remote.sh /path/to/new-dir` creates the commits and tags.
2. Create a throwaway private GitHub repo and push `main` and both tags.
3. In an isolated config: `CLAUDE_CONFIG_DIR=$(mktemp -d) claude plugin marketplace add owner/repo`.
4. `claude plugin install app-obj@testmp`, then `claude plugin install app-str@testmp`.
5. `claude plugin list --json`: record, per app, whether it is enabled, the `dep` `version` and `folderVersion`, and any "Requires"-style message.
6. Delete the throwaway repo. Replace home paths with `~` and drop tokens before saving evidence.

The local variant (a local git path, no GitHub) is `../local-negative.sh`.
