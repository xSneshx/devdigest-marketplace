// Check module contract (shared by every scripts/ci/check-*.mjs, including the ones other
// tasks add):
//   export const name = 'catalog';                       // run-all `--only` key
//   export async function run(ctx) { return errors }     // string[] , or { errors, skipped? }
// ctx = { root, base, channelRef, plugins, flags: { withCli, requireEvals, worktree, snapshot },
//         config, git }.  `plugins` is null (all) or the list from `--plugin`.
// `channelRef` is `--channel <ref>`, else GITHUB_BASE_REF (pull request target), else
// GITHUB_REF_NAME (push), else null.
// A check reports errors as strings that name the plugin or file at fault.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { defaultGit } from './git.mjs';

const CI_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_ROOT = path.resolve(CI_DIR, '..', '..');

export function loadConfig() {
  try {
    return { dependencyResolution: 'head-in-range', ...JSON.parse(readFileSync(path.join(CI_DIR, 'config.json'), 'utf8')) };
  } catch {
    return { dependencyResolution: 'head-in-range' };
  }
}

function takeValue(argv, i, flag) {
  const value = argv[i + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`${flag} needs a value`);
  return value;
}

const csv = (value) => value.split(',').map((s) => s.trim()).filter((s) => s !== '');

/** Parses the shared command line. Throws on an unknown flag so a typo cannot pass silently. */
export function parseArgs(argv, env = process.env) {
  const out = {
    root: DEFAULT_ROOT,
    base: env.GITHUB_BASE_REF ? `origin/${env.GITHUB_BASE_REF}` : null,
    channelRef: env.GITHUB_BASE_REF || env.GITHUB_REF_NAME || null,
    plugins: null,
    only: null,
    flags: { withCli: false, requireEvals: false, worktree: false, snapshot: false },
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--root': out.root = path.resolve(takeValue(argv, i, arg)); i += 1; break;
      case '--base': out.base = takeValue(argv, i, arg); i += 1; break;
      case '--channel': out.channelRef = takeValue(argv, i, arg); i += 1; break;
      case '--plugin': out.plugins = csv(takeValue(argv, i, arg)); i += 1; break;
      case '--only': out.only = csv(takeValue(argv, i, arg)); i += 1; break;
      case '--with-cli': out.flags.withCli = true; break;
      case '--require-evals': out.flags.requireEvals = true; break;
      case '--worktree': out.flags.worktree = true; break;
      case '--snapshot': out.flags.snapshot = true; break;
      default: throw new Error(`unknown argument ${arg}`);
    }
  }
  return out;
}

export function buildContext(parsed) {
  return {
    root: parsed.root,
    base: parsed.base,
    channelRef: parsed.channelRef ?? null,
    plugins: parsed.plugins,
    flags: parsed.flags,
    config: loadConfig(),
    git: defaultGit(parsed.root),
  };
}

export function normalize(result) {
  if (Array.isArray(result)) return { errors: result, skipped: null };
  return { errors: result?.errors ?? [], skipped: result?.skipped ?? null };
}

export function report(checkName, result) {
  const { errors, skipped } = normalize(result);
  if (skipped) {
    console.log(`SKIP ${checkName}: ${skipped}`);
    return true;
  }
  if (errors.length === 0) {
    console.log(`PASS ${checkName}`);
    return true;
  }
  console.log(`FAIL ${checkName} (${errors.length})`);
  for (const message of errors) console.log(`  - ${message}`);
  return false;
}

/** Lets a check run standalone: `node scripts/ci/check-graph.mjs [--root <dir>]`. */
export async function cliMain(metaUrl, check) {
  if (!process.argv[1] || pathToFileURL(process.argv[1]).href !== metaUrl) return;
  try {
    const ctx = buildContext(parseArgs(process.argv.slice(2)));
    const ok = report(check.name, await check.run(ctx));
    process.exitCode = ok ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
