import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runGuard, bash, write, hookInput, fixtureProject, pluginDir, cleanup } from '../lib/harness.mjs';

after(cleanup);
const run = (input, project, opts = {}) => runGuard('code-agents', input, { project, ...opts });

test('a main-session call (no agent identifier) is allowed untouched (AC-29)', () => {
  const project = fixtureProject('npm-project');
  for (const input of [
    bash(undefined, 'git commit -m x'),
    write(undefined, 'package-lock.json'),
    write(undefined, '../outside.txt'),
    bash(undefined, 'rm -rf node_modules'),
  ]) {
    const r = run(input, project);
    assert.equal(r.code, 0);
    assert.equal(r.stderr, '');
    assert.equal(r.stdout, '');
  }
});

test('an identifier that matches no guarded agent is allowed (AC-29, AC-30)', () => {
  const project = fixtureProject('npm-project');
  for (const agent of ['xcode-agents:implementer-2', 'code-agents:implementer-2', 'xcode-agents:implementer',
    'code-agents:implementer ', 'Code-Agents:Implementer', 'implementer', 'other-plugin:implementer',
    'code-agents:implementer:extra', 'constructor', '__proto__', '', 42, null, ['code-agents:implementer']]) {
    const r = run(bash(agent, 'git commit -m x'), project);
    assert.equal(r.code, 0, `agent_type=${JSON.stringify(agent)}`);
  }
});

test('the exact identifiers are guarded', () => {
  const project = fixtureProject('npm-project');
  assert.equal(run(bash('code-agents:implementer', 'git commit -m x'), project).code, 2);
  assert.equal(run(write('code-agents:test-writer', 'src/a.ts'), project).code, 2);
});

test('guard.mjs and run-guard.sh name the same guarded agents; matching is exact equality', () => {
  const dir = join(pluginDir('code-agents'), 'hooks');
  const sh = readFileSync(join(dir, 'run-guard.sh'), 'utf8').match(/^GUARDED='([^']*)'/m)[1].split(/\s+/).sort();
  const js = readFileSync(join(dir, 'guard.mjs'), 'utf8');
  const ids = [...js.matchAll(/'([a-z-]+:[a-z-]+)':\s*'/g)].map((m) => m[1]).sort();
  assert.deepEqual(sh, ids);
  assert.deepEqual(ids, ['code-agents:implementer', 'code-agents:test-writer']);
  const core = readFileSync(join(dir, 'lib', 'guard-core.mjs'), 'utf8');
  assert.doesNotMatch(core + js, /new RegExp\([^)]*agent|\.includes\(agent|startsWith\(agent|match\(agent/);
});

test('tools outside the matcher set are allowed even for a guarded agent', () => {
  const project = fixtureProject('npm-project');
  assert.equal(run(hookInput({ agent: 'code-agents:implementer', tool: 'Read', tool_input: { file_path: 'x' } }), project).code, 0);
});
