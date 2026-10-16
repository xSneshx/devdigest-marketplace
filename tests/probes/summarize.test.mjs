import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SENTINEL, summarize } from './summarize.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const hookJsonl = readFileSync(join(here, 'fixtures', 'hook-input.jsonl'), 'utf8');

test('summarizes agent types, preload, refusal and collision', () => {
  const s = summarize({
    hookJsonl,
    debugLog: `loaded skill ${SENTINEL}`,
    agentReply: `SENTINEL: ${SENTINEL}\nREFUSED: forbidden.txt`,
    collideReply: 'COLLIDE-OUTCOME: command',
    allowedExists: true,
    forbiddenExists: false,
  });
  assert.equal(s.hook_events, 3);
  assert.deepEqual(s.agent_types, ['probe-agents:probe-writer']);
  assert.equal(s.preload, 'yes');
  assert.equal(s.refusal_seen, true);
  assert.equal(s.allowed_written, true);
  assert.equal(s.forbidden_written, false);
  assert.equal(s.collision_outcome, 'command');
});

test('reports absent preload, no refusal and unknown collision on empty input', () => {
  const s = summarize({ agentReply: 'SENTINEL: absent', forbiddenExists: true });
  assert.equal(s.preload, 'no');
  assert.equal(s.refusal_seen, false);
  assert.equal(s.forbidden_written, true);
  assert.deepEqual(s.agent_types, []);
  assert.equal(s.collision_outcome, 'unknown');
});
