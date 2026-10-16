import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { runGuard, bash, write, fixtureProject, cleanup } from '../lib/harness.mjs';

after(cleanup);
const PV = 'sdd-engineering:plan-verifier';
const run = (input, project) => runGuard('sdd-engineering', input, { project });

test('every file write is refused, including specs and plans (AC-26)', () => {
  const project = fixtureProject('npm-project');
  for (const tool of ['Write', 'Edit', 'MultiEdit', 'NotebookEdit']) {
    for (const f of ['src/a.ts', 'specs/x.md', 'docs/plans/p.md', 'verdict.md', 'new/dir/file.txt']) {
      const r = run(write(PV, f, undefined, tool), project);
      assert.equal(r.code, 2, `${tool} ${f}`);
      assert.match(r.stderr, /read-only/, `${tool} ${f}`);
    }
  }
});

test('bash: reads and project checks pass; writes and installs are refused (AC-28)', () => {
  const project = fixtureProject('npm-project');
  for (const cmd of ['cat src/a.ts', 'git diff --stat', 'ls', 'npm test', 'npm run typecheck', 'cd src && ls']) {
    assert.equal(run(bash(PV, cmd), project).code, 0, cmd);
  }
  for (const cmd of ['echo x > a', 'rm -rf src', 'git commit -m x', 'npm install', 'node -e 1', 'npm run lint -- --fix',
    'find . -delete', 'cat $(ls)']) {
    const r = run(bash(PV, cmd), project);
    assert.equal(r.code, 2, cmd);
    assert.match(r.stderr, /Allowed: plain reads/, cmd);
  }
});

test('a project without a typecheck script gets no typecheck command (AC-69)', () => {
  const project = fixtureProject('no-typecheck');
  assert.equal(run(bash(PV, 'npm test'), project).code, 0);
  assert.equal(run(bash(PV, 'npm run typecheck'), project).code, 2);
});
