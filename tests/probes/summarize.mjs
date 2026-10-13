#!/usr/bin/env node
// Reduces the artifacts of run-probes.sh to summary.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SENTINEL = 'PROBE-SENTINEL-7f3a9c21-quartz-lantern';

/** @param {string} text @returns {object[]} */
export function parseJsonl(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      // skip a malformed line; the count of valid rows is what matters
    }
  }
  return rows;
}

/**
 * @param {{hookJsonl?: string, debugLog?: string, agentReply?: string,
 *          collideReply?: string, allowedExists?: boolean, forbiddenExists?: boolean}} a
 */
export function summarize(a) {
  const rows = parseJsonl(a.hookJsonl ?? '');
  const agentTypes = [...new Set(rows.map((r) => r.agent_type).filter((v) => typeof v === 'string'))].sort();
  const debug = a.debugLog ?? '';
  const reply = a.agentReply ?? '';
  const sentinelInReply = new RegExp(`SENTINEL:\\s*${SENTINEL}`).test(reply);
  const sentinelInDebug = debug.includes(SENTINEL);
  const refusalInReply = /^REFUSED:/m.test(reply);
  const forbiddenDenied = rows.some(
    (r) => typeof r?.tool_input?.file_path === 'string' && r.tool_input.file_path.endsWith('forbidden.txt'),
  ) && a.forbiddenExists === false;
  const collide = /COLLIDE-OUTCOME:\s*(command|skill)/.exec(a.collideReply ?? '');
  return {
    hook_events: rows.length,
    agent_types: agentTypes,
    preload: sentinelInReply || sentinelInDebug ? 'yes' : 'no',
    preload_evidence: { reply: sentinelInReply, debug_log: sentinelInDebug },
    refusal_seen: refusalInReply || forbiddenDenied,
    allowed_written: a.allowedExists === true,
    forbidden_written: a.forbiddenExists === true,
    collision_outcome: collide ? collide[1] : 'unknown',
  };
}

function readIf(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

/** @param {string} outDir @param {string} fixtureDir */
export function summarizeDir(outDir, fixtureDir) {
  return summarize({
    hookJsonl: readIf(join(outDir, 'hook-input.jsonl')),
    debugLog: readIf(join(outDir, 'agent-debug.log')),
    agentReply: readIf(join(outDir, 'agent-reply.txt')),
    collideReply: readIf(join(outDir, 'collide-reply.txt')),
    allowedExists: existsSync(join(fixtureDir, 'allowed.txt')),
    forbiddenExists: existsSync(join(fixtureDir, 'forbidden.txt')),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [outDir, fixtureDir] = process.argv.slice(2);
  if (!outDir || !fixtureDir) {
    console.error('usage: summarize.mjs <out-dir> <fixture-dir>');
    process.exit(2);
  }
  const summary = summarizeDir(outDir, fixtureDir);
  writeFileSync(join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}
