// Consumer project inputs (AC-70): <project>/.claude/project-inputs.json.
// All keys are optional. An explicit value wins over discovery. The file is
// guard configuration, so a malformed file is an evaluation failure (the guard
// fails closed for guarded agents) rather than being silently ignored.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const INPUTS_FILE = '.claude/project-inputs.json';

const LIST_KEYS = ['ruleFiles', 'specDirs', 'checkCommands', 'testLocations', 'protectedPaths'];
const STRING_KEYS = ['planDir', 'retroLedger'];

const badPath = (s) => typeof s !== 'string' || !s.trim() || /^([/\\]|[A-Za-z]:)/.test(s) ||
  s.split(/[/\\]/).includes('..');

export function loadInputs(root) {
  const out = { file: INPUTS_FILE, present: false, explicit: new Set() };
  for (const k of LIST_KEYS) out[k] = [];
  for (const k of STRING_KEYS) out[k] = null;
  const abs = join(root, INPUTS_FILE);
  if (!existsSync(abs)) return out;

  let data;
  try {
    data = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (e) {
    throw new Error(`${INPUTS_FILE} is not valid JSON (${e.message})`);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${INPUTS_FILE} must be a JSON object`);
  }
  out.present = true;
  for (const k of LIST_KEYS) {
    if (data[k] === undefined) continue;
    if (!Array.isArray(data[k]) || data[k].some((x) => typeof x !== 'string' || !x.trim())) {
      throw new Error(`${INPUTS_FILE}: "${k}" must be an array of non-empty strings`);
    }
    if (k !== 'checkCommands' && data[k].some(badPath)) {
      throw new Error(`${INPUTS_FILE}: "${k}" entries must be project-relative paths without ".."`);
    }
    out[k] = data[k].map((s) => s.trim());
    if (out[k].length) out.explicit.add(k);
  }
  for (const k of STRING_KEYS) {
    if (data[k] === undefined) continue;
    if (badPath(data[k])) throw new Error(`${INPUTS_FILE}: "${k}" must be a project-relative path`);
    out[k] = data[k].trim();
    out.explicit.add(k);
  }
  return out;
}

// Path prefix or simple glob (`*` within a segment, `**` across segments).
// "dir/" and "dir" both protect everything under dir.
// `ci` compares case-insensitively (protected paths: a case-insensitive file
// system must not be a way around a rule).
export function pathPattern(pattern, ci = false) {
  const p = pattern.replace(/^\.\//, '').replace(/\/+$/, '');
  const src = p.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*');
  return new RegExp(`^${src}(/.*)?$`, ci ? 'i' : '');
}

export const matchesAny = (rel, patterns, ci = false) =>
  patterns.find((p) => pathPattern(p, ci).test(rel)) ?? null;
