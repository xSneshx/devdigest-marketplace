# research-tools

## Use case

A read-only researcher agent. Use it to investigate a codebase or an external topic
before a change and get a structured, evidence-backed report.

## Components

| Component | Name | Purpose |
|---|---|---|
| Agent | `research-tools:researcher` | Finds information in the current project (code, docs, specs, notes, config, git history) or in external sources, and reports with `path:line` evidence |

Tools: `Read`, `Grep`, `Glob`, `Bash`, `WebSearch`, `WebFetch`. The agent has no write
tools. Its Bash use is read-only by instruction: this plugin ships no hook that enforces it,
so treat the limit as a prompt-level rule.

## Requirements

- Claude Code (see `COMPATIBILITY.md`).
- Git, for the marketplace install.
- No dependencies on other plugins, and no Node.js or Python requirement.

## Installation

Add the marketplace once, then install the plugin. Dependencies are installed and enabled
automatically. Start a new session afterwards so agents, skills and hooks are loaded.

```sh
claude plugin marketplace add xSneshx/devdigest-marketplace
claude plugin install research-tools@devdigest-marketplace
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

## Quick start

1. Install the plugin and start a new session.
2. Ask: "Use research-tools:researcher to find where retries are configured and which
   components depend on them."
3. The report cites files and lines. Other agents (for example the spec and plan authors in
   `sdd-engineering`) dispatch it as `research-tools:researcher`.

This plugin reads no `.claude/project-inputs.json` keys; it discovers curated material
(`CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/`, `specs/`, ADRs, notes and changelog files).

## Decoupling

| Removed from the source agent | Replaced by |
|---|---|
| Source-project identity in the opening line | "the project you are run in" |
| Fixed list of curated material (root and package notes, architecture and testing docs) | Discovery step with `Glob`: `CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/`, `specs/`, ADRs, notes and changelog files |
| Source-project facts (several packages, diverged shared copies, in-memory job queue) | Generic check: monorepo or several packages, duplicated copies of a contract |
| Pinned versions from one package manifest and package manager | Versions pinned from the consumer's own manifest and lockfile |
| Example paths and package names in the output templates | Neutral example paths |
| Read-only Bash enforced by the source project's hooks | Stated in the prompt; no hook in this plugin enforces it |

## Verification

```sh
claude plugin validate research-tools --strict
claude plugin details research-tools
```

`details` lists the `researcher` agent. Eval cases (positive, negative, workflow) are under
`evals/`.

## Support

Open an issue in the `xSneshx/devdigest-marketplace` repository. Include the plugin name and
version (`claude plugin list`), the Claude Code version (`claude --version`) and the smallest
prompt that reproduces the problem. Do not paste tokens or private code into an issue.
Contribution and local-testing steps are in the repository's `CONTRIBUTING.md`.
