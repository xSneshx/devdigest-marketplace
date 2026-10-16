import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertPluginList, render } from '../../scripts/evidence/assert-plugin-list.mjs';

const PROJECT = path.join(os.tmpdir(), 'consumer-project');
const NAMES = ['engineering-paved-path', 'research-tools', 'architecture-review', 'code-agents', 'sdd-engineering'];

function entry(plugin, catalog, version, extra = {}) {
  return {
    id: `${plugin}@${catalog}`, version, scope: 'project', enabled: true,
    installPath: path.join(os.homedir(), '.claude', 'plugins', 'cache', catalog, plugin, version),
    projectPath: PROJECT, ...extra,
  };
}
const full = (catalog, sdd) => NAMES.map((n) => entry(n, catalog, n === 'sdd-engineering' ? sdd : '1.0.0'));

describe('assert-plugin-list', () => {
  it('passes a clean stable and latest list and fails a wrong catalog, version or error', () => {
    const stable = assertPluginList(full('devdigest-marketplace-stable', '1.0.0'), { project: PROJECT, channel: 'stable' });
    assert.deepEqual(stable.failures, []);
    assert.equal(assertPluginList(full('devdigest-marketplace', '1.1.0'), { project: PROJECT, channel: 'latest' }).ok, true);

    const wrongVersion = assertPluginList(full('devdigest-marketplace-stable', '1.1.0'), { project: PROJECT, channel: 'stable' });
    assert.equal(wrongVersion.ok, false);
    assert.match(wrongVersion.failures.join('\n'), /sdd-engineering@devdigest-marketplace-stable version 1\.1\.0 expected 1\.0\.0/);

    // enabled: true is not proof of health: the failure shows up in `errors` only
    const withErrors = full('devdigest-marketplace-stable', '1.0.0');
    withErrors[0] = { ...withErrors[0], errors: ['dependency unsatisfied'] };
    assert.match(assertPluginList(withErrors, { project: PROJECT, channel: 'stable' }).failures.join('\n'), /reports errors/);

    const wrongPath = full('devdigest-marketplace-stable', '1.0.0');
    wrongPath[1] = { ...wrongPath[1], installPath: path.join(os.homedir(), 'cache', 'research-tools', '0.9.0') };
    assert.match(assertPluginList(wrongPath, { project: PROJECT, channel: 'stable' }).failures.join('\n'), /installPath does not end with/);
  });

  it('flags ids of the other channel (AC-21), a missing plugin and duplicate enabled names (AC-22); partial checks only AC-22', () => {
    const mixed = [...full('devdigest-marketplace-stable', '1.0.0'), entry('sdd-engineering', 'devdigest-marketplace', '1.1.0')];
    const result = assertPluginList(mixed, { project: PROJECT, channel: 'stable' });
    const text = result.failures.join('\n');
    assert.match(text, /AC-21: id from the other channel remains \(sdd-engineering@devdigest-marketplace\)/);
    assert.match(text, /AC-22: plugin "sdd-engineering" is enabled more than once/);
    assert.match(text, /expected exactly 5 project entries, found 6/);

    const missing = assertPluginList(full('devdigest-marketplace-stable', '1.0.0').slice(1), { project: PROJECT, channel: 'stable' });
    assert.match(missing.failures.join('\n'), /engineering-paved-path@devdigest-marketplace-stable expected once/);

    // a disabled duplicate is allowed mid-switch; another project's entries are ignored
    const midSwitch = [entry('sdd-engineering', 'devdigest-marketplace', '1.1.0', { enabled: false }), entry('sdd-engineering', 'devdigest-marketplace-stable', '1.0.0')];
    assert.equal(assertPluginList(midSwitch, { project: PROJECT, channel: 'stable', partial: true }).ok, true);
    const foreign = [entry('sdd-engineering', 'devdigest-marketplace', '1.1.0', { projectPath: path.join(os.tmpdir(), 'other') }), entry('sdd-engineering', 'devdigest-marketplace-stable', '1.0.0')];
    assert.equal(assertPluginList(foreign, { project: PROJECT, channel: 'stable', partial: true }).ok, true);
    assert.equal(assertPluginList(mixed, { project: PROJECT, channel: 'stable', partial: true }).ok, false);

    const out = render(result, { channel: 'stable' });
    assert.match(out, /FAIL$/);
    assert.equal(out.includes(os.homedir()), false);
  });

  it('exits non-zero from the command line on a failed assertion and zero on a pass', () => {
    const script = fileURLToPath(new URL('../../scripts/evidence/assert-plugin-list.mjs', import.meta.url));
    const run = (list) => spawnSync(process.execPath, [script, '--project', PROJECT, '--channel', 'stable'], { input: JSON.stringify(list), encoding: 'utf8' });
    const ok = run(full('devdigest-marketplace-stable', '1.0.0'));
    assert.equal(ok.status, 0);
    assert.match(ok.stdout, /PASS\n$/);
    assert.equal(run(full('devdigest-marketplace', '1.1.0')).status, 1);
  });
});
