// Runs every scripts/ci/check-*.mjs and exits non-zero if any fails.
//   node scripts/ci/run-all.mjs [--only a,b] [--plugin p1,p2] [--base <ref>] [--with-cli]
//        [--require-evals] [--worktree] [--snapshot] [--root <dir>]
// `--only` takes the check name without the `check-` prefix. The `cli` check runs only with
// `--with-cli`. The check module contract is documented in lib/check.mjs.
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildContext, parseArgs, report } from './lib/check.mjs';

const CI_DIR = path.dirname(fileURLToPath(import.meta.url));

async function discover() {
  const files = (await readdir(CI_DIR)).filter((f) => /^check-.+\.mjs$/.test(f)).sort();
  return files.map((file) => ({ file, key: file.replace(/^check-/, '').replace(/\.mjs$/, '') }));
}

export async function main(argv) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    return 2;
  }
  const available = await discover();
  if (parsed.only) {
    const unknown = parsed.only.filter((key) => !available.some((c) => c.key === key));
    if (unknown.length > 0) {
      console.error(`unknown check(s): ${unknown.join(', ')}; available: ${available.map((c) => c.key).join(', ')}`);
      return 2;
    }
  }
  const ctx = buildContext(parsed);
  let failed = 0;
  for (const { file, key } of available) {
    if (parsed.only && !parsed.only.includes(key)) continue;
    if (key === 'cli' && !parsed.flags.withCli) {
      if (parsed.only) report(key, { skipped: 'needs --with-cli' });
      continue;
    }
    try {
      const mod = await import(pathToFileURL(path.join(CI_DIR, file)).href);
      if (typeof mod.run !== 'function') throw new Error(`${file} does not export run(ctx)`);
      if (!report(mod.name ?? key, await mod.run(ctx))) failed += 1;
    } catch (error) {
      console.log(`FAIL ${key} (crashed)`);
      console.log(`  - ${error instanceof Error ? error.message : String(error)}`);
      failed += 1;
    }
  }
  console.log(failed === 0 ? 'ci: all checks passed' : `ci: ${failed} check(s) failed`);
  return failed === 0 ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
