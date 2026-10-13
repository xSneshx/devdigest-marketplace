# engineering-paved-path

## Use case

Ten engineering skills that describe a paved path for web projects: where code lives,
how to write it and how to test it. Install it to get the same guidance in any project, or
as the foundation the agent plugins preload from.

## Components

| Skill | Covers |
|---|---|
| `engineering-paved-path:frontend-ui-architecture` | Placement and layer boundaries for a frontend |
| `engineering-paved-path:react-best-practices` | Component, hook and state design |
| `engineering-paved-path:next-best-practices` | Next.js file conventions, server components, data patterns |
| `engineering-paved-path:react-testing-library` | Component and hook tests |
| `engineering-paved-path:onion-architecture` | Backend layering and dependency direction |
| `engineering-paved-path:fastify-best-practices` | Fastify routes, plugins, hooks, testing |
| `engineering-paved-path:typescript-expert` | TypeScript typing and diagnostics |
| `engineering-paved-path:zod` | Schema validation |
| `engineering-paved-path:security` | Security review checklist and examples |
| `engineering-paved-path:mermaid-diagram` | Mermaid diagrams in Markdown |

The skills carry their reference material (`references/`, `rules/`, examples) inside the
plugin. There are no agents, commands or hooks.

## Requirements

- Claude Code (see `COMPATIBILITY.md`).
- Git, for the marketplace install.
- Optional: Python 3, only if you run `typescript-expert`'s `scripts/ts_diagnostic.py` yourself.
- No dependencies on other plugins. Other plugins in this marketplace depend on this one.

## Installation

Add the marketplace once, then install the plugin. Dependencies are installed and enabled
automatically. Start a new session afterwards so agents, skills and hooks are loaded.

```sh
claude plugin marketplace add xSneshx/devdigest-marketplace
claude plugin install engineering-paved-path@devdigest-marketplace
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
2. Ask a question in a skill's area, for example "how should I type a discriminated union
   for API errors?". The matching skill is applied.
3. To invoke one by name, ask for it: "use engineering-paved-path:zod to design this schema".

Project-specific facts (directory names, package names, rule files) are not baked in. Each
architecture skill tells the agent to map layers to the consuming project's own
documentation first. This plugin reads no `.claude/project-inputs.json` keys.

## Decoupling

The skills were generalized from a source project so that they reference none of its paths,
packages or tools (AC-12).

| Skill | Removed or generalized | Replaced with |
|---|---|---|
| frontend-ui-architecture | "This repository" section (source tree, internal UI and contracts packages, API client, backend framework) | "Applying this to a project": take the mapping from the consumer's own docs |
| frontend-ui-architecture | Placement-table entries naming the internal packages and API client | Neutral wording ("the project's typed API client", "shared contracts package") |
| frontend-ui-architecture | `README.md` (measurement notes about the source tree) | Dropped; it was provenance, not skill content |
| frontend-ui-architecture | `references/nextjs-architecture.md`, `placement.md`, `boundaries.md`: source-specific data-access statement, example module names, package import paths | Conditional wording (decide the data-access approach from the consumer's docs), generic examples, `<ui-package>/...` |
| react-best-practices | Project-specific data hooks and UI folder | "the project's data hooks", "shared UI components" |
| next-best-practices | Example URL segments that collided with the home-directory deny-list pattern | Neutral example segments |
| onion-architecture | "This repository" section, ports-location paragraph, source-specific README and eval fixtures | "Applying it to a project" (map layers to the consumer's directories first); README and fixtures dropped |
| onion-architecture | `references/layer-map.md`, `enforcement.md`, `migration.md`: live status, counts, project paths | Rewritten generic: illustrative layout, rule sketches, typical order of fixes |
| onion-architecture | `references/adapters.md`, `persistence.md` | Neutralized paths and an example module name; guidance kept |
| fastify-best-practices | Registry metadata file; example route paths that matched the deny-list | Removed; neutral `/members/...` examples |
| zod | A compiled `AGENTS.md` (a plugin must not contain one, AC-11) | `SKILL.md` and `README.md` point at `references/` |
| security | A stack-trace sample path in `examples.md` | A neutral `/app/dist/...` path |
| typescript-expert, react-testing-library, mermaid-diagram | Nothing project-specific | Copied as is |

## Verification

```sh
claude plugin validate engineering-paved-path --strict
claude plugin details engineering-paved-path
```

`details` lists the ten skills. The plugin ships eval cases (positive, negative, workflow)
under `evals/`; run them with `claude plugin eval` (see `COMPATIBILITY.md` for the
minimum version).

## Support

Open an issue in the `xSneshx/devdigest-marketplace` repository. Include the plugin name and
version (`claude plugin list`), the Claude Code version (`claude --version`) and the smallest
prompt that reproduces the problem. Do not paste tokens or private code into an issue.
Contribution and local-testing steps are in the repository's `CONTRIBUTING.md`.
