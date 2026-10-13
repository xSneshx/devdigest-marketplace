#!/usr/bin/env node
// Aggregates a `claude plugin eval --json` report (shape verified against a real CLI 2.1.296 report). Rule: a case passes at >= 2 of 3 runs (NFR); exit 1 on a failed case,
// exit 2 when the cost cap was hit, when zero cases ran, when fewer cases ran than expected, or when the CLI rejected case files.
// Cases are mapped to plugins via `case.dir` (`<plugin>/evals/<case>` when the CLI ran against `plugins/`).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CLASSES = ['positive', 'negative', 'workflow'];
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function casesOf(report) {
  return Array.isArray(report.cases) ? report.cases : [];
}
// Real report (CLI 2.1.296): case.arms.with[] / .without[]; the "with" arm is the scored one.
const runsOf = (c) => (Array.isArray(c.arms?.with) ? c.arms.with : []);
const runPassed = (r) => r.passed === true;

// Top-level costUsd sums run costUsd only; LLM-grader (judge) cost is reported separately.
export function totalCost(report) {
  let judge = 0;
  let runs = 0;
  for (const c of casesOf(report)) {
    for (const arm of Object.values(c.arms ?? {})) {
      for (const r of arm) { judge += num(r.judgeCostUsd); runs += num(r.costUsd); }
    }
  }
  return (typeof report.costUsd === 'number' ? report.costUsd : runs) + judge;
}

// Class: the prompt.md frontmatter `tags` (read from suite.root + case dir when that file exists),
// else the case dir prefix (`positive-`, `negative-`, `workflow-`). The report carries no tags field.
export function classOf(c, root) {
  let tags = [];
  try {
    if (root && c.dir) {
      const m = /^tags:\s*\[(.*?)\]/m.exec(readFileSync(join(root, c.dir, 'prompt.md'), 'utf8'));
      if (m) tags = m[1].split(',').map((t) => t.trim());
    }
  } catch { /* fall back to the dir prefix */ }
  const base = String(c.dir ?? c.name ?? '').split('/').pop();
  return CLASSES.find((k) => tags.includes(k)) ?? CLASSES.find((k) => base.startsWith(`${k}-`)) ?? 'untagged';
}

export function pluginOf(c) {
  const seg = String(c.dir ?? '').split('/');
  return seg.length >= 3 && seg[1] === 'evals' ? seg[0] : null;
}

// Merge several per-case reports (one CLI invocation per case) into one report.
export function mergeReports(reports) {
  const costs = reports.map((r) => (typeof r.costUsd === 'number' ? r.costUsd : null));
  return {
    suite: reports[0]?.suite,
    cases: reports.flatMap(casesOf),
    costUsd: costs.every((x) => x !== null) && costs.length ? costs.reduce((a, b) => a + b, 0) : undefined,
    partial: reports.some((r) => r.partial === true),
  };
}

export function summarize(report, { cap, exitCode = 0, minPass = 2, expectCases, loadFailures = 0 } = {}) {
  const classes = {};
  const plugins = {};
  const failed = [];
  for (const c of casesOf(report)) {
    const runs = runsOf(c);
    const wins = runs.filter((r) => runPassed(r)).length;
    const needed = Math.min(minPass, runs.length);
    const pass = runs.length > 0 && wins >= needed;
    const k = classOf(c, report.suite?.root);
    classes[k] ??= { total: 0, passed: 0 };
    classes[k].total += 1;
    const pl = (plugins[pluginOf(c) ?? '?'] ??= { total: 0, passed: 0 });
    pl.total += 1;
    if (pass) { classes[k].passed += 1; pl.passed += 1; }
    else failed.push({ name: c.name ?? c.id ?? '?', class: k, wins, runs: runs.length });
  }
  const cost = totalCost(report);
  const capHit =
    exitCode === 2 || report.partial === true ||
    (typeof cap === 'number' && cost > cap);
  const casesTotal = casesOf(report).length;
  const problems = [];
  if (casesTotal === 0) problems.push('zero cases ran');
  if (typeof expectCases === 'number' && casesTotal !== expectCases) problems.push(`expected ${expectCases} cases, got ${casesTotal}`);
  if (loadFailures > 0) problems.push(`${loadFailures} case file(s) rejected by the CLI`);
  return { classes, plugins, failed, cost, capHit, casesTotal, problems, exitCode: capHit || problems.length ? 2 : failed.length > 0 ? 1 : 0 };
}

export function evidence(plugin, s) {
  const rows = Object.entries(s.classes)
    .map(([k, v]) => `| ${k} | ${v.passed}/${v.total} | ${v.total ? Math.round((100 * v.passed) / v.total) : 0}% |`)
    .join('\n');
  const fails = s.failed.map((f) => `- ${f.name} (${f.class}): ${f.wins}/${f.runs} runs passed`).join('\n') || '- none';
  const prow = Object.entries(s.plugins ?? {}).map(([k, v]) => `${k} ${v.passed}/${v.total}`).join(', ') || 'none';
  const probs = (s.problems ?? []).map((x) => `- ${x}`).join('\n') || '- none';
  return `### Eval evidence: ${plugin ?? 'plugin'}\n\nCases run: ${s.casesTotal ?? 0} (${prow})\nRun problems (exit 2):\n${probs}\n\n| class | cases passed | rate |\n|---|---|---|\n${rows}\n\nMeasured cost: $${s.cost.toFixed(4)}\nCost cap hit: ${s.capHit}\n\nFailed cases:\n${fails}\n`;
}

function main(argv) {
  const first = argv.findIndex((a) => a.startsWith('--'));
  const files = first === -1 ? argv : argv.slice(0, first);
  const rest = first === -1 ? [] : argv.slice(first);
  if (!files.length) { console.error('usage: summarize.mjs <report.json...> [--cap USD] [--exit-code N] [--plugin name] [--evidence path] [--expect-cases N] [--stdout log...] [--print-cost]'); return 64; }
  const opt = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : undefined; };
  const reports = [];
  for (const f of files) {
    try { reports.push(JSON.parse(readFileSync(f, 'utf8'))); }
    catch (e) { console.error(`summarize: cannot read report ${f}: ${e.message}`); return 2; }
  }
  const report = reports.length === 1 ? reports[0] : mergeReports(reports);
  if (rest.includes('--print-cost')) { console.log(totalCost(report)); return 0; }
  let loadFailures = 0;
  const si = rest.indexOf('--stdout');
  if (si >= 0) {
    for (const f of rest.slice(si + 1).filter((a) => !a.startsWith('--'))) {
      try { const m = /(\d+) case file\(s\) failed to load/.exec(readFileSync(f, 'utf8')); if (m) loadFailures += Number(m[1]); } catch { /* no log */ }
    }
  }
  const capRaw = opt('--cap');
  const expRaw = opt('--expect-cases');
  const s = summarize(report, {
    cap: capRaw === undefined ? undefined : Number(capRaw),
    exitCode: Number(opt('--exit-code') ?? 0),
    expectCases: expRaw === undefined ? undefined : Number(expRaw),
    loadFailures,
  });
  const md = evidence(opt('--plugin'), s);
  const ev = opt('--evidence');
  if (ev) writeFileSync(ev, md);
  console.log(md);
  return s.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
