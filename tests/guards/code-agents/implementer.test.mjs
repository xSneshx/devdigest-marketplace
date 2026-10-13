import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { runGuard, bash, write, fixtureProject, cleanup } from '../lib/harness.mjs';

after(cleanup);
const IMPL = 'code-agents:implementer';
const run = (input, project) => runGuard('code-agents', input, { project });

test('every git family that records, publishes, rewrites or discards work is refused (AC-27)', () => {
  const project = fixtureProject('npm-project');
  const refused = [
    'git commit -m x', 'git push origin main', 'git reset --hard HEAD~1', 'git checkout -- src/a.ts',
    'git checkout main', 'git restore src/a.ts', 'git stash', 'git stash pop', 'git rebase main',
    'git clean -fd', 'git merge feature', 'git cherry-pick abc', 'git revert abc', 'git tag v1',
    'git branch -D old', 'git worktree remove ../w', 'git update-ref -d refs/x',
    'git -C other commit -m x', 'git -c user.name=a commit -m x', 'git add . && git commit -m x',
    'bash -c "git push"', 'FOO=1 git reset --soft HEAD^',
  ];
  for (const cmd of refused) {
    const r = run(bash(IMPL, cmd), project);
    assert.equal(r.code, 2, `should refuse: ${cmd}`);
    assert.match(r.stderr, /not allowed for the implementer/, cmd);
  }
});

test('gh PR writes are refused, reads and ordinary git are allowed', () => {
  const project = fixtureProject('npm-project');
  for (const cmd of ['gh pr create --fill', 'gh pr merge 3', 'gh release create v1', 'gh repo delete x']) {
    assert.equal(run(bash(IMPL, cmd), project).code, 2, cmd);
  }
  for (const cmd of ['gh pr view 3', 'git status', 'git diff --stat', 'git add -A', 'git log -3', 'npm install', 'npm test']) {
    assert.equal(run(bash(IMPL, cmd), project).code, 0, cmd);
  }
});

test('lockfiles: writes refused, hand edits by Bash refused, plain reads allowed', () => {
  const project = fixtureProject('npm-project');
  for (const f of ['package-lock.json', 'pnpm-lock.yaml', 'sub/yarn.lock', 'Cargo.lock']) {
    for (const tool of ['Write', 'Edit', 'MultiEdit']) {
      const r = run(write(IMPL, f, undefined, tool), project);
      assert.equal(r.code, 2, `${tool} ${f}`);
      assert.match(r.stderr, /lockfile/);
    }
  }
  assert.equal(run(bash(IMPL, 'rm package-lock.json'), project).code, 2);
  assert.equal(run(bash(IMPL, "sed -i 's/a/b/' package-lock.json"), project).code, 2);
  assert.equal(run(bash(IMPL, 'echo {} > package-lock.json'), project).code, 2);
  assert.equal(run(bash(IMPL, 'cat package-lock.json'), project).code, 0);
  assert.equal(run(bash(IMPL, 'grep -n name package-lock.json'), project).code, 0);
  assert.equal(run(write(IMPL, 'src/new.ts'), project).code, 0);
});

test('a declared protected path is refused and named as an explicit input (AC-70)', () => {
  const project = fixtureProject('declared');
  for (const f of ['infra/secrets/keys.env', 'infra/secrets/new/x', 'config/app.prod.json']) {
    const r = run(write(IMPL, f), project);
    assert.equal(r.code, 2, f);
    assert.match(r.stderr, /explicit input/);
    assert.match(r.stderr, /project-inputs\.json/);
  }
  const b = run(bash(IMPL, 'rm infra/secrets/keys.env'), project);
  assert.equal(b.code, 2);
  assert.match(b.stderr, /explicit input/);
  assert.equal(run(bash(IMPL, 'cat infra/secrets/keys.env'), project).code, 0);
  assert.equal(run(write(IMPL, 'config/app.dev.json'), project).code, 0);
  assert.equal(run(write(IMPL, 'src/d.ts'), project).code, 0);
});

test('the guard configuration and git internals are never writable', () => {
  const project = fixtureProject('declared');
  const r = run(write(IMPL, '.claude/project-inputs.json'), project);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /guard configuration/);
  assert.equal(run(write(IMPL, '.git/config'), project).code, 2);
});

test('a path outside the project is refused', () => {
  const project = fixtureProject('npm-project');
  const r = run(write(IMPL, '../elsewhere.txt'), project);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /outside the project/);
});

test('notebook and missing-path calls from a guarded agent are refused', () => {
  const project = fixtureProject('npm-project');
  assert.equal(run({ agent_type: IMPL, tool_name: 'Write', tool_input: {} }, project).code, 2);
  assert.equal(run({ agent_type: IMPL, tool_name: 'NotebookEdit', tool_input: { notebook_path: 'x.ipynb' } }, project).code, 0);
});
