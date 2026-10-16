// Project map (AC-69): what the consumer project actually has — rule files,
// check commands defined by package.json scripts, and test locations. Guards
// allow only commands and paths this map (or an explicit input, AC-70) shows.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RULE_CANDIDATES = ['CLAUDE.md', 'AGENTS.md', 'README.md', 'CONTRIBUTING.md'];
const SCRIPT_NAME = /^(test|typecheck|type-check|lint|check)(:.+)?$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', 'out', 'target', 'vendor']);
const TEST_DIR_NAMES = new Set(['test', 'tests', '__tests__', '__mocks__', 'e2e', 'integration', 'testing']);
const TEST_FILE = /\.(test|spec)\.[^/]+$|_test\.[^/]+$|(^|\/)test_[^/]+\.py$/;
const MAX_ENTRIES = 5000;
const MAX_DEPTH = 4;

export const isTestFile = (rel) => TEST_FILE.test(rel);
export const TEST_DIR_SEGMENTS = TEST_DIR_NAMES;

const readJson = (p) => {
  try {
    const v = JSON.parse(readFileSync(p, 'utf8'));
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
};

const subdirs = (dir) => {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !SKIP_DIRS.has(d.name))
      .map((d) => d.name);
  } catch {
    return [];
  }
};

function detectPm(root, dir, pkg) {
  const declared = typeof pkg.packageManager === 'string' ? pkg.packageManager.split('@')[0] : '';
  if (['npm', 'pnpm', 'yarn'].includes(declared)) return declared;
  for (const base of dir ? [join(root, dir), root] : [root]) {
    if (existsSync(join(base, 'pnpm-lock.yaml'))) return 'pnpm';
    if (existsSync(join(base, 'yarn.lock'))) return 'yarn';
    if (existsSync(join(base, 'package-lock.json'))) return 'npm';
  }
  return 'npm';
}

// Command spellings accepted for one script. `bare` is valid when the shell is
// in the package directory; `prefixed` is valid from the project root.
export function checkForms(pm, dir, script) {
  const bare = [];
  const prefixed = [];
  if (pm === 'npm') {
    bare.push(`npm run ${script}`);
    if (script === 'test') bare.push('npm test');
    prefixed.push(`npm --prefix ${dir} run ${script}`);
    if (script === 'test') prefixed.push(`npm --prefix ${dir} test`);
  } else if (pm === 'pnpm') {
    bare.push(`pnpm ${script}`, `pnpm run ${script}`);
    prefixed.push(`pnpm --dir ${dir} ${script}`, `pnpm --dir ${dir} run ${script}`,
      `pnpm -C ${dir} ${script}`, `pnpm -C ${dir} run ${script}`);
  } else {
    bare.push(`yarn ${script}`, `yarn run ${script}`);
    prefixed.push(`yarn --cwd ${dir} ${script}`);
  }
  return { bare, prefixed };
}

function discoverChecks(root) {
  const checks = [];
  for (const dir of ['', ...subdirs(root)]) {
    const pkg = readJson(join(root, dir, 'package.json'));
    if (!pkg || typeof pkg.scripts !== 'object' || !pkg.scripts) continue;
    const pm = detectPm(root, dir, pkg);
    for (const script of Object.keys(pkg.scripts)) {
      if (!SCRIPT_NAME.test(script)) continue;
      const f = checkForms(pm, dir, script);
      checks.push({ dir, script, pm, bare: f.bare, prefixed: dir ? f.prefixed : [] });
    }
  }
  return checks;
}

function walkTests(root, deadline) {
  const dirs = new Set();
  let files = 0;
  let seen = 0;
  const stack = [{ dir: '', depth: 0 }];
  while (stack.length) {
    if (Date.now() > deadline) throw new Error('project scan exceeded its time budget');
    const { dir, depth } = stack.pop();
    let entries;
    try {
      entries = readdirSync(join(root, dir), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (++seen > MAX_ENTRIES) return { dirs: [...dirs], files, truncated: true };
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (e.name.startsWith('.') || SKIP_DIRS.has(e.name) || depth >= MAX_DEPTH) continue;
        if (TEST_DIR_NAMES.has(e.name)) dirs.add(rel);
        stack.push({ dir: rel, depth: depth + 1 });
      } else if (e.isFile() && TEST_FILE.test(rel)) {
        files++;
      }
    }
  }
  return { dirs: [...dirs], files, truncated: false };
}

// `scanTests: false` skips the tree walk when only the check commands are needed.
export function buildProjectMap(root, { deadline = Date.now() + 3000, scanTests = true } = {}) {
  const ruleFiles = RULE_CANDIDATES.filter((f) => existsSync(join(root, f)));
  if (existsSync(join(root, 'docs'))) ruleFiles.push('docs/');
  const tests = scanTests ? walkTests(root, deadline) : { dirs: [], files: 0, truncated: false };
  return {
    ruleFiles,
    checks: discoverChecks(root),
    testDirs: tests.dirs,
    testFileCount: tests.files,
    truncated: tests.truncated,
  };
}

// Effective check set: explicit `checkCommands` replace discovery (AC-70).
export function effectiveChecks(map, inputs) {
  if (inputs.checkCommands.length) {
    return {
      explicit: true,
      checks: inputs.checkCommands.map((c) => ({ dir: '', script: c, bare: [c], prefixed: [] })),
    };
  }
  return { explicit: false, checks: map.checks };
}
