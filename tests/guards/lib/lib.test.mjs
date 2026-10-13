import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { fixtureProject, tempDir, writeFiles, cleanup, pluginDir } from './harness.mjs';

after(cleanup);
const lib = (name) => import(pathToFileURL(join(pluginDir('code-agents'), 'hooks', 'lib', name)).href);

test('rawAgentMatch is quote-anchored and exact', async () => {
  const { rawAgentMatch } = await lib('hook-io.mjs');
  const ids = ['code-agents:implementer'];
  assert.equal(rawAgentMatch('{"agent_type": "code-agents:implementer", broken', ids), 'code-agents:implementer');
  assert.equal(rawAgentMatch('{"agent_type":"xcode-agents:implementer"', ids), null);
  assert.equal(rawAgentMatch('{"agent_type":"code-agents:implementer-2"', ids), null);
  assert.equal(rawAgentMatch('{"other":"code-agents:implementer"', ids), null);
});

test('resolveInside refuses ../ and absolute escapes, accepts new files inside', async () => {
  const { resolveInside, Refusal } = await lib('hook-io.mjs');
  const root = tempDir();
  assert.equal(resolveInside(root, 'a/b/new.ts').rel, 'a/b/new.ts');
  assert.equal(resolveInside(root, join(root, 'x.ts')).rel, 'x.ts');
  assert.throws(() => resolveInside(root, '../x'), Refusal);
  assert.throws(() => resolveInside(root, '/etc/passwd'), Refusal);
  assert.throws(() => resolveInside(root, 'a/../../x'), Refusal);
});

test('project-inputs: validation, explicit tracking and path patterns', async () => {
  const { loadInputs, pathPattern, matchesAny } = await lib('project-inputs.mjs');
  const root = tempDir();
  assert.equal(loadInputs(root).present, false);
  writeFiles(root, { '.claude/project-inputs.json': JSON.stringify({
    protectedPaths: ['infra/', 'a/*.lock', 'docs/**/gen'], checkCommands: ['make ci'], planDir: 'plans' }) });
  const i = loadInputs(root);
  assert.deepEqual([...i.explicit].sort(), ['checkCommands', 'planDir', 'protectedPaths']);
  assert.equal(matchesAny('infra/x/y', i.protectedPaths), 'infra/');
  assert.equal(matchesAny('infrastructure/x', i.protectedPaths), null);
  assert.ok(pathPattern('a/*.lock').test('a/b.lock'));
  assert.ok(!pathPattern('a/*.lock').test('a/b/c.lock'));
  assert.ok(pathPattern('docs/**/gen').test('docs/x/y/gen'));

  for (const bad of ['{"protectedPaths":"x"}', '{"protectedPaths":["../x"]}', '{"protectedPaths":["/abs"]}',
    '{"planDir":3}', '[]', 'nope']) {
    writeFiles(root, { '.claude/project-inputs.json': bad });
    assert.throws(() => loadInputs(root), /project-inputs\.json/, bad);
  }
});

test('project-map: discovers check scripts, package manager, rule files and test dirs (AC-69)', async () => {
  const { buildProjectMap, effectiveChecks } = await lib('project-map.mjs');
  const { loadInputs } = await lib('project-inputs.mjs');
  const mono = fixtureProject('pnpm-mono');
  const map = buildProjectMap(mono);
  const names = map.checks.map((c) => `${c.dir}:${c.script}:${c.pm}`).sort();
  assert.deepEqual(names, ['server:test:pnpm', 'server:test:watch:pnpm', 'server:typecheck:pnpm', 'web:lint:pnpm']);
  assert.ok(map.testDirs.includes('server/test'));
  const server = map.checks.find((c) => c.script === 'typecheck');
  assert.ok(server.prefixed.includes('pnpm --dir server typecheck'));

  const npm = buildProjectMap(fixtureProject('npm-project'));
  assert.deepEqual(npm.ruleFiles, ['CLAUDE.md']);
  assert.equal(npm.testFileCount, 1);
  const test = npm.checks.find((c) => c.script === 'test');
  assert.deepEqual(test.bare, ['npm run test', 'npm test']);

  const none = buildProjectMap(fixtureProject('no-typecheck'));
  assert.ok(!none.checks.some((c) => /typecheck/.test(c.script)));

  const declaredRoot = fixtureProject('declared');
  const eff = effectiveChecks(buildProjectMap(declaredRoot), loadInputs(declaredRoot));
  assert.equal(eff.explicit, true);
  assert.deepEqual(eff.checks.map((c) => c.bare[0]), ['make verify']);
});

test('project-map: honours its deadline', async () => {
  const { buildProjectMap } = await lib('project-map.mjs');
  assert.throws(() => buildProjectMap(fixtureProject('npm-project'), { deadline: 0 }), /time budget/);
});

test('bash-parse: quote-aware splitting and verdicts', async () => {
  const { splitCommands, readOnlyBashVerdict } = await lib('bash-parse.mjs');
  assert.deepEqual(splitCommands('echo "a; b" && ls').map((c) => c.plain), ['echo a; b', 'ls']);
  assert.throws(() => splitCommands('echo "x'), /unbalanced/);
  const root = tempDir();
  const ctx = { root, checks: [], explicit: false };
  assert.equal(readOnlyBashVerdict('ls | wc -l', ctx), null);
  assert.match(readOnlyBashVerdict('npm test', ctx), /defines no test\/typecheck\/lint\/check script/);
  assert.match(readOnlyBashVerdict('cat <<EOF\nx\nEOF', ctx), /heredocs/);
  assert.match(readOnlyBashVerdict('grep a b > c', ctx), /redirection/);
});
