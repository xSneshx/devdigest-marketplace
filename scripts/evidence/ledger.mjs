// AC-47, AC-48: running budget ledger of every `claude -p` and `claude plugin eval` run.
//   node scripts/evidence/ledger.mjs add --purpose cost-run|eval|capture|other --usd <x> --note <s>
//        [--date YYYY-MM-DD] [--file <ledger.md>]
//   node scripts/evidence/ledger.mjs check --next <cap> [--arm baseline|optimized] [--file <ledger.md>]
// `check` exit codes: 0 ok, 5 total + next > 20 (AC-47 hard limit), 4 baseline run requested with
// total >= 17 (AC-48), 3 total + next > 18 (keeps USD 2 for the switch steps and the smoke eval).
// The checks are evaluated in the order 5, 4, 3.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { main, usd } from './lib/common.mjs';
import { cell } from './lib/redact.mjs';

export const LIMIT = 20;
export const COST_RUN_LIMIT = 18;
export const BASELINE_STOP = 17;
export const PURPOSES = ['cost-run', 'eval', 'capture', 'other'];
const HEADER = '| date | purpose | total_cost_usd | running total | note |';
const DEFAULT_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'release-evidence', 'l08', 'budget-ledger.md');

export function parseLedger(markdown) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cols = line.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim());
    if (cols.length < 5 || !/^\d{4}-\d{2}-\d{2}$/.test(cols[0]) || !Number.isFinite(Number(cols[2]))) continue;
    rows.push({ date: cols[0], purpose: cols[1], usd: Number(cols[2]), running: Number(cols[3]), note: cols[4] });
  }
  return rows;
}

export const totalOf = (rows) => rows.reduce((s, r) => s + r.usd, 0);

export function decide(total, next, arm) {
  if (total + next > LIMIT) return { code: 5, reason: `total ${usd(total)} + next ${usd(next)} exceeds USD ${LIMIT} (AC-47)` };
  if (arm === 'baseline' && total >= BASELINE_STOP) return { code: 4, reason: `total ${usd(total)} reached USD ${BASELINE_STOP}: no further baseline run (AC-48)` };
  if (total + next > COST_RUN_LIMIT) return { code: 3, reason: `total ${usd(total)} + next ${usd(next)} exceeds USD ${COST_RUN_LIMIT}: keep USD 2 for the remaining steps` };
  return { code: 0, reason: 'within budget' };
}

export async function run(argv) {
  const [command, ...rest] = argv;
  const { values } = parseArgs({
    args: rest,
    options: {
      purpose: { type: 'string' }, usd: { type: 'string' }, note: { type: 'string' }, date: { type: 'string' },
      file: { type: 'string' }, next: { type: 'string' }, arm: { type: 'string' },
    },
    strict: true,
  });
  const file = values.file ?? DEFAULT_FILE;
  const text = existsSync(file) ? readFileSync(file, 'utf8') : `${HEADER}\n|---|---|---|---|---|\n`;
  const rows = parseLedger(text);
  const total = totalOf(rows);

  if (command === 'add') {
    const amount = Number(values.usd);
    if (!PURPOSES.includes(values.purpose ?? '')) throw new Error(`--purpose must be one of ${PURPOSES.join(', ')}`);
    if (!Number.isFinite(amount) || amount < 0) throw new Error('--usd must be a non-negative number');
    const date = values.date ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('--date must be YYYY-MM-DD');
    const running = total + amount;
    const row = `| ${date} | ${values.purpose} | ${usd(amount)} | ${usd(running)} | ${cell(values.note ?? '')} |`;
    const body = text.endsWith('\n') ? text : `${text}\n`;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${body}${row}\n`);
    console.log(`ledger: added ${usd(amount)}; running total ${usd(running)} of ${LIMIT}`);
    return 0;
  }
  if (command === 'check') {
    const next = Number(values.next);
    if (!Number.isFinite(next) || next < 0) throw new Error('--next <cap> is required');
    if (values.arm !== undefined && !['baseline', 'optimized'].includes(values.arm)) throw new Error('--arm must be baseline or optimized');
    const verdict = decide(total, next, values.arm);
    console.log(`ledger: running total ${usd(total)}; next ${usd(next)}; ${verdict.reason}`);
    return verdict.code;
  }
  throw new Error('usage: ledger.mjs add|check ...');
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main(() => run(process.argv.slice(2)));
