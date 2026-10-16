// AC-21, AC-22, AC-23: asserts a `claude plugin list --json` capture (read from stdin or --input).
//   node scripts/evidence/assert-plugin-list.mjs --project <path> --channel latest|stable
//        [--sdd <version>] [--partial] [--input <file>]
// Full mode (after a switch) checks AC-23 + AC-21 + AC-22. `--partial` (mid-switch capture) checks
// only AC-22. Asserts on `errors` / `errorDetails`, never on `enabled`: an unsatisfied dependency
// still shows `enabled: true` and fails only there. Prints a Markdown table and PASS/FAIL.
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { CATALOG, DEP_VERSION, PLUGINS, SDD_VERSION, main, readInput, table } from './lib/common.mjs';
import { redact } from './lib/redact.mjs';

const nonEmpty = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '' && !(typeof v === 'object' && Object.keys(v).length === 0));
const splitId = (id) => {
  const at = String(id).lastIndexOf('@');
  return at < 0 ? { plugin: String(id), catalog: '' } : { plugin: id.slice(0, at), catalog: id.slice(at + 1) };
};
const samePath = (a, b) => typeof a === 'string' && path.resolve(a) === path.resolve(b);

/** Entries that apply to `project`: its project-scope entries plus every non-project-scope entry. */
export function relevantEntries(list, project) {
  return list.filter((e) => (e.scope === 'project' ? samePath(e.projectPath, project) : true));
}

export function assertPluginList(list, { project, channel, sdd, partial = false }) {
  if (!Array.isArray(list)) throw new Error('plugin list input is not a JSON array');
  const failures = [];
  const relevant = relevantEntries(list, project);

  // AC-22: no two enabled entries with the same manifest name, at any scope.
  const byName = new Map();
  for (const e of relevant) {
    if (e.enabled === false) continue;
    const { plugin } = splitId(e.id);
    byName.set(plugin, [...(byName.get(plugin) ?? []), e.id]);
  }
  for (const [plugin, ids] of byName) {
    if (ids.length > 1) failures.push(`AC-22: plugin "${plugin}" is enabled more than once (${ids.join(', ')})`);
  }

  if (!partial) {
    const catalog = CATALOG[channel];
    const other = CATALOG[channel === 'stable' ? 'latest' : 'stable'];
    const sddVersion = sdd ?? SDD_VERSION[channel];
    const mine = relevant.filter((e) => e.scope === 'project');

    // AC-21: nothing from the other channel's catalog remains for this project.
    for (const e of relevant) {
      if (splitId(e.id).catalog === other) failures.push(`AC-21: id from the other channel remains (${e.id})`);
    }
    // AC-23
    if (mine.length !== 5) failures.push(`AC-23: expected exactly 5 project entries, found ${mine.length}`);
    for (const plugin of PLUGINS) {
      const id = `${plugin}@${catalog}`;
      const matches = mine.filter((e) => e.id === id);
      if (matches.length !== 1) {
        failures.push(`AC-23: ${id} expected once at project scope, found ${matches.length}`);
        continue;
      }
      const e = matches[0];
      const version = plugin === 'sdd-engineering' ? sddVersion : DEP_VERSION;
      if (e.enabled !== true) failures.push(`AC-23: ${id} is not enabled`);
      if (e.version !== version) failures.push(`AC-23: ${id} version ${e.version} expected ${version}`);
      if (nonEmpty(e.errors)) failures.push(`AC-23: ${id} reports errors`);
      if (nonEmpty(e.errorDetails)) failures.push(`AC-23: ${id} reports errorDetails`);
      if (typeof e.installPath !== 'string' || !e.installPath.replace(/[\\/]+$/, '').endsWith(`/${version}`)) {
        failures.push(`AC-23: ${id} installPath does not end with /${version}`);
      }
    }
    for (const e of mine) {
      if (!PLUGINS.includes(splitId(e.id).plugin) || splitId(e.id).catalog !== catalog) {
        failures.push(`AC-23: unexpected project entry ${e.id}`);
      }
    }
  }
  return { ok: failures.length === 0, failures, entries: relevant };
}

export function render(result, options) {
  const rows = result.entries.map((e) => [
    e.id, e.version, e.scope, String(e.enabled), nonEmpty(e.errors) || nonEmpty(e.errorDetails) ? 'yes' : 'none',
    redact(e.installPath ?? ''),
  ]);
  const lines = [
    `Plugin list assertion (${options.partial ? 'partial: AC-22 only' : `channel ${options.channel}`})`,
    '',
    table(['id', 'version', 'scope', 'enabled', 'errors', 'installPath'], rows),
    '',
    ...result.failures.map((f) => `- FAIL ${f}`),
    result.ok ? 'PASS' : 'FAIL',
  ];
  return lines.join('\n');
}

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      project: { type: 'string' }, channel: { type: 'string' }, sdd: { type: 'string' },
      partial: { type: 'boolean', default: false }, input: { type: 'string' },
    },
    strict: true,
  });
  if (!values.project) throw new Error('--project <path> is required');
  if (!values.partial && !Object.hasOwn(CATALOG, values.channel ?? '')) throw new Error('--channel latest|stable is required');
  const result = assertPluginList(JSON.parse(readInput(values.input)), values);
  console.log(render(result, values));
  return result.ok ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main(() => run(process.argv.slice(2)));
