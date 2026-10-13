#!/usr/bin/env node
// PreToolUse guard for the code-agents plugin. Registered at plugin level
// (hooks/hooks.json) because plugin agents ignore frontmatter `hooks`.
// GUARDED_AGENTS is the only place an agent identifier appears; keep it in step
// with GUARDED in run-guard.sh (a test asserts they match). Matching is exact.
// Exit status 3 means "Node.js is too old"; run-guard.sh treats it as a crash
// and fails closed for guarded agents. Modules load only after the version
// check, so an old runtime cannot trip over newer syntax first.
if (Number(process.versions.node.split('.')[0]) < 22) {
  process.stderr.write('code-agents-guard: Node.js >= 22 is required.\n');
  process.exit(3);
}

const { runGuard } = await import('./lib/guard-core.mjs');

const GUARDED_AGENTS = {
  'code-agents:implementer': 'implementer',
  'code-agents:test-writer': 'tests',
};

// Profile names come from GUARDED_AGENTS above, never from hook input.
const loadProfile = async (profile) => (await import(`./profiles/${profile}.mjs`))[profile];

await runGuard({ name: 'code-agents-guard', guarded: GUARDED_AGENTS, loadProfile });
