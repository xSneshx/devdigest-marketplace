// AC-6: catalog entry name == manifest name, entry version (if present) == manifest version,
// and every entry source is an existing directory inside the repository.
import path from 'node:path';
import { cliMain } from './lib/check.mjs';
import { isDirectory, loadWorld } from './lib/repo.mjs';

export const name = 'catalog';

export async function run(ctx) {
  const world = await loadWorld(ctx.root, { plugins: ctx.plugins });
  if (world.catalogError) return [world.catalogError];
  const errors = [];
  const seen = new Set();
  for (const plugin of world.plugins) {
    const label = plugin.name;
    if (seen.has(label)) errors.push(`${label}: duplicate catalog entry`);
    seen.add(label);
    if (!plugin.wanted) continue;
    if (plugin.source === null) {
      errors.push(`${label}: catalog source must be a relative path string`);
      continue;
    }
    if (plugin.source.split(/[\\/]/).includes('..') || path.isAbsolute(plugin.source)) {
      errors.push(`${label}: source "${plugin.source}" must stay inside the repository (no "..", not absolute)`);
      continue;
    }
    if (plugin.dir === null || !(await isDirectory(plugin.dir))) {
      errors.push(`${label}: source "${plugin.source}" is not an existing directory in the repository`);
      continue;
    }
    if (plugin.manifestError) {
      errors.push(`${label}: cannot read plugin manifest: ${plugin.manifestError}`);
      continue;
    }
    if (plugin.manifest.name !== plugin.entry.name) {
      errors.push(`${label}: catalog name "${plugin.entry.name}" differs from manifest name "${plugin.manifest.name}"`);
    }
    if (plugin.entry.version !== undefined && plugin.entry.version !== plugin.manifest.version) {
      errors.push(`${label}: catalog version "${plugin.entry.version}" differs from manifest version "${plugin.manifest.version}"`);
    }
  }
  return errors;
}

await cliMain(import.meta.url, { name, run });
