// AC-39, AC-40, AC-41, AC-42: summarises cost run records (files written by cost-record.mjs).
//   node scripts/evidence/cost-summary.mjs [--smoke pass|fail] <record.md> ...
// Per arm: runs, successes, success rate, total spend, cost per successful run (spend of ALL runs,
// failed ones included, divided by successes; "undefined (0 successes)" when there is none),
// median/min/max cost of successful runs, median duration, per-model share of spend. Then the
// delta, the N decision and the quality-gate inputs.
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { main, median, table, usd } from './lib/common.mjs';

const FENCE = /```json cost-run-data\r?\n([\s\S]*?)\r?\n```/;
export const UNDEFINED = 'undefined (0 successes)';

export function parseRecord(markdown, source = 'record') {
  const m = FENCE.exec(markdown);
  if (!m) throw new Error(`${source}: no cost-run-data block`);
  return JSON.parse(m[1]);
}

export function summarizeArm(runs) {
  const successes = runs.filter((r) => r.successful);
  const total = runs.reduce((s, r) => s + r.total_cost_usd, 0);
  const okCosts = successes.map((r) => r.total_cost_usd);
  const perModel = {};
  for (const r of runs) for (const [model, u] of Object.entries(r.model_usage ?? {})) perModel[model] = (perModel[model] ?? 0) + u.cost_usd;
  const modelTotal = Object.values(perModel).reduce((s, v) => s + v, 0);
  return {
    runs: runs.length,
    successes: successes.length,
    successRate: runs.length ? successes.length / runs.length : null,
    total,
    costPerSuccess: successes.length ? total / successes.length : null,
    median: median(okCosts),
    min: okCosts.length ? Math.min(...okCosts) : null,
    max: okCosts.length ? Math.max(...okCosts) : null,
    medianDurationS: median(runs.map((r) => r.duration_ms / 1000)),
    share: Object.fromEntries(Object.entries(perModel).map(([m, v]) => [m, modelTotal ? v / modelTotal : 0])),
    baselineSpread: okCosts.length ? Math.max(...okCosts) - Math.min(...okCosts) : null,
  };
}

/** AC-39: after two baseline runs N=2 if both exceed USD 3, N=3 if both are at most 3, else run B3. */
export function nDecision(baselineRuns) {
  const costs = baselineRuns.map((r) => r.total_cost_usd);
  if (costs.length < 2) return 'pending: fewer than two baseline runs';
  if (costs.length === 2) {
    if (costs.every((c) => c > 3)) return 'N=2 (both baseline runs exceed USD 3)';
    if (costs.every((c) => c <= 3)) return 'N=3 (both baseline runs are at most USD 3)';
    return 'undecided: the two baseline runs straddle USD 3, run B3 and decide on the median';
  }
  return median(costs) > 3 ? 'N=2 (median baseline run exceeds USD 3)' : 'N=3 (median baseline run is at most USD 3)';
}

export function qualityGate(base, opt, optRuns, smoke) {
  const rateOk = base.successRate !== null && opt.successRate !== null && opt.successRate >= base.successRate;
  const everyOk = optRuns.filter((r) => r.successful).every((r) => Object.values(r.checklist ?? {}).every(Boolean));
  return {
    successRate: rateOk,
    everySuccessfulMeetsAc38: everyOk,
    smokeEval: smoke === undefined ? 'not provided' : smoke === 'pass',
    pass: rateOk && everyOk && smoke === 'pass' && opt.successes > 0,
  };
}

const cps = (a) => (a.costPerSuccess === null ? UNDEFINED : `USD ${usd(a.costPerSuccess)}`);
const pct = (v) => (v === null ? 'n/a' : `${(v * 100).toFixed(1)} %`);
const usdOrNa = (v) => (v === null ? 'n/a' : usd(v));

export function render(records, smoke) {
  const arms = { baseline: [], optimized: [] };
  for (const r of records) arms[r.arm]?.push(r);
  const base = summarizeArm(arms.baseline);
  const opt = summarizeArm(arms.optimized);
  const row = (label, a) => [
    label, a.runs, a.successes, pct(a.successRate), usd(a.total), cps(a),
    usdOrNa(a.median), usdOrNa(a.min), usdOrNa(a.max), a.medianDurationS === null ? 'n/a' : `${Math.round(a.medianDurationS)} s`,
  ];
  const lines = [
    '## Results',
    '',
    table(['arm', 'runs', 'successes', 'success rate', 'total spend USD', 'cost per successful run', 'median (successful)', 'min', 'max', 'median duration'],
      [row('baseline', base), row('optimized', opt)]),
    '',
  ];
  if (base.costPerSuccess !== null && opt.costPerSuccess !== null) {
    const delta = opt.costPerSuccess - base.costPerSuccess;
    lines.push(`Delta (optimized - baseline): USD ${delta.toFixed(4)} (${((delta / base.costPerSuccess) * 100).toFixed(1)} %).`);
    if (base.baselineSpread !== null && Math.abs(delta) < base.baselineSpread) lines.push('The difference is smaller than the baseline min-max spread: within noise.');
  } else {
    lines.push(`Delta: undefined (baseline ${cps(base)}, optimized ${cps(opt)}).`);
    if (opt.costPerSuccess === null) lines.push('The optimized arm has no successful run: optimization not adopted (AC-41).');
  }
  lines.push('', '### Per-model share of spend', '');
  const models = [...new Set([...Object.keys(base.share), ...Object.keys(opt.share)])];
  lines.push(table(['model', 'baseline', 'optimized'], models.map((m) => [m, pct(base.share[m] ?? null), pct(opt.share[m] ?? null)])));
  const gate = qualityGate(base, opt, arms.optimized, smoke);
  lines.push(
    '', '### Run count (AC-39)', '', nDecision(arms.baseline),
    '', '### Quality gate inputs (AC-42)', '',
    table(['criterion', 'result'], [
      ['optimized success rate >= baseline success rate', gate.successRate ? 'pass' : 'fail'],
      ['every successful optimized run meets AC-38', gate.everySuccessfulMeetsAc38 ? 'pass' : 'fail'],
      ['smoke eval case with the optimization applied', gate.smokeEval === true ? 'pass' : gate.smokeEval === false ? 'fail' : 'not provided'],
      ['**gate**', gate.pass ? '**pass**' : '**not passed**'],
    ]),
    '',
  );
  return { text: lines.join('\n'), base, opt, gate };
}

export async function run(argv) {
  const { values, positionals } = parseArgs({ args: argv, options: { smoke: { type: 'string' } }, allowPositionals: true, strict: true });
  if (positionals.length === 0) throw new Error('give at least one record file');
  if (values.smoke !== undefined && !['pass', 'fail'].includes(values.smoke)) throw new Error('--smoke must be pass or fail');
  const records = positionals.map((f) => parseRecord(readFileSync(f, 'utf8'), f));
  console.log(render(records, values.smoke).text);
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main(() => run(process.argv.slice(2)));
