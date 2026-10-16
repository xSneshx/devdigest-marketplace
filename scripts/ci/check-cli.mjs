// CLI-backed checks (AC-5, AC-23, AC-33, AC-57, AC-60, AC-62). Runs only with `--with-cli`:
//   1. `claude plugin validate <path> --strict` for the marketplace and every plugin directory.
//   2. Component inventory: `claude plugin details` against scripts/ci/component-map.json.
//   3. `tag-dry-run` (release time, needs a committed tree): node scripts/ci/check-cli.mjs --tag-dry-run
//
// Verified invocation (claude 2.1.296, offline, no credential, no model call):
//   export CLAUDE_CONFIG_DIR="$(mktemp -d)"                     # isolated, user config untouched
//   claude plugin marketplace add "<MP working tree>"           # works on an UNCOMMITTED directory
//   claude plugin install <p>@devdigest-marketplace             # installs dependencies too
//   claude plugin details <p>@devdigest-marketplace             # only for an installed plugin
// `details` prints "Skills (n)  a, b", "Agents (n)  ...", "Hooks (n)  PreToolUse  (harness-only ...)".
// Slash commands are reported under Skills, so a plugin's expected skills list is
// `skills + commands` of component-map.json (compared as a multiset: a command and a skill must not share a name
// (the command shadows the skill; sdd-engineering names its command `execute-plan`)).
// `--snapshot` (CI and the orchestrator only; implementers never run it) copies the tree to a
// temp dir, `git init`s and commits with a fixed identity, and adds THAT as the marketplace.
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildContext, parseArgs, report } from './lib/check.mjs';
import { loadWorld } from './lib/repo.mjs';
import { satisfies } from './lib/semver.mjs';

export const name = 'cli';

const CI_DIR = path.dirname(fileURLToPath(import.meta.url));
const TIMEOUT_MS = 120_000;

/** Runs one command; never throws. `env` lets tests put a fake `claude` first on PATH. */
export function exec(file, args, { cwd, env } = {}) {
  return new Promise((resolve) => {
    execFile(file, args, { cwd, env: env ?? process.env, encoding: 'utf8', timeout: TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error ? (typeof error.code === 'number' ? error.code : 1) : 0;
      resolve({ code, stdout: stdout ?? '', stderr: (stderr ?? '') + (error && typeof error.code !== 'number' ? String(error.message) : '') });
    });
  });
}

const tail = (r) => (r.stdout + r.stderr).trim().split('\n').slice(-4).join(' | ');
const failedOutput = (r) => r.code !== 0 || /✘/.test(r.stdout + r.stderr);

export async function validateAll(ctx, world, env) {
  const errors = [];
  const targets = [{ label: 'marketplace', target: ctx.root }];
  for (const p of world.plugins) if (p.wanted && p.dir) targets.push({ label: p.name, target: p.dir });
  for (const { label, target } of targets) {
    const r = await exec('claude', ['plugin', 'validate', target, '--strict'], { env });
    if (failedOutput(r)) errors.push(`${label}: claude plugin validate --strict failed (exit ${r.code}): ${tail(r)}`);
  }
  return errors;
}

/** Parses `claude plugin details` text into { skills, agents, hooks } (sorted arrays). */
export function parseDetails(text) {
  const out = { skills: [], agents: [], hooks: [] };
  const keys = { Skills: 'skills', Agents: 'agents', Hooks: 'hooks' };
  for (const line of text.split('\n')) {
    const m = /^\s*(Skills|Agents|Hooks) \((\d+)\)\s*(.*)$/.exec(line);
    if (!m) continue;
    const rest = m[3].replace(/\([^)]*\)/g, ' ').trim();
    out[keys[m[1]]] = rest === '' ? [] : rest.split(/[,\s]+/).filter((s) => s !== '');
  }
  for (const k of Object.keys(out)) out[k].sort();
  return out;
}

const sorted = (list) => [...list].sort();
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function diffInventory(plugin, actual, expected) {
  const want = {
    skills: sorted([...(expected.skills ?? []), ...(expected.commands ?? [])]),
    agents: sorted(expected.agents ?? []),
    hooks: sorted(expected.hooks ?? []),
  };
  const errors = [];
  for (const kind of ['skills', 'agents', 'hooks']) {
    if (!same(actual[kind], want[kind])) {
      errors.push(`${plugin}: ${kind} reported by "claude plugin details" [${actual[kind].join(', ')}] differ from component-map.json [${want[kind].join(', ')}]`);
    }
  }
  return errors;
}

async function makeSnapshot(root) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'mp-snapshot-'));
  await cp(root, dir, { recursive: true, filter: (src) => !/[\\/](\.git|node_modules|evals-out)([\\/]|$)/.test(src) });
  const git = (...args) => exec('git', ['-C', dir, '-c', 'user.name=ci', '-c', 'user.email=ci@example.invalid', '-c', 'commit.gpgsign=false', ...args]);
  for (const args of [['init', '-q'], ['add', '-A'], ['commit', '-q', '-m', 'snapshot']]) {
    const r = await git(...args);
    if (r.code !== 0) throw new Error(`snapshot: git ${args[0]} failed: ${tail(r)}`);
  }
  return dir;
}

export async function inventory(ctx, world, env) {
  const errors = [];
  let map;
  try {
    map = JSON.parse(await readFile(ctx.componentMapPath ?? path.join(CI_DIR, 'component-map.json'), 'utf8'));
  } catch (error) {
    return [`scripts/ci/component-map.json: ${error instanceof Error ? error.message : String(error)}`];
  }
  const configDir = await mkdtemp(path.join(os.tmpdir(), 'mp-cli-config-'));
  const cliEnv = { ...env, CLAUDE_CONFIG_DIR: configDir };
  let snapshot = null;
  try {
    let source = ctx.root;
    if (ctx.flags?.snapshot) source = snapshot = await makeSnapshot(ctx.root);
    const add = await exec('claude', ['plugin', 'marketplace', 'add', source], { env: cliEnv });
    if (failedOutput(add)) return [`marketplace add failed (exit ${add.code}): ${tail(add)}`];
    let catalogName = 'devdigest-marketplace';
    try {
      catalogName = JSON.parse(await readFile(path.join(ctx.root, '.claude-plugin', 'marketplace.json'), 'utf8')).name ?? catalogName;
    } catch {
      // loadWorld already reported an unreadable catalog
    }
    for (const p of world.plugins) {
      if (!p.wanted) continue;
      const expected = map[p.name];
      if (!expected) {
        errors.push(`${p.name}: not listed in scripts/ci/component-map.json`);
        continue;
      }
      const ref = `${p.name}@${catalogName}`;
      const install = await exec('claude', ['plugin', 'install', ref], { env: cliEnv });
      if (failedOutput(install)) {
        errors.push(`${p.name}: claude plugin install failed (exit ${install.code}): ${tail(install)}`);
        continue;
      }
      const details = await exec('claude', ['plugin', 'details', ref], { env: cliEnv });
      if (failedOutput(details)) {
        errors.push(`${p.name}: claude plugin details failed (exit ${details.code}): ${tail(details)}`);
        continue;
      }
      errors.push(...diffInventory(p.name, parseDetails(details.stdout), expected));
    }
    for (const key of ctx.plugins === null ? Object.keys(map) : []) {
      if (!world.plugins.some((p) => p.name === key)) errors.push(`${key}: listed in component-map.json but not in the catalog`);
    }
  } finally {
    await rm(configDir, { recursive: true, force: true });
    if (snapshot) await rm(snapshot, { recursive: true, force: true });
  }
  return errors;
}

/** Plugins ordered so that every dependency comes before its dependents. */
export function dependencyOrder(plugins) {
  const byName = new Map(plugins.map((p) => [p.name, p]));
  const order = [];
  const seen = new Set();
  const visit = (p) => {
    if (seen.has(p.name)) return;
    seen.add(p.name);
    for (const dep of p.manifest?.dependencies ?? []) {
      const depName = typeof dep === 'string' ? dep.split('@')[0] : dep?.name;
      if (byName.has(depName)) visit(byName.get(depName));
    }
    order.push(p);
  };
  plugins.forEach(visit);
  return order;
}

/** AC-23, release time only: needs a clean, committed tree (research A). */
export async function tagDryRun(ctx, env = process.env) {
  const world = await loadWorld(ctx.root, { plugins: ctx.plugins });
  if (world.catalogError) return [world.catalogError];
  const listed = await exec('git', ['-C', ctx.root, 'tag', '--list'], { env });
  if (listed.code !== 0) return [`git tag --list failed: ${tail(listed)}`];
  const tags = listed.stdout.split('\n').map((t) => t.trim()).filter((t) => t !== '');
  const errors = [];
  for (const p of dependencyOrder(world.plugins)) {
    if (!p.dir || !p.manifest) {
      errors.push(`${p.name}: plugin manifest missing`);
      continue;
    }
    for (const dep of p.manifest.dependencies ?? []) {
      if (typeof dep === 'string' || !dep?.name) continue;
      const versions = tags.filter((t) => t.startsWith(`${dep.name}--v`)).map((t) => t.slice(`${dep.name}--v`.length));
      if (!versions.some((v) => satisfies(v, dep.version))) {
        errors.push(`${p.name}: dependency ${dep.name} ${dep.version} has no existing tag ${dep.name}--v<version> satisfying it (tag ${dep.name} first)`);
      }
    }
    const r = await exec('claude', ['plugin', 'tag', p.relDir, '--dry-run'], { cwd: ctx.root, env });
    if (failedOutput(r)) errors.push(`${p.name}: claude plugin tag --dry-run failed (exit ${r.code}): ${tail(r)}`);
  }
  return errors;
}

export async function run(ctx) {
  if (!ctx.flags?.withCli) return { errors: [], skipped: 'needs --with-cli' };
  const env = ctx.env ?? process.env;
  const world = await loadWorld(ctx.root, { plugins: ctx.plugins });
  if (world.catalogError) return [world.catalogError];
  return [...(await validateAll(ctx, world, env)), ...(await inventory(ctx, world, env))];
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const argv = process.argv.slice(2);
    const dry = argv.includes('--tag-dry-run');
    const parsed = parseArgs(argv.filter((a) => a !== '--tag-dry-run'));
    parsed.flags.withCli = true;
    const ctx = buildContext(parsed);
    const ok = report(dry ? 'tag-dry-run' : name, dry ? await tagDryRun(ctx) : await run(ctx));
    process.exitCode = ok ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
