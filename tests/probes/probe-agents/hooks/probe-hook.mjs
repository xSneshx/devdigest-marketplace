#!/usr/bin/env node
// Probe hook: records raw stdin JSON to $PROBE_OUT/hook-input.jsonl and
// denies any write whose target basename is forbidden.txt.
import { appendFileSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const raw = Buffer.concat(chunks).toString('utf8');

const out = process.env.PROBE_OUT;
if (out) {
  mkdirSync(out, { recursive: true });
  appendFileSync(join(out, 'hook-input.jsonl'), `${raw.replace(/\r?\n/g, ' ').trim()}\n`);
}

let input = {};
try {
  input = JSON.parse(raw);
} catch {
  // unparseable input: record only, do not block
}
const target = input?.tool_input?.file_path;
if (typeof target === 'string' && basename(target) === 'forbidden.txt') {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'probe-agents: writes to forbidden.txt are denied',
      },
    }),
  );
}
process.exit(0);
