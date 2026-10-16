#!/usr/bin/env node
// Guard latency benchmark: 50 timed invocations (after 3 untimed warm-ups) of a
// plugin's run-guard.sh with a guarded-agent Bash call, the slowest path (node is
// started and the project is mapped). Prints p95; exits 1 above --max-p95-ms.
//   node tests/guards/bench.mjs --plugin code-agents --max-p95-ms 150
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt;
};
const plugin = opt('--plugin', 'code-agents');
const max = Number(opt('--max-p95-ms', '150'));
const RUNS = 50;
const AGENTS = { 'code-agents': 'code-agents:test-writer', 'sdd-engineering': 'sdd-engineering:plan-verifier' };
const agent = AGENTS[plugin];
if (!agent || !Number.isFinite(max)) {
  console.error('usage: bench.mjs --plugin code-agents|sdd-engineering --max-p95-ms <n>');
  process.exit(2);
}

const project = realpathSync(mkdtempSync(join(tmpdir(), 'guard-bench-')));
writeFileSync(join(project, 'package.json'), JSON.stringify({ scripts: { test: 'node --test' } }));
const script = join(here, '..', '..', 'plugins', plugin, 'hooks', 'run-guard.sh');
const input = JSON.stringify({ agent_type: agent, tool_name: 'Bash', tool_input: { command: 'npm test' } });
const env = { ...process.env, CLAUDE_PROJECT_DIR: project };

const times = [];
try {
  for (let i = 0; i < 3; i++) spawnSync('/bin/sh', [script], { input, env, encoding: 'utf8' });
  for (let i = 0; i < RUNS; i++) {
    const t0 = process.hrtime.bigint();
    const r = spawnSync('/bin/sh', [script], { input, env, encoding: 'utf8' });
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
    if (r.status !== 0) {
      console.error(`bench: guard exited ${r.status} on a command it should allow: ${r.stderr}`);
      process.exit(1);
    }
  }
} finally {
  rmSync(project, { recursive: true, force: true });
}
times.sort((a, b) => a - b);
const p95 = times[Math.ceil(RUNS * 0.95) - 1];
console.log(`guard bench ${plugin}: runs=${RUNS} p50=${times[Math.floor(RUNS / 2)].toFixed(1)}ms p95=${p95.toFixed(1)}ms max=${times[RUNS - 1].toFixed(1)}ms limit=${max}ms`);
process.exit(p95 > max ? 1 : 0);
