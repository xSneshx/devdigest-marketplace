# Security

Plugin component text (skills, agent prompts, hook and script source) is executable
influence over a consumer's session. It is treated as attack surface.

## Permissions and the guard model

- Each agent declares the tools it needs and no more.
- Enforcement differs by agent. **Hook-guarded** (mechanically enforced, see below):
  `code-agents:implementer`, `code-agents:test-writer`, `sdd-engineering:spec-creator`,
  `sdd-engineering:plan-verifier`. **Prompt-only** (restricted by tool list and prompt
  instructions, no hook): `research-tools:researcher`, the architecture reviewer and
  `sdd-engineering:implementation-planner`. A prompt-only agent that holds Bash
  (for example the researcher, whose read-only Bash use is a prompt rule) can be talked
  out of that rule by hostile input; nothing blocks the call. Do not treat prompt-only
  agents as sandboxed.
- Plugin agents cannot declare their own hooks in frontmatter, so guards are registered at
  plugin level in `hooks/hooks.json` and select the agent by the identifier the hook input
  carries (form `<plugin>:<agent>`).
- Guarded agents: `sdd-engineering:spec-creator` (specs only), `sdd-engineering:plan-verifier`
  (read-only), `code-agents:implementer` (no commit, push, or history rewrite; no lockfile or
  protected-path writes), `code-agents:test-writer` (test paths only).
- Read-only and specs-only profiles allow in Bash only a default-deny whitelist of read
  commands plus the consumer's check commands, and refuse the rest with a message naming
  the allowed set. In the read-only, specs-only and test-writer profiles, leading environment
  assignments are refused except a short documented allow-list in `hooks/lib/bash-parse.mjs`.
  The implementer profile runs package managers and does not apply that rule; it instead
  additionally refuses non-read commands with an undeterminable `cd`, subshell grouping,
  `sh`/`bash -c` or `eval`.
- The implementer's Bash check is best-effort: it is a text heuristic, and the package
  managers it must allow can run arbitrary code. Known gaps include wrappers such as `xargs`,
  `env` and `find -exec`, `node -e`, and brace expansions that contain `/`. The hard controls
  are the file-tool checks (Write, Edit, MultiEdit, NotebookEdit), which resolve real paths.
- Guards run through a POSIX `sh` (macOS, Linux, WSL). Native Windows without `sh` is not
  supported for guards (see each plugin's `COMPATIBILITY.md`).
- Guards parse commands and paths, they never evaluate them. Paths are resolved against the
  project directory before comparison.
- Auto-approval lists (`allowedTools`) are not a sandbox and are never relied on as one.

## Fail policy

If a guard cannot evaluate a call (interpreter missing, crash, timeout, malformed hook input):

- the call carries an identifier matching a guarded agent: it is refused;
- the call carries no such identifier: it is allowed.

Guards keep an internal time budget and deny guarded agents when it runs out. Node.js 22 or
newer is required.

## Secrets policy

- No secret, token, token-bearing URL or absolute filesystem path is committed. CI scans
  every committed file for secret patterns, absolute paths and project-specific tokens.
- Release evidence redacts tokens and replaces the home directory with `~`.
- Components never log a secret or a full prompt.

## Repository visibility and credentials

The repository is public. Adding the marketplace over HTTPS needs no git credentials, and no
document, script or workflow of this repository asks for one. A private fork needs a git
credential that works without a prompt; that case is covered by the Troubleshooting section of
the root `README.md`.

The `stable` branch is protected on GitHub: no force push, no deletion, and changes land only
through a pull request with a green `validate` run. A promotion is a new commit, never a
rewrite (see "Release channels" in `docs/RELEASES.md`).

The evidence redaction rules above apply to channel and cost evidence as well: home paths
shortened to `~`, no tokens, no raw CLI output committed.

## Hook and script review

Every hook and supporting script change needs review by a CODEOWNER (see `CODEOWNERS`:
`plugins/*/hooks/`, the workflow-retro scripts, `scripts/`, `.github/`). Each
guard-shipping plugin carries its own copy of the shared helper module; CI enforces that
the copies are byte-identical, and a guard imports nothing from outside its plugin root.

## Untrusted inputs

- Hook input JSON is untrusted input to the guards.
- Design sources, pull request text, diffs and tool output read by agents are data, never
  instructions.
- Manifest text rendered anywhere is untrusted and escaped.

## Advisory-only guarantees

None while the live agent-identifier check holds: the hook input of a plugin agent carries
the identifier `<plugin>:<agent>`, so every guard is enforced. If that check fails, the
release is blocked until the maintainer records an accepted fallback decision, and this
section then lists which guarantees are advisory only.
