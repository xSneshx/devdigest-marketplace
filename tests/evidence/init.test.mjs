import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { assertInit, parseExpected, render } from '../../scripts/evidence/extract-init.mjs';
import { findInit, parseMessages } from '../../scripts/evidence/lib/common.mjs';

const cache = (catalog, plugin, version) => path.join(os.homedir(), '.claude', 'plugins', 'cache', catalog, plugin, version);
const NAMES = ['engineering-paved-path', 'research-tools', 'architecture-review', 'code-agents', 'sdd-engineering'];
const init = (catalog, sdd, extra = {}) => ({
  type: 'system', subtype: 'init',
  plugins: NAMES.map((n) => ({ name: n, path: cache(catalog, n, n === 'sdd-engineering' ? sdd : '1.0.0') })),
  ...extra,
});

describe('extract-init', () => {
  it('finds init in stream-json lines and in an array, and asserts path suffix and plugin_errors', () => {
    const stream = [JSON.stringify({ type: 'noise' }), 'not json', JSON.stringify(init('devdigest-marketplace-stable', '1.0.0')), JSON.stringify({ type: 'result' })].join('\n');
    const found = findInit(parseMessages(stream));
    assert.ok(found);
    assert.equal(findInit(parseMessages(JSON.stringify([init('c', '1.0.0')]))).subtype, 'init');

    const all = 'engineering-paved-path=1.0.0,research-tools=1.0.0,architecture-review=1.0.0,code-agents=1.0.0';
    const good = assertInit(found, { catalog: 'devdigest-marketplace-stable', version: '1.0.0', all });
    assert.deepEqual(good.failures, []);
    const text = render(good);
    assert.match(text, /PASS$/);
    assert.equal(text.includes(os.homedir()), false);

    const wrong = assertInit(found, { catalog: 'devdigest-marketplace', version: '1.1.0' });
    assert.equal(wrong.ok, false);
    assert.match(wrong.failures[0], /sdd-engineering: path does not end with \/devdigest-marketplace\/sdd-engineering\/1\.1\.0/);

    const errored = assertInit(init('devdigest-marketplace', '1.1.0', { plugin_errors: ['bad dependency'] }), { catalog: 'devdigest-marketplace', version: '1.1.0' });
    assert.deepEqual(errored.failures, ['plugin_errors is not empty']);
    assert.equal(assertInit(init('devdigest-marketplace', '1.1.0', { plugin_errors: [] }), { catalog: 'devdigest-marketplace', version: '1.1.0' }).ok, true);

    assert.equal(assertInit({ type: 'system', subtype: 'init', plugins: [] }, { catalog: 'c', version: '1' }).ok, false);
    assert.throws(() => parseExpected('broken'), /name=version/);
  });
});
