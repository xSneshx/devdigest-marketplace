import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { redact, redactValue } from '../../scripts/evidence/lib/redact.mjs';

describe('redact', () => {
  it('shortens the home directory, masks token shapes and drops env blocks', () => {
    const home = os.homedir();
    const token = `gh${'p'}_${'A'.repeat(36)}`;
    const text = `see ${path.join(home, '.claude', 'plugins')} and ${token} end`;
    const out = redact(text);
    assert.equal(out.includes(home), false);
    assert.match(out, /~\/\.claude\/plugins/);
    assert.equal(out.includes(token), false);
    assert.match(out, /\[redacted-token\]/);

    const slash = String.fromCharCode(47);
    const foreign = `${slash}${'Users'}${slash}someone-else${slash}project`;
    assert.equal(redact(foreign, { home: path.join(slash, 'nowhere') }), '~/project');

    const value = redactValue({ path: path.join(home, 'x'), env: { SECRET: 'v' }, nested: [{ env: 1, ok: 'fine' }] });
    assert.deepEqual(value, { path: '~/x', nested: [{ ok: 'fine' }] });
  });
});
