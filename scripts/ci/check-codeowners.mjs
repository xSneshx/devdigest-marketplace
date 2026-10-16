// AC-3, AC-72: CODEOWNERS (repo root, .github/ or docs/) must have
//   - a default `*` rule,
//   - exactly one `/plugins/<name>/` line per catalog plugin,
//   - a rule other than the catch-all for every executable script (*.sh, *.mjs, *.py) under
//     plugins/*/hooks/, plugins/*/skills/*/scripts/, scripts/ and .github/.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cliMain } from './lib/check.mjs';
import { listFiles } from './check-content.mjs';
import { exists, loadWorld } from './lib/repo.mjs';

export const name = 'codeowners';

const LOCATIONS = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS'];
const SCRIPT_RE = /\.(sh|mjs|py)$/;
const SCRIPT_DIRS = [
  /^plugins\/[^/]+\/hooks\//,
  /^plugins\/[^/]+\/skills\/[^/]+\/scripts\//,
  /^scripts\//,
  /^\.github\//,
];

export function parseCodeowners(text) {
  const rules = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.replace(/\s+#.*$/, '').trim();
    if (line === '' || line.startsWith('#')) return;
    const [pattern, ...owners] = line.split(/\s+/);
    rules.push({ pattern, owners, line: index + 1 });
  });
  return rules;
}

const isCatchAll = (pattern) => ['*', '**', '/*', '/**', '**/*'].includes(pattern);

/** gitignore-style subset: anchoring, trailing `/`, `*`, `**`, `?`. */
export function patternToRegExp(pattern) {
  const dirOnly = pattern.endsWith('/');
  let body = dirOnly ? pattern.slice(0, -1) : pattern;
  const anchored = body.startsWith('/') || body.includes('/');
  body = body.replace(/^\//, '');
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i];
    if (c === '*' && body[i + 1] === '*') { out += '.*'; i += 1; }
    else if (c === '*') out += '[^/]*';
    else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${anchored ? '' : '(?:.*/)?'}${out}(?:/.*)?$`);
}

const normalizeDir = (pattern) => pattern.replace(/^\//, '').replace(/\/$/, '');

export async function run(ctx) {
  let location = null;
  for (const candidate of LOCATIONS) {
    if (await exists(path.join(ctx.root, candidate))) { location = candidate; break; }
  }
  if (location === null) return ['CODEOWNERS not found (looked in CODEOWNERS, .github/, docs/)'];
  const rules = parseCodeowners(await readFile(path.join(ctx.root, location), 'utf8'));
  const errors = [];

  if (!rules.some((r) => r.pattern === '*' && r.owners.length > 0)) {
    errors.push(`${location}: no default "*" rule with an owner`);
  }
  for (const r of rules) {
    if (r.owners.length === 0) errors.push(`${location}:${r.line}: rule "${r.pattern}" has no owner`);
  }

  const world = await loadWorld(ctx.root);
  if (world.catalogError) {
    errors.push(world.catalogError);
  } else {
    for (const plugin of world.plugins) {
      const dir = plugin.relDir ?? `plugins/${plugin.name}`;
      const lines = rules.filter((r) => normalizeDir(r.pattern) === dir);
      if (lines.length === 0) errors.push(`${location}: no "/${dir}/" line for plugin "${plugin.name}"`);
      else if (lines.length > 1) {
        errors.push(`${location}: plugin "${plugin.name}" has ${lines.length} lines (${lines.map((l) => l.line).join(', ')}); exactly one is required`);
      }
    }
  }

  const { files, source } = await listFiles(ctx);
  if (files.length === 0) {
    errors.push(`no files to check (source: ${source}); on an uncommitted tree run with --worktree`);
    return errors;
  }
  const specific = rules.filter((r) => !isCatchAll(r.pattern) && r.owners.length > 0)
    .map((r) => patternToRegExp(r.pattern));
  for (const rel of files) {
    if (!SCRIPT_RE.test(rel) || !SCRIPT_DIRS.some((re) => re.test(rel))) continue;
    if (!specific.some((re) => re.test(rel))) errors.push(`${rel}: executable script not covered by a CODEOWNERS rule`);
  }
  return errors;
}

await cliMain(import.meta.url, { name, run });
