import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, symlinkSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runGuard, bash, write, hookInput, fixtureProject, pluginDir, tempDir, cleanup } from '../lib/harness.mjs';

after(cleanup);
const GUARDED = ['sdd-engineering:spec-creator', 'sdd-engineering:plan-verifier'];
const run = (input, project, opts = {}) => runGuard('sdd-engineering', input, { project, ...opts });

function pathWithoutNode() {
  const bin = tempDir('nonode-');
  for (const tool of ['cat', 'grep', 'dirname']) {
    for (const base of ['/bin', '/usr/bin']) {
      if (existsSync(join(base, tool))) { symlinkSync(join(base, tool), join(bin, tool)); break; }
    }
  }
  return bin;
}

test('a main-session call (no agent identifier) is allowed untouched (AC-29)', () => {
  const project = fixtureProject('npm-project');
  for (const input of [bash(undefined, 'git commit -m x'), write(undefined, 'src/a.ts'),
    write(undefined, '../outside.txt'), bash(undefined, 'rm -rf node_modules')]) {
    const r = run(input, project);
    assert.equal(r.code, 0);
    assert.equal(r.stderr, '');
    assert.equal(r.stdout, '');
  }
});

test('an identifier that matches no guarded agent is allowed, including other plugins (AC-29, AC-30)', () => {
  const project = fixtureProject('npm-project');
  for (const agent of ['xsdd-engineering:spec-creator', 'sdd-engineering:spec-creator-2', 'sdd-engineering:spec-creator ',
    'Sdd-Engineering:Plan-Verifier', 'spec-creator', 'plan-verifier', 'other-plugin:spec-creator',
    'sdd-engineering:plan-verifier:extra', 'code-agents:implementer', 'code-agents:test-writer', 'research-tools:researcher',
    'constructor', '__proto__', '', 42, null, ['sdd-engineering:spec-creator']]) {
    const r = run(write(agent, 'src/a.ts'), project);
    assert.equal(r.code, 0, `agent_type=${JSON.stringify(agent)}`);
  }
});

test('the exact identifiers are guarded', () => {
  const project = fixtureProject('npm-project');
  assert.equal(run(write(GUARDED[0], 'src/a.ts'), project).code, 2);
  assert.equal(run(write(GUARDED[1], 'specs/a.md'), project).code, 2);
});

test('guard.mjs and run-guard.sh name the same guarded agents; matching is exact equality', () => {
  const dir = join(pluginDir('sdd-engineering'), 'hooks');
  const sh = readFileSync(join(dir, 'run-guard.sh'), 'utf8').match(/^GUARDED='([^']*)'/m)[1].split(/\s+/).sort();
  const js = readFileSync(join(dir, 'guard.mjs'), 'utf8');
  const ids = [...js.matchAll(/'([a-z-]+:[a-z-]+)':\s*'/g)].map((m) => m[1]).sort();
  assert.deepEqual(sh, ids);
  assert.deepEqual(ids, [...GUARDED].sort());
  const core = readFileSync(join(dir, 'lib', 'guard-core.mjs'), 'utf8');
  assert.doesNotMatch(core + js, /new RegExp\([^)]*agent|\.includes\(agent|startsWith\(agent|match\(agent/);
});

test('hooks.json registers one quoted PreToolUse command with a 10 s timeout', () => {
  const cfg = JSON.parse(readFileSync(join(pluginDir('sdd-engineering'), 'hooks', 'hooks.json'), 'utf8'));
  const [entry, ...rest] = cfg.hooks.PreToolUse;
  assert.equal(rest.length, 0);
  assert.equal(entry.matcher, 'Write|Edit|MultiEdit|NotebookEdit|Bash');
  assert.equal(entry.hooks[0].command, 'sh "${CLAUDE_PLUGIN_ROOT}/hooks/run-guard.sh"');
  assert.equal(entry.hooks[0].timeout, 10);
});

test('tools outside the matcher set are allowed even for a guarded agent', () => {
  const project = fixtureProject('npm-project');
  assert.equal(run(hookInput({ agent: GUARDED[0], tool: 'Read', tool_input: { file_path: 'x' } }), project).code, 0);
});

test('malformed input: refused for a guarded identifier, allowed otherwise (AC-58)', () => {
  const project = fixtureProject('npm-project');
  const guarded = `{"agent_type":"${GUARDED[1]}","tool_name":"Bash","tool_input":{"command":"ls"`;
  const unguarded = '{"agent_type":"xsdd-engineering:plan-verifier","tool_name":"Bash",';
  for (const via of ['node', 'sh']) {
    const g = run(guarded, project, { via });
    assert.equal(g.code, 2, via);
    assert.match(g.stderr, /could not (verify|run)/);
    assert.equal(run(unguarded, project, { via }).code, 0, via);
    assert.equal(run('not json at all', project, { via }).code, 0, via);
    assert.equal(run('', project, { via }).code, 0, via);
  }
});

test('forced crash inside the guard: refused for guarded agents, allowed for others (AC-58)', () => {
  const project = fixtureProject('npm-project');
  const env = { PLUGIN_GUARD_TEST_CRASH: '1' };
  for (const via of ['node', 'sh']) {
    for (const agent of GUARDED) {
      const r = run(bash(agent, 'ls'), project, { via, env });
      assert.equal(r.code, 2, `${via} ${agent}`);
      assert.match(r.stderr, /forced crash|could not/);
    }
    assert.equal(run(bash(undefined, 'ls'), project, { via, env }).code, 0, via);
    assert.equal(run(bash('xsdd-engineering:plan-verifier', 'ls'), project, { via, env }).code, 0, via);
  }
});

test('node missing from PATH: run-guard.sh refuses guarded agents and allows the rest (AC-58)', () => {
  const project = fixtureProject('npm-project');
  const path = pathWithoutNode();
  for (const agent of GUARDED) {
    const r = run(bash(agent, 'ls'), project, { via: 'sh', path });
    assert.equal(r.code, 2, agent);
    assert.match(r.stderr, /node is not installed/);
  }
  assert.equal(run(bash(undefined, 'git commit'), project, { via: 'sh', path }).code, 0);
});

test('run-guard.sh passes the guard verdict through (allow and refuse)', () => {
  const project = fixtureProject('npm-project');
  assert.equal(run(bash(GUARDED[1], 'git status'), project, { via: 'sh' }).code, 0);
  const r = run(write(GUARDED[1], 'specs/a.md'), project, { via: 'sh' });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /read-only/);
});

test('a malformed project-inputs.json refuses a guarded agent instead of dropping protection', () => {
  const project = fixtureProject('npm-project');
  mkdirSync(join(project, '.claude'));
  writeFileSync(join(project, '.claude', 'project-inputs.json'), '{ not json');
  const r = run(write(GUARDED[0], 'specs/new.md'), project);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /project-inputs\.json is not valid JSON/);
  assert.equal(run(write(undefined, 'specs/new.md'), project).code, 0);
});

test('a symlink that escapes the project is refused', () => {
  const project = fixtureProject('npm-project');
  symlinkSync(tempDir('outside-'), join(project, 'specs'));
  const r = run(write(GUARDED[0], 'specs/pwned.md'), project);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /outside the project/);
});
