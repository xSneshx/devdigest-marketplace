import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { runGuard, bash, write, fixtureProject, writeFiles, cleanup } from '../lib/harness.mjs';

after(cleanup);
const IMPL = 'code-agents:implementer';
const TW = 'code-agents:test-writer';
const run = (input, project) => runGuard('code-agents', input, { project });

const protectedProject = () => {
  const project = fixtureProject('npm-project');
  writeFiles(project, {
    '.claude/project-inputs.json': JSON.stringify({ protectedPaths: ['src/generated/'] }),
    'src/generated/version.ts': 'export {}',
    'src/other.ts': 'export {}',
  });
  return project;
};

test('implementer: cd across && / ; resolves paths against the effective cwd', () => {
  const project = protectedProject();
  for (const cmd of [
    'cd src && sed -i s/a/b/ generated/version.ts',
    'cd src; rm generated/version.ts',
    'cd src && cd generated && rm version.ts',
    'cd src/other-dir && rm ../generated/version.ts',
    'cd src && echo x > generated/new.ts',
  ]) {
    const r = run(bash(IMPL, cmd), project);
    assert.equal(r.code, 2, cmd);
    assert.match(r.stderr, /protected path/, cmd);
  }
  assert.equal(run(bash(IMPL, 'cd src && sed -i s/a/b/ other.ts'), project).code, 0);
  assert.equal(run(bash(IMPL, 'cd src && cat generated/version.ts'), project).code, 0);
});

test('implementer: lockfiles are matched case-insensitively and via cwd or symlink', () => {
  const project = protectedProject();
  mkdirSync(join(project, 'sub'), { recursive: true });
  symlinkSync(join(project, 'package-lock.json'), join(project, 'sub', 'innocent.txt'));
  writeFiles(project, { 'package-lock.json': '{}' });
  for (const cmd of ['rm Package-Lock.JSON', 'cd sub && sed -i s/a/b/ ../package-lock.json', 'rm sub/innocent.txt']) {
    assert.equal(run(bash(IMPL, cmd), project).code, 2, cmd);
  }
  assert.equal(run(write(IMPL, 'Package-Lock.json'), project).code, 2);
  assert.equal(run(write(IMPL, 'sub/innocent.txt'), project).code, 2);
});

test('file tools: protectedPaths match case-insensitively and through a symlink', () => {
  const project = protectedProject();
  symlinkSync(join(project, 'src', 'generated'), join(project, 'alias'));
  for (const f of ['SRC/Generated/version.ts', 'src/GENERATED/new.ts', 'alias/version.ts', 'alias/new.ts']) {
    const r = run(write(IMPL, f), project);
    assert.equal(r.code, 2, f);
    assert.match(r.stderr, /protected path/, f);
  }
  assert.equal(run(write(IMPL, 'src/other.ts'), project).code, 0);
  assert.equal(run(write(IMPL, '.CLAUDE/Project-Inputs.json'), project).code, 2);
  assert.equal(run(write(IMPL, '.GIT/config'), project).code, 2);
});

test('every guarded profile: a non-read Bash command naming the inputs file or .git is refused', () => {
  const project = protectedProject();
  for (const agent of [IMPL, TW]) {
    for (const cmd of [
      "echo '{}' > .claude/project-inputs.json",
      'rm .claude/project-inputs.json',
      'sed -i s/a/b/ .claude/PROJECT-inputs.json',
      'cd .claude && echo {} > project-inputs.json',
      'mv .claude/project-inputs.json /tmp/x',
      'rm -rf .git',
      'cp x .git/config',
      'cd src && rm ../.git/HEAD',
    ]) {
      const r = run(bash(agent, cmd), project);
      assert.equal(r.code, 2, `${agent}: ${cmd}`);
    }
  }
  assert.equal(run(bash(IMPL, 'cat .claude/project-inputs.json'), project).code, 0);
  assert.equal(run(bash(IMPL, 'ls .git'), project).code, 0);
  const named = run(bash(IMPL, "echo '{}' > .claude/project-inputs.json"), project);
  assert.match(named.stderr, /guard configuration or git internals/);
});

test('implementer: an undeterminable cd makes later relative paths unknowable', () => {
  const project = protectedProject();
  for (const cmd of [
    'cd "$X" && sed -i x generated/v.ts',
    'cd $X && rm generated/v.ts',
    'cd ~ && rm generated/v.ts',
    'cd - && rm generated/v.ts',
    'cd src && cd "$X" && rm Makefile',
  ]) {
    const r = run(bash(IMPL, cmd), project);
    assert.equal(r.code, 2, cmd);
    assert.match(r.stderr, /working directory could not be determined/, cmd);
  }
  assert.equal(run(bash(IMPL, 'cd $(pwd)/src && rm generated/v.ts'), project).code, 2);
  assert.equal(run(bash(IMPL, 'cd "$X" && npm test'), project).code, 0);
  assert.equal(run(bash(IMPL, 'cd "$X" && cat generated/v.ts'), project).code, 0);
});

test('implementer: subshells, nested shells and eval are refused', () => {
  const project = protectedProject();
  for (const cmd of [
    '(cd src && sed -i x generated/v.ts)',
    'bash -c "cd src && sed -i x generated/v.ts"',
    'sh -c "cd src && rm generated/v.ts"',
    'zsh -c "cd src && rm generated/v.ts"',
    '/bin/bash -lc "rm src/generated/v.ts"',
    'eval "cd src && rm generated/v.ts"',
    'FOO=1 bash -c "rm src/generated/v.ts"',
  ]) {
    const r = run(bash(IMPL, cmd), project);
    assert.equal(r.code, 2, cmd);
  }
  assert.equal(run(bash(IMPL, 'npm test'), project).code, 0);
  assert.equal(run(bash(IMPL, 'cd src && npm run build'), project).code, 0);
});

test('every guarded profile: .claude itself or a glob over the inputs file counts as naming it', () => {
  const project = protectedProject();
  for (const agent of [IMPL, TW]) {
    for (const cmd of [
      'rm -rf .claude', 'rm -rf .claude/', 'mv .claude x', 'rm .claude/project-in*', 'rm .cl*/project-inputs.json',
      'rm -rf .c[l]aude', 'rm -rf .{claude,x}', 'rm -rf .*', 'cd .claude/.. && rm -rf .claude', 'rm .claude/project-inputs.jso?',
    ]) {
      assert.equal(run(bash(agent, cmd), project).code, 2, `${agent}: ${cmd}`);
    }
  }
  assert.equal(run(bash(IMPL, 'rm src/*.ts'), project).code, 0);
  assert.equal(run(bash(IMPL, 'rm -rf *'), project).code, 0);
  assert.equal(run(bash(IMPL, 'git add .claude'), project).code, 0);
  assert.equal(run(bash(IMPL, 'ls .claude'), project).code, 0);
  assert.equal(run(bash(IMPL, `rm ${['.claude', 'skills', 'x.md'].join('/')}`), project).code, 0);
});
