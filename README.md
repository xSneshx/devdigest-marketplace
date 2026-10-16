# devdigest-marketplace

A public Claude Code plugin marketplace of project-agnostic, spec-driven engineering
plugins. Five versioned plugins, an object-form dependency graph, plugin-level guard hooks
and tagged releases.

## Catalog

| Plugin | What it ships | Depends on |
|---|---|---|
| `engineering-paved-path` | Paved-path engineering skills: React, Next.js, Fastify, layering, TypeScript, Zod, security, diagrams | none |
| `research-tools` | Read-only researcher agent | none |
| `architecture-review` | Architecture reviewer agent | `engineering-paved-path` |
| `code-agents` | Implementer and test-writer agents with guard hooks; usable without the spec workflow | `engineering-paved-path` |
| `sdd-engineering` | Spec, plan, run-plan, verify and retro agents, skills and commands | all four plugins above |

The catalog file is `.claude-plugin/marketplace.json`; each plugin lives in `plugins/<name>/`.
The plugin manifest is the single source of a plugin's version.

## Install

Add the marketplace once, then install what you need. Dependencies are installed and
enabled automatically.

```sh
claude plugin marketplace add xSneshx/devdigest-marketplace
claude plugin install sdd-engineering@devdigest-marketplace
```

Install a single plugin the same way, for example
`claude plugin install research-tools@devdigest-marketplace`. Start a new session after
installing or updating so hooks, agents and skills are loaded.

The repository is public: adding it over HTTPS needs no git credentials.

### Release channels

| Channel | Ref | Catalog name | Add command |
|---|---|---|---|
| latest | `main` | `devdigest-marketplace` | `claude plugin marketplace add xSneshx/devdigest-marketplace` |
| stable | `stable` | `devdigest-marketplace-stable` | `claude plugin marketplace add xSneshx/devdigest-marketplace#stable` |

Both channels serve the same plugin names, so a project enables plugins from one channel
only. The switch procedure, the promotion rule and the rollback rule are in
[docs/RELEASES.md](docs/RELEASES.md#release-channels).

## Troubleshooting

**Adding the marketplace asks for a git username or password.** This applies only to a private
fork of this repository; the public repository never asks. For a private fork, give git a
credential that works without a prompt: run `gh auth setup-git` after `gh auth login`, or use a
prompt-free SSH key and add the fork by its SSH URL. Never put a token in a URL or in a file
of this repository.

## Dependency graph

```mermaid
flowchart TD
  sdd[sdd-engineering] --> pp[engineering-paved-path]
  sdd --> rt[research-tools]
  sdd --> ar[architecture-review]
  sdd --> ca[code-agents]
  ar --> pp
  ca --> pp
```

Each edge is a manifest `dependencies` entry in object form with a version range. The
install-time dependency and the run-time `skills:` injection are two separate mechanisms;
see [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md).

## Documentation

- [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md): plugin structure, manifest fields, dependency rules, consumer inputs
- [docs/SECURITY.md](docs/SECURITY.md): permissions, guard model, secrets, hook and script review
- [docs/RELEASES.md](docs/RELEASES.md): SemVer, tags, release channels, update, rollback
- [CONTRIBUTING.md](CONTRIBUTING.md): how to change a plugin and test it locally
