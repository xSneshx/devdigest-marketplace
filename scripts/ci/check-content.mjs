// AC-7, AC-12, AC-16, AC-18, AC-59: content scan of every git-tracked file (with `--worktree`:
// every non-ignored file): secret patterns, absolute home paths, and the deny-list of
// source-repo-specific tokens (scripts/ci/denylist.txt).
//
// Findings name `path:line` and the rule, never the matched text: a leaked secret must not be
// copied into CI logs.
import { execFileSync } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliMain } from './lib/check.mjs';
import { readJson, walk } from './lib/repo.mjs';

export const name = 'content';

const CI_DIR = path.dirname(fileURLToPath(import.meta.url));
const MAX_BYTES = 2 * 1024 * 1024;
const SKIPPED_DIRS = new Set(['node_modules', 'evals-out']);

/**
 * The complete list of reviewed exceptions. A test asserts this object, so widening it is a
 * deliberate, reviewed change.
 */
export const REVIEWED_EXCEPTIONS = Object.freeze({
  // Removed from a line before deny-list matching. The catalog `name` is added at run time.
  strings: Object.freeze(['devdigest-marketplace']),
  // Not scanned at all: the deny-list names the tokens, the fixtures plant them on purpose.
  files: Object.freeze(['scripts/ci/denylist.txt', 'tests/ci/content/fixtures/**']),
});

// Pattern sources that would match themselves are written so that they do not (the checker
// scans its own file): no literal backslash after a drive letter, no `BEGIN .* PRIVATE`.
const BACKSLASH = String.fromCharCode(92);

// A value that announces itself as a placeholder is not a credential.
const PLACEHOLDER = /your|example|placeholder|changeme|dummy|fake|sample|x{4}|\*{3}|<[^>]+>|\$\{/i;

export const SECRET_PATTERNS = [
  { id: 'aws-access-key', re: /AKIA[0-9A-Z]{16}/ },
  { id: 'google-api-key', re: /AIza[0-9A-Za-z_-]{35}/ },
  { id: 'mongodb-uri-with-credentials', re: /mongodb(\+srv)?:\/\/[^:\s/]+:[^@\s]+@/ },
  { id: 'private-key-block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { id: 'github-token', re: /gh[ps]_[A-Za-z0-9]{36,}/ },
  { id: 'npm-token', re: /npm_[A-Za-z0-9]{36}/ },
  { id: 'slack-token', re: /xox[bpsa]-[0-9a-zA-Z-]+/ },
  // 16+ characters: shorter literals are documentation placeholders (`password: 'secret123'`).
  { id: 'generic-credential-assignment', re: /(secret|key|token|password)\s*[:=]\s*['"][^'"\s]{16,}/i, ignoreIf: PLACEHOLDER },
];

// Case-sensitive and anchored: `/users/:id` route examples must not match, and a path segment
// such as `.../home/` inside a URL (preceded by a word character) must not either.
export const HOME_PATH_PATTERNS = [
  { id: 'absolute-home-path (/Users/)', re: /(?<![\w.~:/-])\/Users\/[\w.-]+/ },
  { id: 'absolute-home-path (/home/)', re: /(?<![\w.~:/-])\/home\/[\w.-]+/ },
  { id: 'absolute-windows-path', re: new RegExp(`(?<![A-Za-z])C:${BACKSLASH}${BACKSLASH}`) },
];

export async function loadDenylist(file = path.join(CI_DIR, 'denylist.txt')) {
  const text = await readFile(file, 'utf8');
  const rules = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    if (line.startsWith('re:')) rules.push({ label: line.slice(3), re: new RegExp(line.slice(3), 'i') });
    else rules.push({ label: line, literal: line.toLowerCase() });
  }
  return rules;
}

function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') { out += '.*'; i += 1; }
    else if (c === '*') out += '[^/]*';
    else out += c.replace(/[.+^${}()|[\]\\?]/g, '\\$&');
  }
  return new RegExp(`^${out}$`);
}

const EXCEPTION_FILE_RES = REVIEWED_EXCEPTIONS.files.map(globToRegExp);

function gitList(root, worktree) {
  const git = (args) => execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024,
  });
  try {
    // A directory below some other repo's top level is not "a repo" for this check.
    if (git(['rev-parse', '--show-prefix']).trim() !== '') return null;
    const args = ['ls-files', '-z', ...(worktree ? ['--cached', '--others', '--exclude-standard'] : [])];
    return git(args).split('\0').filter((f) => f !== '');
  } catch {
    return null;
  }
}

/**
 * Files to scan, relative POSIX paths. Git-tracked files in a git checkout (non-ignored ones
 * with `worktree`), a plain directory walk when `root` is not a git checkout. Returns
 * `{ files, source }`; `source` is 'git' | 'worktree' | 'walk'.
 */
export async function listFiles(ctx) {
  const worktree = Boolean(ctx.flags?.worktree);
  const fromGit = gitList(ctx.root, worktree);
  let candidates;
  let source;
  if (fromGit === null) {
    candidates = (await walk(ctx.root)).files.filter((f) => !f.split('/').some((seg) => SKIPPED_DIRS.has(seg)));
    source = 'walk';
  } else {
    candidates = fromGit;
    source = worktree ? 'worktree' : 'git';
  }
  const files = [];
  for (const rel of [...new Set(candidates)].sort()) {
    try {
      const st = await lstat(path.join(ctx.root, rel));
      if (st.isFile()) files.push(rel);
    } catch {
      // listed by git but deleted in the working tree
    }
  }
  return { files, source };
}

function isBinary(buf) {
  return buf.subarray(0, 8000).includes(0);
}

function isExcluded(rel) {
  return EXCEPTION_FILE_RES.some((re) => re.test(rel));
}

/** Scans one file's text. Returns messages without the matched text. */
export function scanText(text, rel, { denylist, allowedStrings }) {
  const errors = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const where = `${rel}:${index + 1}`;
    for (const { id, re, ignoreIf } of SECRET_PATTERNS) {
      const m = re.exec(line);
      if (m && !(ignoreIf && ignoreIf.test(m[0]))) errors.push(`${where}: secret pattern "${id}"`);
    }
    for (const { id, re } of HOME_PATH_PATTERNS) {
      if (re.test(line)) errors.push(`${where}: ${id}`);
    }
    let stripped = line;
    for (const allowed of allowedStrings) stripped = stripped.split(allowed).join(' ');
    const lower = stripped.toLowerCase();
    for (const rule of denylist) {
      const hit = rule.literal !== undefined ? lower.includes(rule.literal) : rule.re.test(stripped);
      if (hit) errors.push(`${where}: deny-listed token "${rule.label}"`);
    }
  });
  return errors;
}

export async function run(ctx) {
  const denylist = await loadDenylist();
  const catalog = await readJson(path.join(ctx.root, '.claude-plugin', 'marketplace.json'));
  const allowedStrings = [...REVIEWED_EXCEPTIONS.strings];
  if (typeof catalog.value?.name === 'string' && catalog.value.name !== '') allowedStrings.push(catalog.value.name);

  const { files, source } = await listFiles(ctx);
  if (files.length === 0) {
    return [`no files to scan (source: ${source}); on an uncommitted tree run with --worktree`];
  }
  const errors = [];
  for (const rel of files) {
    if (isExcluded(rel)) continue;
    const abs = path.join(ctx.root, rel);
    const buf = await readFile(abs);
    if (buf.length > MAX_BYTES || isBinary(buf)) continue;
    errors.push(...scanText(buf.toString('utf8'), rel, { denylist, allowedStrings }));
  }
  return errors;
}

await cliMain(import.meta.url, { name, run });
