// AC-29, AC-30: extracts the `system/init` message of a `claude -p --output-format stream-json
// --verbose` run (stream-json lines or a JSON message array, from stdin or --input), prints
// `plugins[]` (name, redacted path) and `plugin_errors`, and asserts them.
//   node scripts/evidence/extract-init.mjs --catalog <name> --version <sdd version>
//        [--all name=version,name=version,...] [--input <file>]
// Asserts the sdd-engineering path ends with /<catalog>/sdd-engineering/<version> and that
// plugin_errors is empty or absent. `--all` asserts the same suffix rule for each listed plugin.
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { findInit, main, parseMessages, readInput, table } from './lib/common.mjs';
import { redact } from './lib/redact.mjs';

export function parseExpected(all) {
  const out = new Map();
  for (const part of String(all ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const eq = part.lastIndexOf('=');
    if (eq < 1) throw new Error(`--all entry "${part}" must be name=version`);
    out.set(part.slice(0, eq), part.slice(eq + 1));
  }
  return out;
}

export function assertInit(init, { catalog, version, all }) {
  const failures = [];
  const plugins = Array.isArray(init?.plugins) ? init.plugins : [];
  const expected = new Map([['sdd-engineering', version], ...parseExpected(all)]);
  const normalized = (p) => String(p ?? '').replace(/\\/g, '/').replace(/\/+$/, '');
  for (const [name, wanted] of expected) {
    const entry = plugins.find((p) => p?.name === name);
    if (!entry) {
      failures.push(`plugins[] has no entry named ${name}`);
      continue;
    }
    const suffix = `/${catalog}/${name}/${wanted}`;
    if (!normalized(entry.path).endsWith(suffix)) failures.push(`${name}: path does not end with ${suffix}`);
  }
  const errors = init?.plugin_errors;
  if (Array.isArray(errors) ? errors.length > 0 : errors !== undefined && errors !== null) {
    failures.push('plugin_errors is not empty');
  }
  return { ok: failures.length === 0, failures, plugins, pluginErrors: errors ?? [] };
}

export function render(result) {
  return [
    'system/init excerpt',
    '',
    table(['name', 'path'], result.plugins.map((p) => [p.name, redact(p.path ?? '')])),
    '',
    `plugin_errors: ${redact(JSON.stringify(result.pluginErrors))}`,
    '',
    ...result.failures.map((f) => `- FAIL ${f}`),
    result.ok ? 'PASS' : 'FAIL',
  ].join('\n');
}

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: { catalog: { type: 'string' }, version: { type: 'string' }, all: { type: 'string' }, input: { type: 'string' } },
    strict: true,
  });
  if (!values.catalog || !values.version) throw new Error('--catalog <name> and --version <sdd version> are required');
  const init = findInit(parseMessages(readInput(values.input)));
  if (!init) {
    console.log('FAIL: no system/init message in the input');
    return 1;
  }
  const result = assertInit(init, values);
  console.log(render(result));
  return result.ok ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main(() => run(process.argv.slice(2)));
