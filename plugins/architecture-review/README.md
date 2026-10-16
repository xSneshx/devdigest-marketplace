# architecture-review

## Use case

A read-only architecture audit of a file set or diff against the rules your project has
documented. Every finding names the violated rule and where it is written.

## Components

| Component | Name | Purpose |
|---|---|---|
| Agent | `architecture-review:architecture-reviewer` | Discovers the project's rules (`CLAUDE.md`, `AGENTS.md`, architecture docs, ADRs, boundary configs), checks the given files against them and cites rule and source per finding |

Tools: `Read`, `Grep`, `Glob`. `Write`, `Edit`, `NotebookEdit` and `Bash` are disallowed.
Preloaded skills: `engineering-paved-path:onion-architecture`,
`engineering-paved-path:frontend-ui-architecture`, `engineering-paved-path:next-best-practices`.

## Requirements

- Claude Code (see `COMPATIBILITY.md`).
- Git, for the marketplace install.
- Depends on `engineering-paved-path` (^1.0.0), installed automatically.
- No Node.js or Python requirement; the plugin ships no hooks.

## Installation

Add the marketplace once, then install the plugin. Dependencies are installed and enabled
automatically. Start a new session afterwards so agents, skills and hooks are loaded.

```sh
claude plugin marketplace add xSneshx/devdigest-marketplace
claude plugin install architecture-review@devdigest-marketplace
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
2. Ask: "Dispatch architecture-review:architecture-reviewer on the files changed in my
   working tree." Pass the diff or file list in the prompt.
3. Read the findings. A change that breaks no documented rule yields no findings.

This plugin reads no `.claude/project-inputs.json` keys. If the project documents no rules,
the agent says so rather than inventing a catalogue.

## Decoupling

What changed relative to the source agent:

| Source content | Replacement |
|---|---|
| Fixed rule catalogue | Discovery of the consumer project's documented rules; each finding cites the rule and its source |
| Bare skill names | Namespaced `engineering-paved-path:...` names plus a Skill-tool fallback line |
| Tool set | Unchanged: `Read, Grep, Glob`; write tools and Bash stay disallowed |
| Source-project eval fixtures | `claude plugin eval` layout (`evals/<case>/prompt.md` plus `graders/`), one case per class (positive, negative, workflow); rules and diffs embedded in each prompt so cases need no fixture project |

## Verification

```sh
claude plugin validate architecture-review --strict
claude plugin details architecture-review
```

`details` lists the agent and the dependency. Model-backed eval runs are a separate gate
(`claude plugin eval`).

## Support

Open an issue in the `xSneshx/devdigest-marketplace` repository. Include the plugin name and
version (`claude plugin list`), the Claude Code version (`claude --version`) and the smallest
prompt that reproduces the problem. Do not paste tokens or private code into an issue.
Contribution and local-testing steps are in the repository's `CONTRIBUTING.md`.
