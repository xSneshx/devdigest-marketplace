import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { runGuard, bash, write, fixtureProject, cleanup } from '../lib/harness.mjs';

after(cleanup);
const TW = 'code-agents:test-writer';
const run = (input, project) => runGuard('code-agents', input, { project });

test('writes: test file and helper allowed; production code refused (AC-68)', () => {
  const project = fixtureProject('pnpm-mono');
  for (const f of ['server/lib/x.test.ts', 'web/src/w.spec.tsx', 'server/test/helper.ts',
    'server/test/fixtures/data.json', 'tests/new/it.js', 'pkg/__tests__/a.ts', 'src/thing_test.go']) {
    assert.equal(run(write(TW, f), project).code, 0, f);
  }
  const r = run(write(TW, 'server/lib/x.ts'), project);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /not a test file/);
  assert.equal(run(write(TW, 'README.md'), project).code, 2);
});

test('writes: runner config, setup, manifests and lockfiles are refused even inside a test dir', () => {
  const project = fixtureProject('pnpm-mono');
  for (const f of ['vitest.config.ts', 'server/vitest.config.mts', 'jest.config.js', 'playwright.config.ts',
    'server/test/setup.ts', 'test/setupTests.ts', 'package.json', 'server/test/package.json', 'tsconfig.json',
    'pnpm-lock.yaml', 'server/test/package-lock.json', 'pyproject.toml', '.claude/settings.json']) {
    const r = run(write(TW, f), project);
    assert.equal(r.code, 2, f);
    assert.match(r.stderr, /test infrastructure/, f);
  }
});

test('writes: explicit testLocations are authoritative and named as explicit input (AC-70)', () => {
  const project = fixtureProject('declared');
  assert.equal(run(write(TW, 'spec-area/a.test.js'), project).code, 0);
  const r = run(write(TW, 'src/d.test.ts'), project);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /explicit input/);
  const p = run(write(TW, 'infra/secrets/x.test.ts'), project);
  assert.equal(p.code, 2);
});

test('bash: reads and the project-defined checks only; refusal names the allowed set (AC-28)', () => {
  const project = fixtureProject('npm-project');
  for (const cmd of ['cat src/a.ts', 'ls -la', 'grep -rn a src | wc -l', 'git diff --stat', 'npm test', 'npm run typecheck',
    'npm run lint -- --max-warnings 0', 'cd src && ls', 'echo hi 2>&1']) {
    assert.equal(run(bash(TW, cmd), project).code, 0, cmd);
  }
  for (const cmd of ['rm src/a.ts', 'npm install', 'git commit -m x', 'echo x > src/a.ts', 'curl http://example.com',
    'node -e "1"', 'find . -delete', 'sort -o out.txt a', 'npm run lint -- --fix', 'cat $(ls)', 'cd .. && ls',
    'npm run build', 'sed -i s/a/b/ src/a.ts']) {
    const r = run(bash(TW, cmd), project);
    assert.equal(r.code, 2, cmd);
    assert.match(r.stderr, /Allowed: plain reads/, cmd);
  }
  const r = run(bash(TW, 'rm x'), project);
  assert.match(r.stderr, /`npm run typecheck`/);
  assert.match(r.stderr, /the check commands this project defines/);
});

test('bash: a project without a typecheck script gets no typecheck command (AC-69)', () => {
  const project = fixtureProject('no-typecheck');
  assert.equal(run(bash(TW, 'npm test'), project).code, 0);
  for (const cmd of ['npm run typecheck', 'pnpm typecheck', 'npx tsc --noEmit', 'npm run build']) {
    const r = run(bash(TW, cmd), project);
    assert.equal(r.code, 2, cmd);
  }
  const r = run(bash(TW, 'npm run typecheck'), project);
  assert.doesNotMatch(r.stderr, /typecheck`/);
  assert.match(r.stderr, /`npm test`/);
});

test('bash: monorepo scripts map to dir-prefixed and cd forms with the right package manager', () => {
  const project = fixtureProject('pnpm-mono');
  for (const cmd of ['pnpm --dir server test', 'pnpm --dir server typecheck', 'pnpm -C server run test:watch',
    'cd server && pnpm test', 'cd web && pnpm lint', 'pnpm --dir web lint']) {
    assert.equal(run(bash(TW, cmd), project).code, 0, cmd);
  }
  for (const cmd of ['pnpm test', 'npm test', 'pnpm --dir server dev', 'pnpm --dir web test', 'cd web && pnpm test',
    'npm --prefix server test']) {
    assert.equal(run(bash(TW, cmd), project).code, 2, cmd);
  }
});

test('bash: explicit checkCommands replace discovery and the refusal says so (AC-70)', () => {
  const project = fixtureProject('declared');
  assert.equal(run(bash(TW, 'make verify'), project).code, 0);
  const r = run(bash(TW, 'npm test'), project);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /explicit input/);
  assert.match(r.stderr, /`make verify`/);
});
