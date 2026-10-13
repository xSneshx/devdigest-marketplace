#!/usr/bin/env node
// Aggregates a `claude plugin eval --json` report. ASSUMPTION: the report shape is not
// documented in --help; field names below are read tolerantly and MUST be re-verified at G7
// against a real report. Rule: a case passes at >= 2 of 3 runs (NFR); exit 1 on a failed case,
// exit 2 when the cost cap was hit.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const CLASSES = ['positive', 'negative', 'workflow'];
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function casesOf(report) {
  const list = report.cases ?? report.results ?? report.prompts ?? [];
  return Array.isArray(list) ? list : [];
}
const runsOf = (c) => (Array.isArray(c.runs) ? c.runs : Array.isArray(c.run_results) ? c.run_results : []);
const runCost = (r) => num(r.cost_usd ?? r.costUsd ?? r.cost);
const runPassed = (r, threshold = 1) =>
  typeof r.passed === 'boolean' ? r.passed : num(r.score) >= threshold;

export function totalCost(report) {
  const direct = report.total_cost_usd ?? report.totalCostUsd ?? report.cost_usd;
  if (typeof direct === 'number') return direct;
  return casesOf(report).reduce((s, c) => s + runsOf(c).reduce((a, r) => a + runCost(r), 0), 0);
}

export function classOf(c) {
  const tags = c.tags ?? [];
  return CLASSES.find((k) => tags.includes(k)) ?? 'untagged';
}

export function summarize(report, { cap, exitCode = 0, minPass = 2 } = {}) {
  const classes = {};
  const failed = [];
  for (const c of casesOf(report)) {
    const runs = runsOf(c);
    const wins = runs.filter((r) => runPassed(r)).length;
    const needed = Math.min(minPass, runs.length);
    const pass = runs.length > 0 && wins >= needed;
    const k = classOf(c);
    classes[k] ??= { total: 0, passed: 0 };
    classes[k].total += 1;
    if (pass) classes[k].passed += 1;
    else failed.push({ name: c.name ?? c.id ?? '?', class: k, wins, runs: runs.length });
  }
  const cost = totalCost(report);
  const capHit =
    exitCode === 2 || report.aborted === true || report.cost_cap_hit === true ||
    (typeof cap === 'number' && cost > cap);
  return { classes, failed, cost, capHit, exitCode: capHit ? 2 : failed.length > 0 ? 1 : 0 };
}

export function evidence(plugin, s) {
  const rows = Object.entries(s.classes)
    .map(([k, v]) => `| ${k} | ${v.passed}/${v.total} | ${v.total ? Math.round((100 * v.passed) / v.total) : 0}% |`)
    .join('\n');
  const fails = s.failed.map((f) => `- ${f.name} (${f.class}): ${f.wins}/${f.runs} runs passed`).join('\n') || '- none';
  return `### Eval evidence: ${plugin ?? 'plugin'}\n\n| class | cases passed | rate |\n|---|---|---|\n${rows}\n\nMeasured cost: $${s.cost.toFixed(4)}\nCost cap hit: ${s.capHit}\n\nFailed cases:\n${fails}\n`;
}

function main(argv) {
  const [file, ...rest] = argv;
  if (!file) { console.error('usage: summarize.mjs <report.json> [--cap USD] [--exit-code N] [--plugin name] [--evidence path]'); return 64; }
  const opt = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : undefined; };
  let report;
  try { report = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { console.error(`summarize: cannot read report: ${e.message}`); return 1; }
  const capRaw = opt('--cap');
  const s = summarize(report, { cap: capRaw === undefined ? undefined : Number(capRaw), exitCode: Number(opt('--exit-code') ?? 0) });
  const md = evidence(opt('--plugin'), s);
  const ev = opt('--evidence');
  if (ev) writeFileSync(ev, md);
  console.log(md);
  return s.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
