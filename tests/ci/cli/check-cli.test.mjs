import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { dependencyOrder, diffInventory, parseDetails, run, tagDryRun } from '../../../scripts/ci/check-cli.mjs';
import { cleanup, ctxFor, errorsOf, makeMarketplace } from '../core/helpers.mjs';

const DETAILS = {
  'research-tools': `research-tools 1.0.0
Component inventory
  Skills (1)  focus, pick
  Agents (1)  researcher
  Hooks (1)  PreToolUse  (harness-only — no model context cost)
  MCP servers (0)
`,
};

// A fake `claude`: behaviour comes from FAKE_* variables, so one script serves every test.
async function fakeClaude(extraEnv = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'fake claude-'));
  const file = path.join(dir, 'claude');
  await writeFile(file, `#!/usr/bin/env node
const a = process.argv.slice(2);
const e = process.env;
if (a[1] === 'validate') {
  if (e.FAKE_VALIDATE_FAIL && a[2].includes(e.FAKE_VALIDATE_FAIL)) { console.log('Validation failed: warning'); process.exit(1); }
  console.log('Validation passed'); process.exit(0);
}
if (a[1] === 'details') { process.stdout.write(e.FAKE_DETAILS ?? ''); process.exit(0); }
if (a[1] === 'tag') { if (e.FAKE_TAG_FAIL) { console.log('✘ Uncommitted changes'); } else { console.log('would tag ' + a[2]); } process.exit(0); }
console.log('ok'); process.exit(0);
`);
  await chmod(file, 0o755);
  return { dir, env: { ...process.env, PATH: `${dir}${path.delimiter}${process.env.PATH}`, ...extraEnv } };
}

async function fixture(env) {
  const root = await makeMarketplace([{ name: 'research-tools' }]);
  const componentMapPath = path.join(root, 'component-map.json');
  await writeFile(componentMapPath, JSON.stringify({ 'research-tools': { skills: [], agents: ['researcher'], commands: [], hooks: [] } }));
  return { root, ctx: ctxFor(root, { componentMapPath, flags: { withCli: true, requireEvals: false, worktree: false, snapshot: false }, env }) };
}

test('parseDetails reads skills, agents and hooks, dropping the harness-only note', () => {
  assert.deepEqual(parseDetails(DETAILS['research-tools']), { skills: ['focus', 'pick'], agents: ['researcher'], hooks: ['PreToolUse'] });
});

test('diffInventory merges commands into skills and flags a removed skill', () => {
  const expected = { skills: ['a'], agents: ['x'], commands: ['a', 'b'], hooks: [] };
  assert.deepEqual(diffInventory('p', { skills: ['a', 'a', 'b'], agents: ['x'], hooks: [] }, expected), []);
  const errs = diffInventory('p', { skills: ['a', 'b'], agents: ['x'], hooks: [] }, expected);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /^p: skills/);
});

test('without --with-cli the check is skipped', async () => {
  const result = await run(ctxFor('/nonexistent'));
  assert.equal(result.skipped, 'needs --with-cli');
});

test('validate and inventory pass, then fail when a strict validation or a skill is lost', async () => {
  const fake = await fakeClaude({ FAKE_DETAILS: 'x' });
  const { root, ctx } = await fixture(fake.env);
  try {
    const ok = await run({ ...ctx, env: { ...fake.env, FAKE_DETAILS: 'Skills (0)\n  Agents (1)  researcher\n  Hooks (0)\n' } });
    assert.deepEqual(errorsOf(ok), []);

    const removed = await run({ ...ctx, env: { ...fake.env, FAKE_DETAILS: 'Skills (1)  extra\n  Agents (1)  researcher\n  Hooks (0)\n' } });
    assert.ok(errorsOf(removed).some((e) => /^research-tools: skills/.test(e)), errorsOf(removed).join('\n'));

    const strict = await run({ ...ctx, env: { ...fake.env, FAKE_VALIDATE_FAIL: 'research-tools', FAKE_DETAILS: 'Skills (0)\n  Agents (1)  researcher\n  Hooks (0)\n' } });
    assert.ok(errorsOf(strict).some((e) => /^research-tools: claude plugin validate --strict failed/.test(e)));
  } finally {
    await cleanup(root);
    await rm(fake.dir, { recursive: true, force: true });
  }
});

test('tag dry-run orders dependencies first and requires a satisfying tag for each dependency', async () => {
  const root = await makeMarketplace([
    { name: 'top', dependencies: [{ name: 'base', version: '^1.0.0' }] },
    { name: 'base' },
  ]);
  const fake = await fakeClaude();
  try {
    const world = { plugins: [{ name: 'top', manifest: { dependencies: [{ name: 'base' }] } }, { name: 'base', manifest: {} }] };
    assert.deepEqual(dependencyOrder(world.plugins).map((p) => p.name), ['base', 'top']);
    // Not a git repo: listing tags fails, which is reported, not thrown.
    const errs = await tagDryRun(ctxFor(root), fake.env);
    assert.ok(errs.some((e) => /git tag --list failed/.test(e)));
  } finally {
    await cleanup(root);
    await rm(fake.dir, { recursive: true, force: true });
  }
});
