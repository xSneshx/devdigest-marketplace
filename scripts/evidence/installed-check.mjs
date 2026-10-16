// AC-25: compares the installed `sdd-engineering` record with the channel's commit and counts the
// Assumptions section in the installed spec-creator agent.
//   node scripts/evidence/installed-check.mjs --catalog <name> --expect-sha <sha>
//        --assumptions 0|>=1 [--project <path>] [--installed-file <file>]
// Reads the installed-plugins record from the home directory (os.homedir()) unless
// --installed-file is given. A missing `gitCommitSha` field is reported as "field absent" and
// does not fail the SHA comparison (the field is undocumented).
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { main } from './lib/common.mjs';
import { redact } from './lib/redact.mjs';

const MARKER = '## Assumptions';

export function findRecord(installed, catalog, project) {
  const records = installed?.plugins?.[`sdd-engineering@${catalog}`];
  if (!Array.isArray(records)) return null;
  const projectRecords = records.filter((r) => r.scope === 'project' && (!project || path.resolve(r.projectPath ?? '') === path.resolve(project)));
  return projectRecords[0] ?? null;
}

export function countMarker(text) {
  return text.split(/\r?\n/).filter((line) => line.includes(MARKER)).length;
}

export function shaMatches(actual, expected) {
  const [a, e] = [String(actual).toLowerCase(), String(expected).toLowerCase()];
  return e.length >= 7 && (a.startsWith(e) || e.startsWith(a));
}

export function check({ record, expectSha, assumptions, readAgent }) {
  const failures = [];
  const lines = [];
  if (!record) return { ok: false, lines, failures: ['no project-scope sdd-engineering record for this catalog'] };
  if (record.gitCommitSha === undefined) {
    lines.push('gitCommitSha: field absent');
  } else if (shaMatches(record.gitCommitSha, expectSha)) {
    lines.push(`gitCommitSha: ${record.gitCommitSha} equals expected ${expectSha}`);
  } else {
    lines.push(`gitCommitSha: ${record.gitCommitSha}`);
    failures.push(`installed gitCommitSha ${record.gitCommitSha} differs from expected ${expectSha}`);
  }
  let count;
  try {
    count = countMarker(readAgent(path.join(record.installPath, 'agents', 'spec-creator.md')));
  } catch (error) {
    return { ok: false, lines, failures: [...failures, `cannot read installed spec-creator: ${error.message}`] };
  }
  lines.push(`installPath: ${redact(record.installPath)}`, `version: ${record.version}`, `Assumptions marker count: ${count}`);
  if (assumptions === '0' && count !== 0) failures.push(`expected 0 Assumptions markers, found ${count}`);
  if (assumptions === '>=1' && count < 1) failures.push(`expected at least 1 Assumptions marker, found ${count}`);
  return { ok: failures.length === 0, lines, failures };
}

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      catalog: { type: 'string' }, 'expect-sha': { type: 'string' }, assumptions: { type: 'string' },
      project: { type: 'string' }, 'installed-file': { type: 'string' },
    },
    strict: true,
  });
  if (!values.catalog || !values['expect-sha'] || !['0', '>=1'].includes(values.assumptions ?? '')) {
    throw new Error('--catalog, --expect-sha and --assumptions 0|>=1 are required');
  }
  const file = values['installed-file'] ?? path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
  const installed = JSON.parse(readFileSync(file, 'utf8'));
  const result = check({
    record: findRecord(installed, values.catalog, values.project),
    expectSha: values['expect-sha'],
    assumptions: values.assumptions,
    readAgent: (p) => readFileSync(p, 'utf8'),
  });
  console.log([...result.lines, ...result.failures.map((f) => `- FAIL ${f}`), result.ok ? 'PASS' : 'FAIL'].join('\n'));
  return result.ok ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main(() => run(process.argv.slice(2)));
