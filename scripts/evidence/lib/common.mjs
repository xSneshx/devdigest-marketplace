// Shared helpers of the evidence scripts: input reading, stream-json parsing, small Markdown output.
import { readFileSync } from 'node:fs';
import { cell } from './redact.mjs';

export const CATALOG = Object.freeze({ latest: 'devdigest-marketplace', stable: 'devdigest-marketplace-stable' });
export const PLUGINS = Object.freeze([
  'engineering-paved-path',
  'research-tools',
  'architecture-review',
  'code-agents',
  'sdd-engineering',
]);
export const SDD_VERSION = Object.freeze({ latest: '1.1.0', stable: '1.0.0' });
export const DEP_VERSION = '1.0.0';

export function readInput(file) {
  return readFileSync(file && file !== '-' ? file : 0, 'utf8');
}

/** Accepts stream-json (one JSON value per line), a JSON array of messages, or one JSON object. */
export function parseMessages(text) {
  const trimmed = text.trim();
  if (trimmed === '') return [];
  if (trimmed.startsWith('[')) {
    const value = JSON.parse(trimmed);
    return Array.isArray(value) ? value : [value];
  }
  const messages = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const l = line.trim();
    if (l === '') continue;
    try {
      messages.push(JSON.parse(l));
    } catch {
      // not JSON (progress noise): ignored
    }
  }
  return messages;
}

export const findInit = (messages) => messages.find((m) => m?.type === 'system' && m?.subtype === 'init') ?? null;
export const findResult = (messages) => [...messages].reverse().find((m) => m?.type === 'result') ?? null;

export const table = (header, rows) =>
  [`| ${header.join(' | ')} |`, `|${header.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map((c) => cell(c)).join(' | ')} |`)].join('\n');

export const usd = (n) => (Number.isFinite(n) ? n.toFixed(4) : 'n/a');

export function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Runs a script body, printing thrown errors to stderr with exit code 2. */
export async function main(body) {
  try {
    process.exitCode = await body();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
