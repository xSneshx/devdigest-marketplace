import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { runGuard, bash, write, fixtureProject, writeFiles, cleanup } from '../lib/harness.mjs';

after(cleanup);
const SC = 'sdd-engineering:spec-creator';
const run = (input, project) => runGuard('sdd-engineering', input, { project });

test('writes: one Markdown spec directly under specs/ or <dir>/specs/ (AC-25)', () => {
  const project = fixtureProject('npm-project');
  for (const f of ['specs/2026-01-01-thing.md', 'server/specs/thing.md', 'specs/new.md']) {
    assert.equal(run(write(SC, f), project).code, 0, f);
  }
});

test('writes: everything else is refused, with the spec locations named (AC-25, AC-28)', () => {
  const project = fixtureProject('npm-project');
  for (const f of ['src/a.ts', 'docs/x.md', 'README.md', 'specs/README.md', 'specs/sub/deep.md', 'specs/a.txt',
    'a/b/specs/x.md', 'node_modules/specs/x.md', '.claude/specs/x.md', 'docs/plans/p.md', 'package.json']) {
    const r = run(write(SC, f), project);
    assert.equal(r.code, 2, f);
    assert.match(r.stderr, /not a spec file/, f);
  }
  const r = run(write(SC, '../outside.md'), project);
  assert.equal(r.code, 2);
});

test('writes: Write over an existing spec is refused; Edit revises a draft but not an approved one', () => {
  const project = fixtureProject('npm-project');
  writeFiles(project, {
    'specs/draft.md': '# T\n\nStatus: draft\n',
    'specs/done.md': '# T\n\n**Status:** approved\n',
    'specs/impl.md': '# T\n\nStatus: implemented\n',
  });
  const over = run(write(SC, 'specs/draft.md'), project);
  assert.equal(over.code, 2);
  assert.match(over.stderr, /already exists/);
  assert.equal(run(write(SC, 'specs/draft.md', undefined, 'Edit'), project).code, 0);
  assert.equal(run(write(SC, 'specs/draft.md', undefined, 'MultiEdit'), project).code, 0);
  for (const f of ['specs/done.md', 'specs/impl.md']) {
    const r = run(write(SC, f, undefined, 'Edit'), project);
    assert.equal(r.code, 2, f);
    assert.match(r.stderr, /approved or implemented/, f);
  }
});

test('writes: declared specDirs are authoritative and named as explicit input (AC-70)', () => {
  const project = fixtureProject('npm-project');
  writeFiles(project, { '.claude/project-inputs.json': JSON.stringify({ specDirs: ['requirements/', './docs/rfcs'] }) });
  assert.equal(run(write(SC, 'requirements/a.md'), project).code, 0);
  assert.equal(run(write(SC, 'docs/rfcs/b.md'), project).code, 0);
  for (const f of ['specs/a.md', 'requirements/sub/a.md', 'requirements/a.txt', 'docs/rfcs/README.md']) {
    const r = run(write(SC, f), project);
    assert.equal(r.code, 2, f);
    assert.match(r.stderr, /explicit input/, f);
  }
  assert.equal(run(write(SC, '.claude/project-inputs.json'), project).code, 2);
});

test('writes: a protected path wins even inside a spec dir', () => {
  const project = fixtureProject('npm-project');
  writeFiles(project, { '.claude/project-inputs.json': JSON.stringify({ protectedPaths: ['specs/frozen.md'] }) });
  assert.equal(run(write(SC, 'specs/frozen.md'), project).code, 2);
  assert.equal(run(write(SC, 'specs/open.md'), project).code, 0);
});

test('bash: reads and project checks only; refusal names the allowed set (AC-28)', () => {
  const project = fixtureProject('npm-project');
  for (const cmd of ['cat specs/a.md', 'ls specs', 'grep -rn AC src | wc -l', 'git log --oneline', 'npm test',
    'cd src && ls', 'date +%F']) {
    assert.equal(run(bash(SC, cmd), project).code, 0, cmd);
  }
  for (const cmd of ['rm specs/a.md', 'npm install', 'git commit -m x', 'echo x > specs/a.md', 'curl http://example.com',
    'cat <<EOF', 'sed -i s/a/b/ specs/a.md', 'cat $(ls)', 'cd .. && ls', 'npm run build']) {
    const r = run(bash(SC, cmd), project);
    assert.equal(r.code, 2, cmd);
    assert.match(r.stderr, /Allowed: plain reads/, cmd);
  }
  const r = run(bash(SC, 'rm x'), project);
  assert.match(r.stderr, /the check commands this project defines/);
  assert.match(r.stderr, /`npm test`/);
});

test('bash: explicit checkCommands replace discovery (AC-70)', () => {
  const project = fixtureProject('declared');
  assert.equal(run(bash(SC, 'make verify'), project).code, 0);
  const r = run(bash(SC, 'npm test'), project);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /explicit input/);
});
