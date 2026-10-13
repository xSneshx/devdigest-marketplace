# Release evidence: <plugin> <version>

Copy this file to `<plugin>--v<version>.md` and fill every field.

| Field | Value |
|---|---|
| Plugin | |
| Version | |
| Tag (`<plugin>--v<version>`) | |
| Commit SHA | |
| Date | |
| CLI version | |
| Validation result | |
| Eval results: cases | |
| Eval results: pass rate | |
| Eval results: cost | |
| Observed agent identifiers (`sdd-engineering`, `code-agents`) | |
| Cross-plugin skill resolution path (frontmatter preload or explicit Skill-tool load) | |
| Dependency-resolution rule in force (highest satisfying tag or HEAD-within-range) | |
| Tag-resolution test result | |

## Captured hook input and refusal transcripts

Paste the captured hook input and one refused write per guarded agent.

## Redaction

Replace the home directory with `~` and remove every token before committing. CI rejects
absolute filesystem paths and secret patterns in committed files.
