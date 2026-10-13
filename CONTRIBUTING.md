# Contributing

## Plugin structure

Every plugin lives in `plugins/<name>/` and is listed in `.claude-plugin/marketplace.json`.

```
plugins/<name>/
  .claude-plugin/plugin.json   manifest (name, version, description, author, dependencies)
  agents/  skills/  commands/  hooks/   only what the plugin ships
  README.md  CHANGELOG.md
```

A plugin must not contain a `CLAUDE.md`, an `AGENTS.md`, a `settings.json`, product specs
or plans, cached artifacts or a top-level `bin/` directory. Components reference skills and
agents of other plugins only by their namespaced name (`<plugin>:<name>`). Full rules:
[docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md).

## Local testing

```sh
claude plugin validate . --strict          # catalog and every manifest
claude --plugin-dir plugins/<name>         # load one plugin into a session
npm test                                   # unit tests of guards and CI scripts
npm run ci                                 # the full deterministic CI suite
```

Run the suite before opening a pull request. CI runs the same checks and rejects secret
patterns, absolute filesystem paths and project-specific tokens in any committed file.

## Version-bump rule

- Any change to a plugin's shipped files bumps that plugin's version in its
  `plugin.json` (the only place a version is set) and adds a `CHANGELOG.md` entry.
- Follow SemVer: breaking change is major, new backward-compatible capability is minor,
  fix is patch.
- A bump must keep every dependent's declared range satisfied, or the dependents' ranges
  are updated in the same pull request.

## Review requirements

- Every pull request needs one approving review from a CODEOWNER.
- Changes to hooks, to supporting scripts, to `scripts/` and to `.github/` always need
  CODEOWNER review: they execute on consumer machines or in CI.
- CI must be green. Releases follow [docs/RELEASES.md](docs/RELEASES.md).
