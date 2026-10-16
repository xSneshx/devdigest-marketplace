import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { check, countMarker, findRecord, shaMatches } from '../../scripts/evidence/installed-check.mjs';

const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
const SHA = 'a'.repeat(40);

function install(agentText) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'installed-'));
  dirs.push(dir);
  mkdirSync(path.join(dir, 'agents'), { recursive: true });
  writeFileSync(path.join(dir, 'agents', 'spec-creator.md'), agentText);
  return dir;
}
const record = (installPath, extra = {}) => ({ scope: 'project', projectPath: path.join(os.tmpdir(), 'p'), installPath, version: '1.0.0', gitCommitSha: SHA, ...extra });
const read = (p) => import('node:fs').then((fs) => fs.readFileSync(p, 'utf8'));

describe('installed-check', () => {
  it('compares the SHA and counts the Assumptions marker', async () => {
    const stableDir = install('# spec-creator\n\n## Output\n');
    const latestDir = install('# spec-creator\n\n## Assumptions\n\ntext\n');
    const { readFileSync } = await import('node:fs');

    const ok = check({ record: record(stableDir), expectSha: SHA.slice(0, 12), assumptions: '0', readAgent: (p) => readFileSync(p, 'utf8') });
    assert.deepEqual(ok.failures, []);
    assert.ok(ok.lines.some((l) => l.includes('Assumptions marker count: 0')));

    const bad = check({ record: record(stableDir, { gitCommitSha: 'b'.repeat(40) }), expectSha: SHA, assumptions: '>=1', readAgent: (p) => readFileSync(p, 'utf8') });
    assert.equal(bad.failures.length, 2);

    const latest = check({ record: record(latestDir), expectSha: SHA, assumptions: '>=1', readAgent: (p) => readFileSync(p, 'utf8') });
    assert.equal(latest.ok, true);

    const absent = check({ record: record(stableDir, { gitCommitSha: undefined }), expectSha: SHA, assumptions: '0', readAgent: (p) => readFileSync(p, 'utf8') });
    assert.equal(absent.ok, true);
    assert.ok(absent.lines.includes('gitCommitSha: field absent'));

    assert.equal(check({ record: null, expectSha: SHA, assumptions: '0', readAgent: read }).ok, false);
    assert.equal(check({ record: record(path.join(stableDir, 'missing')), expectSha: SHA, assumptions: '0', readAgent: (p) => readFileSync(p, 'utf8') }).ok, false);
  });

  it('finds the project-scope record and matches abbreviated SHAs', () => {
    const installed = { plugins: { 'sdd-engineering@c': [{ scope: 'user' }, record('x')] } };
    assert.equal(findRecord(installed, 'c', path.join(os.tmpdir(), 'p')).scope, 'project');
    assert.equal(findRecord(installed, 'other'), null);
    assert.equal(countMarker('a\n## Assumptions\nb\n## Assumptions and more\n'), 2);
    assert.equal(shaMatches(SHA, SHA.slice(0, 7)), true);
    assert.equal(shaMatches(SHA, 'abc'), false);
  });
});
