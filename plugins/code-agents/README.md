# code-agents

## Use case

An implementer and a test-writer agent for any project, with plugin-level guard hooks that
enforce their limits. Works on its own, with or without the spec-driven workflow.

## Components

| Component | Name | Purpose |
|---|---|---|
| Agent | `code-agents:implementer` | Implements a plan task or a plain request in the consumer project and brings the checks to green. Maps the project first (context files, check commands, test locations) |
| Agent | `code-agents:test-writer` | Writes or extends tests following the framework, location and naming the project already uses |
| Hook | `PreToolUse` guard (`hooks/`) | Keys on `agent_type` = `code-agents:implementer` or `code-agents:test-writer`; any other agent is untouched |

Guard behaviour:

- **implementer:** refuses git commands that record, publish, rewrite or discard work
  (commit, push, reset, restore, checkout, stash, clean, rebase, tag, ...), `gh` write
  commands, edits to lockfiles, and edits to `protectedPaths`.
- **test-writer:** may write only test files and test helpers (never manifests, lockfiles or tool configuration); Bash is a read-only whitelist plus the project's own check commands.
- On a crash, a timeout or malformed input the guard denies for the guarded agents only
  (fail closed); other agents are never blocked. Measured guard latency: p95 about
  100-115 ms on a loaded, sandboxed macOS machine.

Preloaded skills come from `engineering-paved-path` (namespaced names). Resolution path (verified at gate G2): a cross-plugin `skills:` entry is preloaded into the agent's context; if a listed skill is not in context, the agent loads it with the Skill tool by its namespaced name.

## Requirements

- Claude Code (see `COMPATIBILITY.md`).
- Node.js >= 22 on `PATH`, for the guard hooks. Without it the guarded agents are denied.
- Git.
- Depends on `engineering-paved-path` (^1.0.0), installed automatically.

## Installation

Add the marketplace once, then install the plugin. Dependencies are installed and enabled
automatically. Start a new session afterwards so agents, skills and hooks are loaded.

```sh
claude plugin marketplace add xSneshx/devdigest-marketplace
claude plugin install code-agents@devdigest-marketplace
```

The marketplace repository is private, and Claude Code clones it with git without a prompt.
Set up non-interactive git credentials first, with either:

- HTTPS: `gh auth setup-git` (after `gh auth login`), or any other git credential helper
  that holds a token with read access to the repository; or
- SSH: a prompt-free key (loaded in the agent, no passphrase prompt) with read access, then
  add the marketplace by its SSH URL: `claude plugin marketplace add git@github.com:xSneshx/devdigest-marketplace.git`.

Check access with `git ls-remote https://github.com/xSneshx/devdigest-marketplace.git` (or the
SSH URL). It must finish without asking for input.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Adding the marketplace or installing fails with a git authentication error, or hangs and then fails because git cannot ask for a username or password | The repository is private and the install runs git non-interactively. Set up credentials as described under Installation (`gh auth setup-git` or a prompt-free SSH key), confirm with `git ls-remote`, and retry. |
| The plugin is listed but shows a load error about an unsatisfied dependency version | Update the marketplace (`claude plugin marketplace update`), then run `claude plugin update <plugin>`. Dependency ranges are checked against the plugin versions in the marketplace's current commit. |
| Agents, skills or hooks do not appear after install | Start a new session; components are loaded at session start. Run `claude plugin list` to confirm the plugin is enabled. |
| Guarded agent refuses every write, or the hook reports Node.js is too old | Node.js >= 22 is missing from the environment that runs Claude Code. Install it and restart the session. |

## Quick start

1. Install the plugin and start a new session.
2. Ask: "Use code-agents:implementer to add input validation to the signup handler, then
   code-agents:test-writer to cover it."
3. The implementer reports check results and leaves committing to you.

Optional `.claude/project-inputs.json` in your project (all keys optional; an explicit value
wins over discovery):

| Key | Read by | Meaning |
|---|---|---|
| `ruleFiles` | implementer | rule and context files to read first |
| `checkCommands` | implementer, test-writer | commands used for verification |
| `testLocations` | implementer, test-writer, test guard | where tests live |
| `protectedPaths` | implementer guard | paths the implementer must not edit (lockfiles are always protected) |
| `planDir` | implementer | where plans live, when given a plan by name |
| `specDirs` | implementer | spec directories, when a task cites a spec |
| `retroLedger` | none of these agents | accepted by the shared input loader (used by the retro skill in `sdd-engineering`); has no effect here |

A malformed file is a guard evaluation failure, and the guarded agents are denied until it is fixed.

## Decoupling

Each source-project input became either a generic rule or an explicit input the consumer
supplies (AC-12, AC-14, AC-69, AC-70).

| Source reference | Replacement in this plugin |
|---|---|
| Source-specific plan name and fixed package scope | Any plan task or a plain request; the project is mapped first and scope comes from the task |
| Fixed package-to-skill routing table | Skills are applied by the kind of path touched; the project's own context files decide conventions |
| Root and per-package notes files read first | Context files discovered in the project (`CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/`) or listed in `ruleFiles[]` |
| Hard-coded check commands per package | Commands read from the project's script manifests, or `checkCommands[]`; an undefined command is reported as missing, never invented |
| Docker-gated integration command | "Not run" with the reason when a required service is unavailable |
| Protected generated directories, migrations, pipeline code, shared-contract copies | `protectedPaths[]`, enforced by the plugin-level guard; lockfiles are always protected |
| Source test locations and colocation rules | Locations found in the project's existing tests, or `testLocations[]` |
| Product-specific test doubles and hook-module mocking | Generic rule: mock only I/O seams, copy the nearest existing test |
| Lockfile-drop warning for one package manager | Removed; the project's own install command is the rule |
| Insight-file writing rules and the insights skill | Removed; agents return insight candidates as plain text and the caller records them |
| Database design skills | Removed from `skills:`; not part of the paved-path set |
| Frontmatter `hooks`, `permissionMode`, `mcpServers` | Removed (plugin agents ignore them); limits are enforced by plugin-level `PreToolUse` hooks |
| Bare skill names | Namespaced `engineering-paved-path:<skill>` plus a Skill-tool fallback line |

## Verification

```sh
claude plugin validate code-agents --strict
claude plugin details code-agents
node --version   # must print v22 or newer
```

`details` lists both agents, the hook and the dependency. Eval cases (positive, negative,
workflow) are under `evals/`.

## Support

Open an issue in the `xSneshx/devdigest-marketplace` repository. Include the plugin name and
version (`claude plugin list`), the Claude Code version (`claude --version`) and the smallest
prompt that reproduces the problem. Do not paste tokens or private code into an issue.
Contribution and local-testing steps are in the repository's `CONTRIBUTING.md`.
