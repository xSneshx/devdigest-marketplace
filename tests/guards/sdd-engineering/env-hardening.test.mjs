import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { runGuard, bash, write, fixtureProject, writeFiles, cleanup } from '../lib/harness.mjs';

after(cleanup);
const AGENTS = ['sdd-engineering:plan-verifier', 'sdd-engineering:spec-creator'];
const run = (input, project) => runGuard('sdd-engineering', input, { project });

test('read-only/specs profiles refuse leading env assignments except a harmless allow-list', () => {
  const project = fixtureProject('npm-project');
  for (const agent of AGENTS) {
    for (const cmd of [
      'NODE_OPTIONS=--import=./evil.mjs npm test',
      'GIT_EXTERNAL_DIFF=x git diff',
      'LD_PRELOAD=/tmp/x.so ls',
      'PAGER=sh git log',
      'CI=1 NODE_OPTIONS=--require=x npm test',
    ]) {
      const r = run(bash(agent, cmd), project);
      assert.equal(r.code, 2, `${agent}: ${cmd}`);
      assert.match(r.stderr, /environment assignment/, cmd);
    }
    for (const cmd of ['CI=1 npm test', 'NO_COLOR=1 FORCE_COLOR=0 git diff', 'TZ=UTC date +%F', 'LC_ALL=C LANG=C sort a']) {
      assert.equal(run(bash(agent, cmd), project).code, 0, `${agent}: ${cmd}`);
    }
  }
});

test('sdd guards: inputs file / .git writes are refused case-insensitively; protectedPaths ignore case', () => {
  const project = fixtureProject('npm-project');
  writeFiles(project, { '.claude/project-inputs.json': JSON.stringify({ protectedPaths: ['specs/frozen.md'] }) });
  const sc = 'sdd-engineering:spec-creator';
  assert.equal(run(write(sc, '.CLAUDE/project-inputs.json'), project).code, 2);
  assert.equal(run(write(sc, 'specs/FROZEN.md'), project).code, 2);
  assert.equal(run(write(sc, 'specs/ok.md'), project).code, 0);
  assert.equal(run(bash(sc, "echo '{}' > .claude/project-inputs.json"), project).code, 2);
});
