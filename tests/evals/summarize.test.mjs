import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { summarize } from '../../scripts/evals/summarize.mjs';

const fixture = new URL('./fixtures/report.json', import.meta.url);
const report = JSON.parse(readFileSync(fixture, 'utf8'));
const script = fileURLToPath(new URL('../../scripts/evals/summarize.mjs', import.meta.url));

test('applies the 2-of-3 rule per class and reports measured cost', () => {
  const s = summarize(report, { cap: 10 });
  assert.deepEqual(s.classes.positive, { total: 1, passed: 1 });
  assert.deepEqual(s.classes.negative, { total: 1, passed: 1 });
  assert.deepEqual(s.classes.workflow, { total: 1, passed: 0 });
  assert.equal(s.failed[0].name, 'refactor');
  assert.equal(s.exitCode, 1);
  assert.ok(Math.abs(s.cost - 0.81) < 1e-9);
});

test('a fixture over the cap yields a non-zero exit (2)', () => {
  const s = summarize(report, { cap: 0.5 });
  assert.equal(s.capHit, true);
  assert.equal(s.exitCode, 2);
  const r = spawnSync('node', [script, fileURLToPath(fixture), '--cap', '0.5'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /Cost cap hit: true/);
});

test('all-green report exits 0; CLI exit code 2 marks a cap abort', () => {
  const green = { cases: [{ name: 'a', tags: ['positive'], runs: [{ score: 1 }, { score: 1 }, { score: 1 }] }] };
  assert.equal(summarize(green, { cap: 1 }).exitCode, 0);
  assert.equal(summarize(green, { cap: 1, exitCode: 2 }).exitCode, 2);
});
