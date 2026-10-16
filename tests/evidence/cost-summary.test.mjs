import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nDecision, qualityGate, render, summarizeArm, UNDEFINED } from '../../scripts/evidence/cost-summary.mjs';

const run = (arm, cost, successful = true, models = { opus: cost * 0.8, sonnet: cost * 0.2 }) => ({
  arm, total_cost_usd: cost, successful, duration_ms: 60000,
  model_usage: Object.fromEntries(Object.entries(models).map(([m, c]) => [m, { cost_usd: c }])),
  checklist: { test_passes: successful, cap_not_hit: true },
});

describe('cost-summary', () => {
  it('computes cost per successful run over all spend, failed runs included', () => {
    const arm = summarizeArm([run('baseline', 2), run('baseline', 3, false), run('baseline', 4)]);
    assert.equal(arm.runs, 3);
    assert.equal(arm.successes, 2);
    assert.equal(arm.total, 9);
    assert.equal(arm.costPerSuccess, 4.5);
    assert.equal(arm.median, 3);
    assert.equal(arm.min, 2);
    assert.equal(arm.max, 4);
    assert.ok(Math.abs(arm.share.opus - 0.8) < 1e-9);
  });

  it('reports "undefined (0 successes)" and not adopted when an arm has no success (AC-41)', () => {
    const { text, base, opt } = render([run('baseline', 2), run('optimized', 1, false)], 'pass');
    assert.equal(opt.costPerSuccess, null);
    assert.equal(base.costPerSuccess, 2);
    assert.ok(text.includes(UNDEFINED));
    assert.match(text, /optimization not adopted \(AC-41\)/);
  });

  it('prints the delta, the quality gate and the N decision', () => {
    const records = [run('baseline', 3.5), run('baseline', 3.2), run('optimized', 1.4), run('optimized', 1.6)];
    const { text, gate } = render(records, 'pass');
    assert.match(text, /Delta \(optimized - baseline\): USD -1\.8500 \(-55\.2 %\)/);
    assert.equal(gate.pass, true);
    assert.match(text, /N=2 \(both baseline runs exceed USD 3\)/);
    assert.equal(render(records, 'fail').gate.pass, false);
    assert.equal(render(records).gate.pass, false);

    assert.equal(nDecision([run('baseline', 1)]).startsWith('pending'), true);
    assert.match(nDecision([run('baseline', 1), run('baseline', 2)]), /^N=3/);
    assert.match(nDecision([run('baseline', 1), run('baseline', 4)]), /^undecided/);
    assert.match(nDecision([run('baseline', 1), run('baseline', 4), run('baseline', 5)]), /^N=2/);

    const lower = qualityGate(summarizeArm([run('b', 1), run('b', 1)]), summarizeArm([run('o', 1), run('o', 1, false)]), [], 'pass');
    assert.equal(lower.successRate, false);
  });
});
