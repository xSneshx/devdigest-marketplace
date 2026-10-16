// Hook input/output helpers. Zero dependencies, `node:` built-ins only.
// This file is byte-identical in every guard-shipping plugin (CI parity check).
import { readFileSync, writeSync, existsSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname, basename, join, sep } from 'node:path';

// A refusal with a message meant for the agent. Anything else thrown inside a
// guard is an evaluation failure and is handled fail-closed by the runner.
export class Refusal extends Error {}

export function readRaw() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

// Hook input is untrusted: parse, never evaluate. Returns null when the text is
// not a JSON object.
export function parseInput(raw) {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

// CLAUDE_PROJECT_DIR is stable for the session; `cwd` moves when the agent runs
// `cd`, which would shift every project-relative rule. Prefer the stable one.
export function projectDir(input) {
  return process.env.CLAUDE_PROJECT_DIR ||
    (typeof input?.cwd === 'string' && input.cwd) || process.cwd();
}

export const toPosix = (p) => p.split(sep).join('/');

const outside = (rel) => rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel);

// Resolve a tool-supplied path against the project root. Refuses a path that
// leaves the project, lexically or through a symlink in an existing ancestor.
// Returns the lexical project-relative path (`rel`) and the same path with every
// existing symlink resolved (`real`), so callers can match protected paths on both.
export function resolveInside(root, p) {
  const abs = resolve(root, String(p));
  const rel = relative(root, abs);
  if (outside(rel)) throw new Refusal(`${p} is outside the project directory.`);
  let probe = abs;
  const tail = [];
  while (!existsSync(probe)) {
    const up = dirname(probe);
    if (up === probe) break;
    tail.unshift(basename(probe));
    probe = up;
  }
  const realRel = relative(realpathSync(root), realpathSync(probe));
  if (outside(realRel)) throw new Refusal(`${p} resolves outside the project directory (symlink).`);
  return { abs, rel: toPosix(rel), real: toPosix(join(realRel, ...tail)) };
}

// Exact, quote-anchored match of an agent identifier in raw (possibly malformed)
// hook text. `xcode-agents:implementer-2` cannot match `code-agents:implementer`.
export function rawAgentMatch(raw, ids) {
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`"agent_type"\\s*:\\s*"${esc}"`).test(raw)) return id;
  }
  return null;
}

// Synchronous write so the message survives the immediate process.exit.
export function stderrLine(text) {
  try {
    writeSync(2, text.endsWith('\n') ? text : text + '\n');
  } catch {
    /* nothing left to do */
  }
}
