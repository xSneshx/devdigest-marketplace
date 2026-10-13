# Release evidence: sdd-engineering 1.0.0

| Field | Value |
|---|---|
| Plugin | `sdd-engineering` |
| Version | 1.0.0 |
| Tag (`<plugin>--v<version>`) | `sdd-engineering--v1.0.0` |
| Commit SHA | `a1eb9edb74cf3fe23683751ab55e069ede7fd8fd` |
| Date | 2026-10-13 |
| CLI version | 2.1.296 (Claude Code) |
| Validation result | `claude plugin validate --strict` passed; CI `validate.yml` green on `main` at this SHA |
| Eval results: cases | 6/9 |
| Eval results: pass rate | 67% (open: positive-reachability judge FAIL; positive-run-plan-parallel and workflow-chain inconclusive, cost ceiling) |
| Eval results: cost | part of the G7 total ≈ USD 15.35 — see [evals-1.0.0.md](evals-1.0.0.md) |
| Observed agent identifiers (`sdd-engineering`, `code-agents`) | `sdd-engineering:spec-creator`, `sdd-engineering:plan-verifier` (live refusals, G6) |
| Cross-plugin skill resolution path (frontmatter preload or explicit Skill-tool load) | frontmatter preload (G2/D2); Skill-tool fallback line kept in every agent |
| Dependency-resolution rule in force (highest satisfying tag or HEAD-within-range) | HEAD-within-range (G4/D4) |
| Tag-resolution test result | GitHub-hosted marketplace is cloned shallow: only the HEAD tag is present, so ranges resolve against HEAD (G4) |

## Captured hook input and refusal transcripts

See [preflight.md](preflight.md), sections G2 (hook input with `agent_type`) and G6 (one refused write per guarded agent, plus forced-crash refusals).

## Redaction

Home paths are `~` or `<MP>`; no tokens are included.
