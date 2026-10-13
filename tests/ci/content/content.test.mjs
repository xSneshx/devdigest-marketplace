import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { REVIEWED_EXCEPTIONS, run } from '../../../scripts/ci/check-content.mjs';
import { cleanup, ctxFor, errorsOf, makeMarketplace } from '../core/helpers.mjs';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

// Built at runtime so that this file does not contain the deny-listed tokens it tests for.
const deny = (...parts) => `deny-listed token "${parts.join('')}`;

// fixture file -> text that the finding must contain
const EXPECTED = {
  'aws-access-key.md': 'aws-access-key',
  'google-api-key.md': 'google-api-key',
  'github-token.md': 'github-token',
  'npm-token.md': 'npm-token',
  'slack-token.md': 'slack-token',
  'private-key-block.md': 'private-key-block',
  'mongodb-uri-with-credentials.md': 'mongodb-uri-with-credentials',
  'generic-credential-assignment.md': 'generic-credential-assignment',
  'home-path-macos.md': '(/Users/)',
  'home-path-linux.md': '(/home/)',
  'absolute-windows-path.md': 'absolute-windows-path',
  ['deny-dev' + 'digest.md']: deny('dev', 'digest'),
  'deny-server-src.md': deny('server', '/src'),
  ['deny-reviewer' + '-core.md']: deny('reviewer', '-core'),
  'deny-mcp-tool.md': deny('mcp__', 'dev', 'digest'),
  'deny-insights-file.md': 'deny-listed token "INSIGHTS',
  'deny-retro-ledger.md': deny('docs/retros/', 'ledger.md'),
  'deny-claude-skills-dir.md': deny('.claude/', 'skills/'),
  'deny-port.md': 'deny-listed token "localhost:300[01]"',
};

const roots = [];
async function marketplaceWith(files) {
  const root = await makeMarketplace([{ name: 'p', files }]);
  roots.push(root);
  return root;
}
after(() => Promise.all(roots.map(cleanup)));

describe('check-content', () => {
  it('fails every planted pattern, names file and line, never echoes the match', async () => {
    const present = (await readdir(FIXTURES)).filter((f) => f !== 'clean-allowed.md').sort();
    assert.deepEqual(present, Object.keys(EXPECTED).sort(), 'every fixture has an expectation and vice versa');
    for (const [file, expected] of Object.entries(EXPECTED)) {
      const content = await readFile(path.join(FIXTURES, file), 'utf8');
      const root = await marketplaceWith({ [`docs/${file}`]: content });
      const errors = errorsOf(await run(ctxFor(root)));
      const hit = errors.find((e) => e.includes(expected));
      assert.ok(hit, `${file}: expected a finding containing ${expected}, got ${JSON.stringify(errors)}`);
      assert.match(hit, new RegExp(`^plugins/p/docs/${file.replace('.', '\\.')}:2: `), `${file}: path:line prefix`);
      for (const secretish of [['AKIA', 'ABCDEFGHIJKLMNOP'].join(''), 'ghp_ABCDEF', 'hunter2', 'q8Zr3LmN']) {
        assert.ok(!errors.join('\n').includes(secretish), `${file}: finding leaks the matched text`);
      }
    }
  });

  it('passes the clean fixture: lowercase /users/:id, a /home/ URL segment, the allowed name, placeholders', async () => {
    const content = await readFile(path.join(FIXTURES, 'clean-allowed.md'), 'utf8');
    const root = await marketplaceWith({ 'docs/clean.md': content });
    assert.deepEqual(errorsOf(await run(ctxFor(root))), []);
  });

  it('keeps the reviewed exception list exactly as specified', async () => {
    assert.deepEqual(
      { strings: [...REVIEWED_EXCEPTIONS.strings], files: [...REVIEWED_EXCEPTIONS.files] },
      { strings: ['devdigest-marketplace'], files: ['scripts/ci/denylist.txt', 'tests/ci/content/fixtures/**'] },
    );

    // the excluded locations really are skipped, a sibling really is scanned
    const planted = await readFile(path.join(FIXTURES, 'aws-access-key.md'), 'utf8');
    const root = await marketplaceWith({});
    const { mkdir, writeFile } = await import('node:fs/promises');
    for (const rel of ['scripts/ci/denylist.txt', 'tests/ci/content/fixtures/x.md']) {
      await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
      await writeFile(path.join(root, rel), planted);
    }
    assert.deepEqual(errorsOf(await run(ctxFor(root))), []);
    await writeFile(path.join(root, 'tests/ci/content/other.md'), planted);
    assert.equal(errorsOf(await run(ctxFor(root))).length, 1);
  });

  it('scans a plugin DECOUPLING note like any other file', async () => {
    const planted = await readFile(path.join(FIXTURES, 'deny-server-src.md'), 'utf8');
    const root = await marketplaceWith({ 'DECOUPLING-notes.md': planted });
    const errors = errorsOf(await run(ctxFor(root)));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /DECOUPLING-notes\.md:2: deny-listed token "server\/src"/);
  });

  it('refuses to pass vacuously on an empty tree', async () => {
    const { mkdtemp } = await import('node:fs/promises');
    const os = await import('node:os');
    const empty = await mkdtemp(path.join(os.tmpdir(), 'mp ci empty-'));
    roots.push(empty);
    const errors = errorsOf(await run(ctxFor(empty)));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /no files to scan/);
  });
});
