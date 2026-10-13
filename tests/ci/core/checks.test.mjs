import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import * as catalog from '../../../scripts/ci/check-catalog.mjs';
import * as depForm from '../../../scripts/ci/check-dep-form.mjs';
import * as frontmatter from '../../../scripts/ci/check-frontmatter.mjs';
import * as graph from '../../../scripts/ci/check-graph.mjs';
import * as headInRange from '../../../scripts/ci/check-head-in-range.mjs';
import * as parity from '../../../scripts/ci/check-guard-parity.mjs';
import * as skillsBacked from '../../../scripts/ci/check-skills-backed.mjs';
import * as structure from '../../../scripts/ci/check-structure.mjs';
import * as versions from '../../../scripts/ci/check-versions.mjs';
import { main as runAll } from '../../../scripts/ci/run-all.mjs';
import { parseFrontmatter } from '../../../scripts/ci/lib/frontmatter.mjs';
import { satisfies, validRange } from '../../../scripts/ci/lib/semver.mjs';
import { cleanup, ctxFor, dep, errorsOf, makeMarketplace } from './helpers.mjs';

const roots = [];
const build = async (...args) => {
  const root = await makeMarketplace(...args);
  roots.push(root);
  return root;
};
after(() => Promise.all(roots.map(cleanup)));

const agent = (extra = '') => `---\nname: a\ndescription: "does things"\n${extra}---\nbody\n`;

describe('semver', () => {
  it('matches caret, tilde, comparators and rejects junk', () => {
    assert.equal(satisfies('1.4.2', '^1.0.0'), true);
    assert.equal(satisfies('2.0.0', '^1.0.0'), false);
    assert.equal(satisfies('0.2.9', '^0.2.1'), true);
    assert.equal(satisfies('0.3.0', '^0.2.1'), false);
    assert.equal(satisfies('1.2.9', '~1.2.0'), true);
    assert.equal(satisfies('1.3.0', '~1.2.0'), false);
    assert.equal(satisfies('1.5.0', '>=1.2.0 <2.0.0'), true);
    assert.equal(validRange('latest'), false);
    assert.throws(() => satisfies('1.0', '^1.0.0'));
  });
});

describe('catalog check (AC-6)', () => {
  it('passes a clean marketplace', async () => {
    const root = await build([{ name: 'alpha' }, { name: 'beta' }]);
    assert.deepEqual(errorsOf(await catalog.run(ctxFor(root))), []);
  });
  it('fails a name mismatch, a version mismatch and a missing or escaping source', async () => {
    const root = await build([{ name: 'alpha' }, { name: 'beta' }, { name: 'gamma' }, { name: 'delta' }], {
      catalogOverrides: {
        alpha: { name: 'alpha-x' },
        beta: { version: '9.9.9' },
        gamma: { source: './plugins/nope' },
        delta: { source: './plugins/../../escape' },
      },
    });
    const errors = errorsOf(await catalog.run(ctxFor(root))).join('\n');
    assert.match(errors, /alpha-x.*differs from manifest name "alpha"/);
    assert.match(errors, /beta: catalog version "9.9.9"/);
    assert.match(errors, /gamma: source .* not an existing directory/);
    assert.match(errors, /delta: source .* inside the repository/);
  });
  it('--plugin restricts reporting to the named plugin', async () => {
    const root = await build([{ name: 'alpha' }, { name: 'beta' }], { catalogOverrides: { beta: { version: '9.9.9' } } });
    assert.deepEqual(errorsOf(await catalog.run(ctxFor(root, { plugins: ['alpha'] }))), []);
  });
});

describe('graph check (AC-8)', () => {
  it('passes an acyclic graph', async () => {
    const root = await build([{ name: 'alpha' }, { name: 'beta', dependencies: [dep('alpha')] }]);
    assert.deepEqual(errorsOf(await graph.run(ctxFor(root))), []);
  });
  it('fails an unknown dependency and a cycle, naming the plugin', async () => {
    const missing = await build([{ name: 'alpha', dependencies: [dep('ghost')] }]);
    assert.match(errorsOf(await graph.run(ctxFor(missing)))[0], /alpha: dependency "ghost"/);
    const cyclic = await build([
      { name: 'alpha', dependencies: [dep('beta')] },
      { name: 'beta', dependencies: [dep('alpha')] },
    ]);
    const errors = errorsOf(await graph.run(ctxFor(cyclic)));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /dependency cycle alpha -> beta -> alpha/);
  });
});

describe('dep-form check (AC-73)', () => {
  it('accepts the object form and rejects the string form with a range', async () => {
    const ok = await build([{ name: 'alpha' }, { name: 'beta', dependencies: [dep('alpha')] }]);
    assert.deepEqual(errorsOf(await depForm.run(ctxFor(ok))), []);
    const bad = await build([{ name: 'alpha' }, { name: 'beta', dependencies: ['alpha@mp@^1.0.0'] }]);
    assert.match(errorsOf(await depForm.run(ctxFor(bad)))[0], /beta: string dependency "alpha@mp@\^1\.0\.0" carries a range/);
  });
  it('rejects a bare string and an object without a usable version', async () => {
    const root = await build([
      { name: 'alpha' },
      { name: 'beta', dependencies: ['alpha'] },
      { name: 'gamma', dependencies: [{ name: 'alpha' }] },
    ]);
    const errors = errorsOf(await depForm.run(ctxFor(root))).join('\n');
    assert.match(errors, /beta: string dependency "alpha" has no version/);
    assert.match(errors, /gamma: dependency "alpha" needs a "version"/);
  });
});

describe('skills-backed check (AC-71)', () => {
  it('passes when the cross-plugin skill is backed by a dependency', async () => {
    const root = await build([
      { name: 'alpha' },
      { name: 'beta', dependencies: [dep('alpha')], files: { 'agents/a.md': agent('skills:\n  - alpha:zod\n') } },
    ]);
    assert.deepEqual(errorsOf(await skillsBacked.run(ctxFor(root))), []);
  });
  it('fails an unbacked cross-plugin skill, naming the plugin', async () => {
    const root = await build([
      { name: 'alpha' },
      { name: 'beta', files: { 'agents/a.md': agent('skills:\n  - alpha:zod\n') } },
    ]);
    assert.match(errorsOf(await skillsBacked.run(ctxFor(root)))[0], /beta: agents\/a\.md .*does not declare a dependency on "alpha"/);
  });
});

describe('versions check (AC-9)', () => {
  const gitStub = (changed, baseManifestVersion, tags = []) => ({
    resolve: () => 'abc123',
    changedFiles: () => changed,
    fileAt: () => (baseManifestVersion === null ? null : JSON.stringify({ name: 'x', version: baseManifestVersion })),
    hasTag: (tag) => tags.includes(tag),
  });
  const edit = ['plugins/beta/agents/a.md'];
  it('fails a component edit on a released version without a bump, naming the plugin', async () => {
    const root = await build([{ name: 'alpha' }, { name: 'beta' }]);
    const ctx = ctxFor(root, { base: 'origin/main', git: gitStub(edit, '1.0.0', ['beta--v1.0.0']) });
    const errors = errorsOf(await versions.run(ctx));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^beta: .*released version 1\.0\.0 .*unchanged/);
  });
  it('passes a component edit on an unreleased version', async () => {
    const root = await build([{ name: 'beta' }]);
    assert.deepEqual(errorsOf(await versions.run(ctxFor(root, { base: 'main', git: gitStub(edit, '1.0.0') }))), []);
  });
  it('passes a released plugin that was bumped, was not touched, or is new', async () => {
    const root = await build([{ name: 'beta', version: '1.1.0' }]);
    const tags = ['beta--v1.0.0', 'beta--v1.1.0'];
    assert.deepEqual(errorsOf(await versions.run(ctxFor(root, { base: 'main', git: gitStub(edit, '1.0.0', tags) }))), []);
    const same = await build([{ name: 'beta' }]);
    assert.deepEqual(errorsOf(await versions.run(ctxFor(same, { base: 'main', git: gitStub([], '1.0.0', tags) }))), []);
    assert.deepEqual(errorsOf(await versions.run(ctxFor(same, { base: 'main', git: gitStub(edit, null, tags) }))), []);
  });
  it('fails a version that goes down against the base', async () => {
    const root = await build([{ name: 'beta', version: '1.0.0' }]);
    const errors = errorsOf(await versions.run(ctxFor(root, { base: 'main', git: gitStub([], '1.2.0') })));
    assert.match(errors[0], /^beta: version went down from 1\.2\.0/);
  });
  it('is skipped without a base ref', async () => {
    const root = await build([{ name: 'alpha' }]);
    assert.ok((await versions.run(ctxFor(root))).skipped);
  });
});

describe('head-in-range check (AC-76)', () => {
  it('fails a 2.0.0 bump against ^1.0.0 dependents, naming the dependent', async () => {
    const root = await build([{ name: 'alpha', version: '2.0.0' }, { name: 'beta', dependencies: [dep('alpha')] }]);
    const errors = errorsOf(await headInRange.run(ctxFor(root)));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /beta: requires alpha \^1\.0\.0, but alpha is at 2\.0\.0/);
  });
  it('passes in range and is skipped under the tag rule', async () => {
    const root = await build([{ name: 'alpha', version: '1.3.0' }, { name: 'beta', dependencies: [dep('alpha')] }]);
    assert.deepEqual(errorsOf(await headInRange.run(ctxFor(root))), []);
    const out = await build([{ name: 'alpha', version: '2.0.0' }, { name: 'beta', dependencies: [dep('alpha')] }]);
    assert.ok((await headInRange.run(ctxFor(out, { config: { dependencyResolution: 'tag' } }))).skipped);
  });
});

describe('structure check (AC-10, AC-11, AC-34)', () => {
  it('passes a complete plugin and fails missing docs, forbidden files and bin/', async () => {
    const ok = await build([{ name: 'alpha' }]);
    assert.deepEqual(errorsOf(await structure.run(ctxFor(ok))), []);
    const bad = await build([{ name: 'beta', files: { 'CLAUDE.md': 'x', 'bin/tool': 'x', 'skills/s/settings.json': '{}' } }], { withDocs: false });
    const errors = errorsOf(await structure.run(ctxFor(bad))).join('\n');
    assert.match(errors, /beta: README\.md is missing/);
    assert.match(errors, /beta: CHANGELOG\.md is missing/);
    assert.match(errors, /beta: forbidden file CLAUDE\.md/);
    assert.match(errors, /beta: forbidden top-level directory bin\//);
    assert.match(errors, /beta: forbidden file skills\/s\/settings\.json/);
  });
  it('fails a README without a required section', async () => {
    const root = await build([{ name: 'alpha', files: { 'README.md': '## Use case\n' } }]);
    const errors = errorsOf(await structure.run(ctxFor(root)));
    assert.ok(errors.some((e) => /alpha: README\.md has no "Support" section/.test(e)));
  });
  it('requires one eval case per class once evals/ exists, or under --require-evals', async () => {
    const partial = await build([{ name: 'alpha', files: { 'evals/positive/a.json': '{}', 'evals/cases.json': '{"class": "negative"}' } }]);
    assert.deepEqual(errorsOf(await structure.run(ctxFor(partial))), ['alpha: no workflow eval case under evals/']);
    const none = await build([{ name: 'beta' }]);
    assert.deepEqual(errorsOf(await structure.run(ctxFor(none))), []);
    const required = errorsOf(await structure.run(ctxFor(none, { flags: { requireEvals: true } })));
    assert.equal(required.length, 3);
  });
});

describe('frontmatter check (AC-24, AC-65)', () => {
  it('fails agent hooks, permissionMode and mcpServers', async () => {
    const root = await build([{ name: 'alpha', files: { 'agents/a.md': agent('hooks:\n  PreToolUse: x\npermissionMode: plan\nmcpServers: y\n') } }]);
    const errors = errorsOf(await frontmatter.run(ctxFor(root))).join('\n');
    for (const key of ['hooks', 'permissionMode', 'mcpServers']) assert.match(errors, new RegExp(`alpha: agents/a\\.md: .*"${key}"`));
  });
  it('requires manual-only retro components and flags automatic invocation', async () => {
    const root = await build([
      {
        name: 'alpha',
        files: {
          'skills/workflow-retro/SKILL.md': '---\nname: workflow-retro\ndescription: "retro"\n---\n',
          'commands/sdd-retro.md': '---\ndescription: "retro"\ndisable-model-invocation: true\n---\n',
          'skills/run-plan/SKILL.md': '---\nname: run-plan\ndescription: "run"\n---\nWhen done, run workflow-retro.\nNever invoke workflow-retro here.\n',
        },
      },
    ]);
    const errors = errorsOf(await frontmatter.run(ctxFor(root)));
    assert.ok(errors.some((e) => /skills\/workflow-retro\/SKILL\.md: must set "disable-model-invocation: true"/.test(e)));
    assert.ok(errors.some((e) => /skills\/run-plan\/SKILL\.md:5: appears to invoke/.test(e)));
    assert.equal(errors.some((e) => /sdd-retro\.md/.test(e)), false);
    assert.equal(errors.some((e) => /SKILL\.md:6/.test(e)), false);
  });
  it('fails a description with nested double quotes or an unquoted colon', async () => {
    const root = await build([
      {
        name: 'alpha',
        files: {
          'agents/q.md': '---\nname: q\ndescription: "say "hi" now"\n---\n',
          'agents/c.md': '---\nname: c\ndescription: does this: that\n---\n',
          'agents/ok.md': "---\nname: ok\ndescription: \"say 'hi' now\"\nskills: [a, b]\n---\n",
        },
      },
    ]);
    const errors = errorsOf(await frontmatter.run(ctxFor(root))).join('\n');
    assert.match(errors, /agents\/q\.md: description: unescaped double quote/);
    assert.match(errors, /agents\/c\.md: description: plain value contains/);
    assert.doesNotMatch(errors, /agents\/ok\.md/);
  });
  it('parses block and inline lists', () => {
    const { data, errors } = parseFrontmatter('---\nname: x\nskills:\n  - a:b\n  - c\ntools: [Read, Grep]\n---\n');
    assert.deepEqual(errors, []);
    assert.deepEqual(data.skills, ['a:b', 'c']);
    assert.deepEqual(data.tools, ['Read', 'Grep']);
  });
});

describe('guard-parity check', () => {
  it('passes identical libs and fails a differing or missing file', async () => {
    const same = await build([
      { name: 'code-agents', files: { 'hooks/lib/a.mjs': 'x' } },
      { name: 'sdd-engineering', files: { 'hooks/lib/a.mjs': 'x' } },
    ]);
    assert.deepEqual(errorsOf(await parity.run(ctxFor(same))), []);
    const diff = await build([
      { name: 'code-agents', files: { 'hooks/lib/a.mjs': 'x', 'hooks/lib/b.mjs': 'y' } },
      { name: 'sdd-engineering', files: { 'hooks/lib/a.mjs': 'z' } },
    ]);
    const errors = errorsOf(await parity.run(ctxFor(diff))).join('\n');
    assert.match(errors, /hooks\/lib\/a\.mjs differs/);
    assert.match(errors, /b\.mjs is missing/);
  });
});

describe('run-all', () => {
  it('rejects an unknown check and runs the selected checks on a fixture', async () => {
    assert.equal(await runAll(['--only', 'nope']), 2);
    const root = await build([{ name: 'alpha', version: '2.0.0' }, { name: 'beta', dependencies: [dep('alpha')] }]);
    assert.equal(await runAll(['--root', root, '--only', 'catalog,graph']), 0);
    assert.equal(await runAll(['--root', root, '--only', 'catalog,head-in-range']), 1);
  });
});
