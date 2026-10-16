import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { summarize, totalCost, mergeReports, pluginOf } from '../../scripts/evals/summarize.mjs';

const fixture = new URL('./fixtures/report.json', import.meta.url);
const report = JSON.parse(readFileSync(fixture, 'utf8'));
const script = fileURLToPath(new URL('../../scripts/evals/summarize.mjs', import.meta.url));

test('real-shaped report: 1/3 cases passed, class from dir prefix, cost includes judge cost', () => {
  const s = summarize(report, { cap: 1.5 });
  assert.deepEqual(s.classes.negative, { total: 1, passed: 1 });
  assert.deepEqual(s.classes.positive, { total: 1, passed: 0 });
  assert.deepEqual(s.classes.workflow, { total: 1, passed: 0 });
  assert.equal(s.exitCode, 1);
  assert.ok(Math.abs(totalCost(report) - 0.4510686) < 1e-6);
  assert.ok(Math.abs(s.cost - 0.4510686) < 1e-6);
});

test('a report over the cap, or a partial one, yields exit 2', () => {
  assert.equal(summarize(report, { cap: 0.3 }).exitCode, 2);
  assert.equal(summarize({ ...report, partial: true }, { cap: 5 }).exitCode, 2);
  const r = spawnSync('node', [script, fileURLToPath(fixture), '--cap', '0.3'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /Cost cap hit: true/);
});

test('an all-green report exits 0; --exit-code 2 marks a CLI cap abort', () => {
  const green = { cases: [{ name: 'a', dir: 'evals/positive-a', arms: { with: [{ passed: true }, { passed: true }] } }] };
  assert.equal(summarize(green, { cap: 1 }).exitCode, 0);
  assert.equal(summarize(green, { cap: 1, exitCode: 2 }).exitCode, 2);
});

test('zero cases, a case-count mismatch or rejected case files exit 2, never 0', () => {
  assert.equal(summarize({ cases: [] }, { cap: 1 }).exitCode, 2);
  assert.match(summarize({ cases: [] }).problems[0], /zero cases/);
  const green = { cases: [{ name: 'a', dir: 'p/evals/positive-a', arms: { with: [{ passed: true }, { passed: true }] } }] };
  assert.equal(summarize(green, { expectCases: 2 }).exitCode, 2);
  assert.equal(summarize(green, { expectCases: 1 }).exitCode, 0);
  assert.equal(summarize(green, { loadFailures: 3 }).exitCode, 2);
});

test('cases map to plugins via case.dir; per-case reports merge', () => {
  const mk = (dir) => ({ cases: [{ name: dir.split('/')[2], dir, arms: { with: [{ passed: true }, { passed: false }, { passed: true }] } }], costUsd: 0.5 });
  const m = mergeReports([mk('arch/evals/positive-x'), mk('code/evals/negative-y')]);
  assert.equal(pluginOf(m.cases[0]), 'arch');
  assert.equal(pluginOf({ dir: 'evals/positive-x' }), null);
  const s = summarize(m, { cap: 5, expectCases: 2 });
  assert.deepEqual(s.plugins, { arch: { total: 1, passed: 1 }, code: { total: 1, passed: 1 } });
  assert.equal(s.exitCode, 0);
  assert.equal(totalCost(m), 1);
});

test('CLI: empty report exits 2; a stdout log with rejected cases exits 2', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ev-'));
  const empty = join(dir, 'r.json'); writeFileSync(empty, JSON.stringify({ cases: [], aggregates: { casesTotal: 0 } }));
  assert.equal(spawnSync('node', [script, empty], { encoding: 'utf8' }).status, 2);
  const log = join(dir, 's.log'); writeFileSync(log, '3 case file(s) failed to load\n');
  const ok = join(dir, 'ok.json');
  writeFileSync(ok, JSON.stringify({ cases: [{ name: 'a', dir: 'p/evals/positive-a', arms: { with: [{ passed: true }] } }] }));
  assert.equal(spawnSync('node', [script, ok], { encoding: 'utf8' }).status, 0);
  assert.equal(spawnSync('node', [script, ok, '--stdout', log], { encoding: 'utf8' }).status, 2);
});
