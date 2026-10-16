# CI negative check (gate G5)

Branch `ci/negative-checks` (deleted after the run) planted one violation per commit on top of `main`, then was pushed. Run: https://github.com/xSneshx/devdigest-marketplace/actions/runs/38435289657 — conclusion **failure**, as intended. Confirmed on 2026-10-13 that no repository secret is needed (`validate.yml` references none).

| Planted violation | Check that failed | Message (excerpt) |
|---|---|---|
| String-form dependency `"engineering-paved-path@devdigest-marketplace@^1.0.0"` in `code-agents` | `dep-form` | `string dependency … carries a range that the CLI ignores; use { "name", "version" }` |
| Home path and a credential-shaped token in `researcher.md` | `content` | `secret pattern "aws-access-key"`; `absolute-home-path` |
| `engineering-paved-path` bumped to 2.0.0 | `head-in-range` | `architecture-review: requires engineering-paved-path ^1.0.0, but engineering-paved-path is at 2.0.0 on HEAD` (also `sdd-engineering`) |
| same bump | `cli` | `Failed to install plugin "architecture-review@devdigest-marketplace": Dependency "engineering-paved-path@devdigest-marketplace" is installed at 2.0.0, which does not satisfy: ^1.0.0` |
| Skill `zod` removed from `engineering-paved-path` | `cli` | `skills reported by "claude plugin details" […] differ from component-map.json […, zod]` |
| Released plugins edited without a version bump | `versions` | not caught in that run (see below); locally with `--base main`: `research-tools: 1 file(s) changed since main … but released version 1.0.0 (tag research-tools--v1.0.0) is unchanged; bump it` (also `architecture-review`, `code-agents`) |

## Defect found

On the first push of a new branch, `github.event.before` is all zeros and the workflow fell back to `HEAD~1`, so `versions` only saw the branch's last commit. Fixed in `validate.yml`: a first push of a non-`main` branch now compares against `git merge-base origin/main HEAD`. Pull requests already used `origin/<base_ref>`.
