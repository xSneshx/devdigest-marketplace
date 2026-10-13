import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { symlinkSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { runGuard, bash, write, fixtureProject, tempDir, cleanup } from '../lib/harness.mjs';

after(cleanup);
const GUARDED = 'code-agents:implementer';
const run = (input, project, opts = {}) => runGuard('code-agents', input, { project, ...opts });

// A PATH that has the few tools run-guard.sh needs, but no node.
function pathWithoutNode() {
  const bin = tempDir('nonode-');
  for (const tool of ['cat', 'grep', 'dirname']) {
    for (const base of ['/bin', '/usr/bin']) {
      if (existsSync(join(base, tool))) { symlinkSync(join(base, tool), join(bin, tool)); break; }
    }
  }
  return bin;
}

test('malformed input: refused for a guarded identifier, allowed otherwise (AC-58)', () => {
  const project = fixtureProject('npm-project');
  const guarded = `{"agent_type":"${GUARDED}","tool_name":"Bash","tool_input":{"command":"git commit"`;
  const unguarded = '{"agent_type":"xcode-agents:implementer-2","tool_name":"Bash",';
  for (const via of ['node', 'sh']) {
    const g = run(guarded, project, { via });
    assert.equal(g.code, 2, via);
    assert.match(g.stderr, /could not (verify|run)/);
    assert.equal(run(unguarded, project, { via }).code, 0, via);
    assert.equal(run('not json at all', project, { via }).code, 0, via);
    assert.equal(run('', project, { via }).code, 0, via);
    assert.equal(run('[1,2]', project, { via }).code, 0, via);
  }
});

test('forced crash inside the guard: refused for a guarded agent, allowed for others (AC-58)', () => {
  const project = fixtureProject('npm-project');
  const env = { PLUGIN_GUARD_TEST_CRASH: '1' };
  for (const via of ['node', 'sh']) {
    for (const agent of [GUARDED, 'code-agents:test-writer']) {
      const r = run(bash(agent, 'ls'), project, { via, env });
      assert.equal(r.code, 2, `${via} ${agent}`);
      assert.match(r.stderr, /forced crash|could not/);
    }
    assert.equal(run(bash(undefined, 'ls'), project, { via, env }).code, 0, via);
    assert.equal(run(bash('xcode-agents:implementer-2', 'ls'), project, { via, env }).code, 0, via);
  }
});

test('node missing from PATH: run-guard.sh refuses guarded agents and allows the rest (AC-58)', () => {
  const project = fixtureProject('npm-project');
  const path = pathWithoutNode();
  for (const agent of [GUARDED, 'code-agents:test-writer']) {
    const r = run(bash(agent, 'ls'), project, { via: 'sh', path });
    assert.equal(r.code, 2, agent);
    assert.match(r.stderr, /node is not installed/);
  }
  assert.equal(run(bash(undefined, 'git commit'), project, { via: 'sh', path }).code, 0);
  assert.equal(run(bash('xcode-agents:implementer-2', 'ls'), project, { via: 'sh', path }).code, 0);
});

test('run-guard.sh passes the guard verdict through (allow and refuse)', () => {
  const project = fixtureProject('npm-project');
  assert.equal(run(bash(GUARDED, 'git status'), project, { via: 'sh' }).code, 0);
  const r = run(bash(GUARDED, 'git push'), project, { via: 'sh' });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /not allowed for the implementer/);
});

test('a malformed project-inputs.json refuses a guarded agent instead of dropping protection', () => {
  const project = fixtureProject('npm-project');
  mkdirSync(join(project, '.claude'));
  writeFileSync(join(project, '.claude', 'project-inputs.json'), '{ not json');
  const r = run(write(GUARDED, 'src/new.ts'), project);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /project-inputs\.json is not valid JSON/);
  assert.equal(run(write(undefined, 'src/new.ts'), project).code, 0);
});

test('a symlink that escapes the project is refused', () => {
  const project = fixtureProject('npm-project');
  const outside = tempDir('outside-');
  symlinkSync(outside, join(project, 'link'));
  const r = run(write(GUARDED, 'link/pwned.txt'), project);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /outside the project/);
});
