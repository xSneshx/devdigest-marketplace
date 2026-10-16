// AC-37, AC-38: turns one cost run's `--output-format stream-json --verbose` output into a *Cost
// run record* (Markdown + one fenced JSON data block) and runs the success checklist itself in the
// run's checkout; nothing is taken from the model's claim (Errata E-3: cost and usage come from
// the final `result` event, plugin paths from `system/init`).
//   node scripts/evidence/cost-record.mjs --run-id <id> --arm baseline|optimized --base <sha>
//        --checkout <dir> --cap <usd> --task-file <file> [--output <file>] [--model <name>]
//        [--protected <path>] [--date YYYY-MM-DD]
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { findInit, findResult, main, parseMessages, readInput, table, usd } from './lib/common.mjs';
import { redact, redactValue } from './lib/redact.mjs';

const NUM = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function modelUsageOf(result) {
  const out = {};
  for (const [model, u] of Object.entries(result?.modelUsage ?? {})) {
    out[model] = {
      cost_usd: NUM(u.costUSD ?? u.cost_usd),
      input_tokens: NUM(u.inputTokens ?? u.input_tokens),
      output_tokens: NUM(u.outputTokens ?? u.output_tokens),
      cache_read_tokens: NUM(u.cacheReadInputTokens ?? u.cache_read_input_tokens),
      cache_creation_tokens: NUM(u.cacheCreationInputTokens ?? u.cache_creation_input_tokens),
    };
  }
  return out;
}

/** `<cache>/<catalog>/<plugin>/<version>` -> parts, or null. */
export function pluginPathParts(p) {
  const parts = String(p ?? '').replace(/\\/g, '/').replace(/\/+$/, '').split('/');
  if (parts.length < 3) return null;
  const [catalog, name, version] = parts.slice(-3);
  return { catalog, name, version };
}

const text = (content) =>
  typeof content === 'string' ? content : Array.isArray(content) ? content.map((c) => c?.text ?? '').join('\n') : '';

/** Verdict of the plan-verifier subagent call, read from its tool_result (not the final message). */
export function verifierVerdict(messages) {
  const ids = new Set();
  for (const m of messages) {
    for (const block of m?.message?.content ?? []) {
      if (block?.type === 'tool_use' && ['Agent', 'Task'].includes(block.name) && String(block.input?.subagent_type ?? '').endsWith('plan-verifier')) {
        ids.add(block.id);
      }
    }
  }
  let verdict = null;
  for (const m of messages) {
    if (!Array.isArray(m?.message?.content)) continue;
    for (const block of m.message.content) {
      if (block?.type !== 'tool_result' || !ids.has(block.tool_use_id)) continue;
      const body = text(block.content);
      const line = body.split(/\r?\n/).find((l) => /verdict/i.test(l) && /\b(INCOMPLETE|COMPLETE|PARTIAL|BLOCKED)\b/.test(l));
      const hit = line?.match(/\b(INCOMPLETE|COMPLETE|PARTIAL|BLOCKED)\b/);
      if (hit) verdict = hit[1];
    }
  }
  return verdict;
}

const defaultExec = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });

function gitLines(exec, dir, args) {
  const r = exec('git', ['-C', dir, ...args], dir);
  return r.status === 0 ? r.stdout.split('\n').filter(Boolean) : [];
}

/** New or changed files since `base` under `prefix` (untracked included). */
function changedUnder(exec, dir, base, prefix) {
  const files = new Set([
    ...gitLines(exec, dir, ['ls-files', '--others', '--exclude-standard', '--', prefix]),
    ...gitLines(exec, dir, ['diff', '--name-only', '--diff-filter=AM', base, '--', prefix]),
  ]);
  return [...files].sort();
}

export function checklist({ messages, result, checkout, base, cap, protectedPath, exec = defaultExec, read = (f) => readFileSync(f, 'utf8') }) {
  const checks = {};
  const notes = [];

  const specs = changedUnder(exec, checkout, base, 'specs').filter((f) => f.endsWith('.md'));
  const specIds = new Set();
  for (const f of specs) {
    for (const id of read(path.join(checkout, f)).match(/\bAC-\d+\b/g) ?? []) specIds.add(id);
  }
  checks.spec_with_ac_ids = specIds.size > 0;

  const plans = changedUnder(exec, checkout, base, 'docs/plans').filter((f) => f.endsWith('.md'));
  checks.plan_cites_ac_ids = plans.some((f) => (read(path.join(checkout, f)).match(/\bAC-\d+\b/g) ?? []).some((id) => specIds.has(id)));

  checks.test_passes = exec('npm', ['test'], checkout).status === 0;
  checks.typecheck_passes = exec('npm', ['run', 'typecheck'], checkout).status === 0;

  const verdict = verifierVerdict(messages);
  checks.verifier_complete = verdict === 'COMPLETE';
  if (verdict === null) notes.push('no plan-verifier verdict found in a tool_result');

  const diff = exec('git', ['-C', checkout, 'diff', '--quiet', base, '--', protectedPath], checkout);
  const untracked = gitLines(exec, checkout, ['ls-files', '--others', '--exclude-standard', '--', protectedPath]);
  checks.protected_path_untouched = diff.status === 0 && untracked.length === 0;

  const cost = NUM(result?.total_cost_usd);
  const budgetHit = /budget/i.test(String(result?.subtype ?? ''));
  checks.cap_not_hit = result !== null && !budgetHit && cost < cap;
  if (result === null) notes.push('no result event in the output');

  return { checks, successful: Object.values(checks).every(Boolean), verdict, specs, plans, notes };
}

export function buildRecord({ opts, messages, taskText, checkoutResult, now }) {
  const init = findInit(messages);
  const result = findResult(messages);
  const plugins = (init?.plugins ?? []).map((p) => ({ name: p.name, path: redact(p.path ?? ''), ...(pluginPathParts(p.path) ?? {}) }));
  const sdd = plugins.find((p) => p.name === 'sdd-engineering');
  return {
    run_id: opts.runId,
    arm: opts.arm,
    date: now,
    base_sha: opts.base,
    task_sha256: createHash('sha256').update(taskText).digest('hex'),
    main_model: init?.model ?? opts.model ?? 'unknown',
    cap_usd: opts.cap,
    channel: sdd?.catalog ?? 'unknown',
    plugins: plugins.map(({ name, version, catalog, path: p }) => ({ name, version, catalog, path: p })),
    plugin_errors: init?.plugin_errors ?? [],
    result_subtype: result?.subtype ?? null,
    total_cost_usd: NUM(result?.total_cost_usd),
    model_usage: modelUsageOf(result),
    num_turns: NUM(result?.num_turns),
    duration_ms: NUM(result?.duration_ms),
    checklist: checkoutResult.checks,
    verifier_verdict: checkoutResult.verdict,
    successful: checkoutResult.successful,
    notes: checkoutResult.notes,
  };
}

export function renderRecord(r) {
  const yn = (b) => (b ? 'yes' : 'no');
  return [
    '---',
    `run_id: ${r.run_id}`,
    `arm: ${r.arm}`,
    `date: ${r.date}`,
    `base_sha: ${r.base_sha}`,
    `task_sha256: ${r.task_sha256}`,
    `main_model: ${r.main_model}`,
    `channel: ${r.channel}`,
    `successful: ${yn(r.successful)}`,
    '---',
    '',
    `# Cost run ${r.run_id} (${r.arm})`,
    '',
    `Total cost: USD ${usd(r.total_cost_usd)} (cap USD ${r.cap_usd}); ${r.num_turns} turns; ${Math.round(r.duration_ms / 1000)} s; result subtype ${r.result_subtype ?? 'none'}.`,
    '',
    '## modelUsage',
    '',
    table(['model', 'cost USD', 'input', 'output', 'cache read', 'cache creation'],
      Object.entries(r.model_usage).map(([m, u]) => [m, usd(u.cost_usd), u.input_tokens, u.output_tokens, u.cache_read_tokens, u.cache_creation_tokens])),
    '',
    '## Plugins loaded (system/init)',
    '',
    table(['plugin', 'version', 'catalog'], r.plugins.map((p) => [p.name, p.version ?? '', p.catalog ?? ''])),
    '',
    `plugin_errors: ${JSON.stringify(r.plugin_errors)}`,
    '',
    '## Success checklist (AC-38)',
    '',
    table(['check', 'result'], [
      ['spec with AC ids exists', yn(r.checklist.spec_with_ac_ids)],
      ['plan cites those ids', yn(r.checklist.plan_cites_ac_ids)],
      ['`test` passes', yn(r.checklist.test_passes)],
      ['`typecheck` passes', yn(r.checklist.typecheck_passes)],
      [`verifier verdict COMPLETE (found: ${r.verifier_verdict ?? 'none'})`, yn(r.checklist.verifier_complete)],
      ['protected path untouched', yn(r.checklist.protected_path_untouched)],
      ['spend cap not hit', yn(r.checklist.cap_not_hit)],
      ['**successful**', `**${yn(r.successful)}**`],
    ]),
    '',
    `Notes: ${r.notes.length ? r.notes.join('; ') : 'none'}`,
    '',
    '```json cost-run-data',
    JSON.stringify(redactValue(r), null, 2),
    '```',
    '',
  ].join('\n');
}

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'run-id': { type: 'string' }, arm: { type: 'string' }, base: { type: 'string' }, checkout: { type: 'string' },
      cap: { type: 'string' }, 'task-file': { type: 'string' }, output: { type: 'string' }, model: { type: 'string' },
      protected: { type: 'string', default: 'src/generated' }, date: { type: 'string' },
    },
    strict: true,
  });
  for (const key of ['run-id', 'arm', 'base', 'checkout', 'cap', 'task-file']) {
    if (!values[key]) throw new Error(`--${key} is required`);
  }
  if (!['baseline', 'optimized'].includes(values.arm)) throw new Error('--arm must be baseline or optimized');
  const cap = Number(values.cap);
  if (!(cap > 0)) throw new Error('--cap must be a positive number');
  const messages = parseMessages(readInput(values.output));
  const result = findResult(messages);
  const checkoutResult = checklist({ messages, result, checkout: values.checkout, base: values.base, cap, protectedPath: values.protected });
  const record = buildRecord({
    opts: { runId: values['run-id'], arm: values.arm, base: values.base, cap, model: values.model },
    messages,
    taskText: readFileSync(values['task-file'], 'utf8'),
    checkoutResult,
    now: values.date ?? new Date().toISOString().slice(0, 10),
  });
  process.stdout.write(renderRecord(record));
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main(() => run(process.argv.slice(2)));
