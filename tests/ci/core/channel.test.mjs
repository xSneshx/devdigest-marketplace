import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import * as channel from '../../../scripts/ci/check-channel.mjs';
import { buildContext, parseArgs } from '../../../scripts/ci/lib/check.mjs';
import { cleanup, ctxFor, errorsOf, makeMarketplace } from './helpers.mjs';

const CHANNELS = { main: 'devdigest-marketplace', stable: 'devdigest-marketplace-stable' };
const roots = [];
const build = async (catalogName) => {
  const root = await makeMarketplace([{ name: 'a' }]);
  roots.push(root);
  const { readFile, writeFile } = await import('node:fs/promises');
  const file = `${root}/.claude-plugin/marketplace.json`;
  const catalog = JSON.parse(await readFile(file, 'utf8'));
  await writeFile(file, JSON.stringify({ ...catalog, name: catalogName }));
  return root;
};
after(() => Promise.all(roots.map(cleanup)));

const ctx = (root, channelRef) => ctxFor(root, { channelRef, config: { channels: CHANNELS } });

describe('channel check', () => {
  it('accepts the expected catalog name per channel and rejects a mismatch naming the expected value', async () => {
    const latest = await build('devdigest-marketplace');
    const stable = await build('devdigest-marketplace-stable');

    assert.deepEqual(errorsOf(await channel.run(ctx(latest, 'main'))), []);
    assert.deepEqual(errorsOf(await channel.run(ctx(stable, 'stable'))), []);

    const wrong = errorsOf(await channel.run(ctx(latest, 'stable')));
    assert.equal(wrong.length, 1);
    assert.match(wrong[0], /expected "devdigest-marketplace-stable"/);
    assert.match(wrong[0], /"devdigest-marketplace" on channel ref "stable"/);

    const wrongMain = errorsOf(await channel.run(ctx(stable, 'main')));
    assert.match(wrongMain[0], /expected "devdigest-marketplace"$/);
  });

  it('skips with a logged reason for a non-channel ref and for no ref', async () => {
    const root = await build('devdigest-marketplace');
    const feature = await channel.run(ctx(root, 'feat/x'));
    assert.deepEqual(feature.errors, []);
    assert.match(feature.skipped, /ref "feat\/x" is not a channel ref \(main, stable\)/);

    const none = await channel.run(ctx(root, null));
    assert.match(none.skipped, /no channel ref/);
  });

  it('resolves the ref from --channel, then GITHUB_BASE_REF, then GITHUB_REF_NAME', () => {
    assert.equal(parseArgs([], {}).channelRef, null);
    assert.equal(parseArgs([], { GITHUB_REF_NAME: 'main' }).channelRef, 'main');
    assert.equal(parseArgs([], { GITHUB_BASE_REF: 'stable', GITHUB_REF_NAME: '12/merge' }).channelRef, 'stable');
    assert.equal(parseArgs(['--channel', 'stable'], { GITHUB_BASE_REF: 'main' }).channelRef, 'stable');
    assert.equal(buildContext(parseArgs(['--channel', 'stable'], {})).channelRef, 'stable');
    assert.throws(() => parseArgs(['--chanel', 'x'], {}), /unknown argument/);
    assert.throws(() => parseArgs(['--channel'], {}), /needs a value/);
  });
});
