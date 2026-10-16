import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { decide, parseLedger, run, totalOf } from '../../scripts/evidence/ledger.mjs';

const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tmpFile = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ledger-'));
  dirs.push(dir);
  return path.join(dir, 'budget-ledger.md');
};
const quiet = async (fn) => {
  const log = console.log;
  console.log = () => {};
  try { return await fn(); } finally { console.log = log; }
};
const add = (file, usd, purpose = 'cost-run') => quiet(() => run(['add', '--file', file, '--purpose', purpose, '--usd', String(usd), '--note', 'a | b', '--date', '2026-10-16']));
const check = (file, next, arm) => quiet(() => run(['check', '--file', file, '--next', String(next), ...(arm ? ['--arm', arm] : [])]));

describe('ledger', () => {
  it('appends rows with a running total and ignores the header and the placeholder row', async () => {
    const file = tmpFile();
    await add(file, 1.25);
    await add(file, 0.5, 'eval');
    const rows = parseLedger(readFileSync(file, 'utf8'));
    assert.equal(rows.length, 2);
    assert.equal(totalOf(rows), 1.75);
    assert.equal(rows[1].running, 1.75);
    assert.equal(rows[1].note, 'a \\| b');
    assert.deepEqual(parseLedger('| date | purpose | total_cost_usd | running total | note |\n|---|---|---|---|---|\n| | | | | |\n'), []);
    await assert.rejects(() => add(file, 1, 'bogus'), /--purpose/);
  });

  it('exits 5, 4 and 3 on the three budget rules and 0 within budget', async () => {
    const file = tmpFile();
    assert.equal(await check(file, 4, 'baseline'), 0);
    await add(file, 13);
    assert.equal(await check(file, 4, 'baseline'), 0); // 17.0 is the limit of the first rule's room
    assert.equal(await check(file, 5, 'optimized'), 0); // 18.0 reached exactly is allowed
    assert.equal(await check(file, 5.5, 'optimized'), 3); // above 18.0 is not
    await add(file, 4);
    assert.equal(await check(file, 0.5, 'baseline'), 4); // total 17: no further baseline run
    assert.equal(await check(file, 0.5, 'optimized'), 0);
    assert.equal(await check(file, 1.5, 'optimized'), 3);
    assert.equal(await check(file, 3.5, 'optimized'), 5);
    assert.equal(decide(15, 3, 'baseline').code, 0);
    assert.equal(decide(15, 3.01, 'baseline').code, 3);
    assert.equal(decide(0, 20.01, undefined).code, 5);
  });
});
