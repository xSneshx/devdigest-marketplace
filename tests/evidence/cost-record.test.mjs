import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildRecord, checklist, modelUsageOf, pluginPathParts, renderRecord, verifierVerdict } from '../../scripts/evidence/cost-record.mjs';
import { findResult, parseMessages } from '../../scripts/evidence/lib/common.mjs';
import { parseRecord } from '../../scripts/evidence/cost-summary.mjs';

const dirs = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, '-c', 'user.name=t', '-c', 'user.email=t@users.noreply.github.com', ...args], { encoding: 'utf8' });

/** A consumer-like checkout with a committed base; `scripts` are the package.json scripts. */
function checkout(scripts = { test: 'node -e 0', typecheck: 'node -e 0' }) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cost-checkout-'));
  dirs.push(dir);
  git(dir, 'init', '-q');
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'c', private: true, scripts }));
  mkdirSync(path.join(dir, 'src', 'generated'), { recursive: true });
  writeFileSync(path.join(dir, 'src', 'generated', 'g.ts'), 'export const g = 1;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  return { dir, base: git(dir, 'rev-parse', 'HEAD').trim() };
}
function addArtifacts(dir, { specText = 'AC-1: it works\n', planText = 'covers AC-1\n' } = {}) {
  mkdirSync(path.join(dir, 'specs'), { recursive: true });
  mkdirSync(path.join(dir, 'docs', 'plans'), { recursive: true });
  writeFileSync(path.join(dir, 'specs', 's.md'), specText);
  writeFileSync(path.join(dir, 'docs', 'plans', 'p.md'), planText);
}

const cache = (catalog, plugin, version) => path.join(os.homedir(), '.claude', 'plugins', 'cache', catalog, plugin, version);
const stream = ({ verdict = 'Verdict: COMPLETE', cost = 1.5, subtype = 'success' } = {}) => [
  { type: 'system', subtype: 'init', model: 'claude-opus', plugins: [{ name: 'sdd-engineering', path: cache('devdigest-marketplace-stable', 'sdd-engineering', '1.0.0') }], plugin_errors: [] },
  { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'tu1', name: 'Agent', input: { subagent_type: 'sdd-engineering:plan-verifier' } }] } },
  { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu1', content: [{ type: 'text', text: `report\n${verdict}\n` }] }] } },
  {
    type: 'result', subtype, total_cost_usd: cost, num_turns: 12, duration_ms: 90000,
    modelUsage: { 'claude-opus': { costUSD: cost - 0.5, inputTokens: 10, outputTokens: 20, cacheReadInputTokens: 30, cacheCreationInputTokens: 40 }, 'claude-sonnet': { costUSD: 0.5, inputTokens: 1, outputTokens: 2 } },
  },
];

describe('cost-record', () => {
  it('parses usage and the verifier verdict from the tool_result, and path parts from init', () => {
    const messages = stream();
    assert.equal(verifierVerdict(messages), 'COMPLETE');
    assert.equal(verifierVerdict(stream({ verdict: 'Verdict: INCOMPLETE' })), 'INCOMPLETE');
    assert.equal(verifierVerdict(stream().filter((m) => m.type !== 'user')), null);
    assert.deepEqual(modelUsageOf(findResult(messages))['claude-sonnet'], { cost_usd: 0.5, input_tokens: 1, output_tokens: 2, cache_read_tokens: 0, cache_creation_tokens: 0 });
    assert.deepEqual(pluginPathParts(cache('c', 'p', '1.0.0')), { catalog: 'c', name: 'p', version: '1.0.0' });
    assert.equal(parseMessages(messages.map((m) => JSON.stringify(m)).join('\n')).length, 4);
  });

  it('marks a run successful only when every AC-38 check holds, run in the checkout', () => {
    const { dir, base } = checkout();
    addArtifacts(dir);
    const messages = stream();
    const common = { messages, result: findResult(messages), checkout: dir, base, cap: 4, protectedPath: 'src/generated' };
    const ok = checklist(common);
    assert.deepEqual(ok.checks, {
      spec_with_ac_ids: true, plan_cites_ac_ids: true, test_passes: true, typecheck_passes: true,
      verifier_complete: true, protected_path_untouched: true, cap_not_hit: true,
    });
    assert.equal(ok.successful, true);

    assert.equal(checklist({ ...common, cap: 1 }).checks.cap_not_hit, false);
    const budget = stream({ subtype: 'error_max_budget_usd', cost: 0.2 });
    assert.equal(checklist({ ...common, messages: budget, result: findResult(budget) }).checks.cap_not_hit, false);
    const incomplete = stream({ verdict: 'Verdict: INCOMPLETE' });
    assert.equal(checklist({ ...common, messages: incomplete, result: findResult(incomplete) }).successful, false);

    writeFileSync(path.join(dir, 'docs', 'plans', 'p.md'), 'cites AC-9 only\n');
    assert.equal(checklist(common).checks.plan_cites_ac_ids, false);
    writeFileSync(path.join(dir, 'specs', 's.md'), 'no ids here\n');
    assert.equal(checklist(common).checks.spec_with_ac_ids, false);

    writeFileSync(path.join(dir, 'src', 'generated', 'g.ts'), 'export const g = 2;\n');
    assert.equal(checklist(common).checks.protected_path_untouched, false);
    writeFileSync(path.join(dir, 'src', 'generated', 'g.ts'), 'export const g = 1;\n');
    writeFileSync(path.join(dir, 'src', 'generated', 'new.ts'), 'x\n');
    assert.equal(checklist(common).checks.protected_path_untouched, false);
  });

  it('fails the test and typecheck checks on a non-zero exit and renders a record that the summary can parse', () => {
    const { dir, base } = checkout({ test: 'node -e "process.exit(1)"', typecheck: 'node -e "process.exit(2)"' });
    addArtifacts(dir);
    const messages = stream();
    const outcome = checklist({ messages, result: findResult(messages), checkout: dir, base, cap: 4, protectedPath: 'src/generated' });
    assert.equal(outcome.checks.test_passes, false);
    assert.equal(outcome.checks.typecheck_passes, false);
    assert.equal(outcome.successful, false);

    const record = buildRecord({ opts: { runId: 'B1', arm: 'baseline', base, cap: 4 }, messages, taskText: 'task', checkoutResult: outcome, now: '2026-10-16' });
    assert.equal(record.channel, 'devdigest-marketplace-stable');
    assert.equal(record.total_cost_usd, 1.5);
    const md = renderRecord(record);
    assert.equal(md.includes(os.homedir()), false);
    const parsed = parseRecord(md);
    assert.equal(parsed.run_id, 'B1');
    assert.equal(parsed.successful, false);
    assert.equal(parsed.task_sha256.length, 64);
  });

  it('runs end to end from the command line', () => {
    const { dir, base } = checkout();
    addArtifacts(dir);
    const work = mkdtempSync(path.join(os.tmpdir(), 'cost-io-'));
    dirs.push(work);
    writeFileSync(path.join(work, 'out.jsonl'), stream().map((m) => JSON.stringify(m)).join('\n'));
    writeFileSync(path.join(work, 'task.txt'), 'the fixed task\n');
    const script = fileURLToPath(new URL('../../scripts/evidence/cost-record.mjs', import.meta.url));
    const r = spawnSync(process.execPath, [script, '--run-id', 'B1', '--arm', 'baseline', '--base', base, '--checkout', dir, '--cap', '4', '--task-file', path.join(work, 'task.txt'), '--output', path.join(work, 'out.jsonl'), '--date', '2026-10-16'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /successful: yes/);
    assert.match(r.stdout, /\*\*successful\*\* \| \*\*yes\*\*/);
  });
});
