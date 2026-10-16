# Plugin guidelines

## Structure

- One directory per plugin under `plugins/<name>/`, one catalog entry per directory in
  `.claude-plugin/marketplace.json`.
- Allowed content: `.claude-plugin/plugin.json`, `agents/`, `skills/`, `commands/`,
  `hooks/`, supporting scripts, `README.md`, `CHANGELOG.md`, `COMPATIBILITY.md`.
- Forbidden content in a plugin: `CLAUDE.md`, `AGENTS.md`, `settings.json`, product specs
  or plans, cached artifacts, a top-level `bin/` directory. CI rejects them.
- No component may reference an absolute filesystem path, a secret, or a token that names
  a specific consumer project. A plugin README lists each replaced project reference and
  the explicit input that took its place.
- Hook commands quote `"${CLAUDE_PLUGIN_ROOT}"`, because install paths can contain spaces.

## Manifest fields

`.claude-plugin/plugin.json`:

| Field | Rule |
|---|---|
| `name` | kebab-case, equal to the directory name and the catalog entry |
| `version` | SemVer; the single source of the version. Catalog entries omit `version`; if one is present CI requires it to equal the manifest |
| `description` | one sentence |
| `author` | object with `name` |
| `dependencies` | optional; object form only, see below |

## Dependency rules

- Declare a dependency in object form with a range: `{ "name": "engineering-paved-path", "version": "^1.0.0" }`.
- The string form with a range (`name@marketplace@range`, or any string containing a
  range) is rejected by CI. `claude plugin validate --strict` accepts it, but the CLI
  silently ignores the range, so it would look safe and not be.
- Every dependency names a plugin that exists in this catalog, and the graph has no cycle.
- A hard dependency is declared only when the plugin cannot function without the other plugin.

## Two mechanisms, not one

Two independent mechanisms connect plugins. Neither replaces the other.

| Mechanism | Where | When it acts | What it does |
|---|---|---|---|
| Manifest `dependencies` | `plugin.json` | install time | makes the other plugin installed and enabled |
| Agent `skills:` frontmatter | the agent's `.md` file | run time | injects the named skill into that agent |

- A cross-plugin `skills:` entry needs a declared dependency that backs it; CI checks that
  every cross-plugin `skills:` entry in the catalog has one.
- A declared dependency does not by itself load any skill into an agent; the agent still
  lists the skill in `skills:`.
- Agents that list a cross-plugin skill also carry a fallback line: if a listed skill is
  not already in context, load it with the Skill tool by its namespaced name.
- Declare a hard dependency only when the plugin cannot function without the other plugin.

## Namespacing

Every reference from a component to a skill or agent in another plugin uses the namespaced
form: `engineering-paved-path:<skill>`, `research-tools:researcher`,
`architecture-review:architecture-reviewer`, `code-agents:implementer`,
`code-agents:test-writer`, `sdd-engineering:<agent>`. Commands and skills share the
`/<plugin>:<name>` namespace, so their names must not collide within a plugin.

## Project inputs contract

Discovery is the default: agents find rule files, spec directories and check commands by
reading the consumer repository. A consumer may override any item in
`.claude/project-inputs.json` in its own repository. An explicit value wins over
discovery, and an agent's output states which value came from an explicit input. All keys
are optional. The shared loader is `plugins/code-agents/hooks/lib/project-inputs.mjs`.

| Key | Type | Meaning | Default |
|---|---|---|---|
| `ruleFiles` | string[] of paths | rule files agents read | discovered: `CLAUDE.md`, `AGENTS.md`, `README.md` and equivalents |
| `specDirs` | string[] of paths | spec directory patterns | `specs/` and `<package>/specs/` |
| `planDir` | path | plan directory | supplied by the caller of the planner |
| `checkCommands` | string[] of commands | commands for verification | discovered from script manifests; read-only profiles get none unless discovered or declared |
| `testLocations` | string[] of paths | test locations for the test-writer guard | discovered from existing tests |
| `protectedPaths` | string[] of paths or globs | paths the implementer guard refuses | lockfiles only |
| `retroLedger` | path | retro ledger file, read by workflow-retro (the skill's `ledger:<path>` input wins) | `docs/sdd-retros/ledger.md` |

Rules enforced by the loader:

- Path entries must be project-relative: absolute paths (leading `/`, `\` or a drive
  letter) and any entry containing `..` are rejected. `checkCommands` entries are commands,
  not paths, and are only required to be non-empty strings.
- List keys must be arrays of non-empty strings; an empty list counts as not set.
- A malformed file (invalid JSON, not an object, or a bad value) is a guard evaluation
  failure: guarded agents' calls are refused (see the fail policy in `SECURITY.md`) rather
  than the file being ignored.
