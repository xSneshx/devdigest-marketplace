// AC-76 fallback rule: while `config.json` `dependencyResolution` is "head-in-range", every
// plugin's manifest version at HEAD must satisfy the range of every dependent in the catalog.
// A release that moves a dependency outside a dependent's range fails here.
import { cliMain } from './lib/check.mjs';
import { satisfies } from './lib/semver.mjs';
import { loadWorld } from './lib/repo.mjs';

export const name = 'head-in-range';

export async function run(ctx) {
  const rule = ctx.config?.dependencyResolution ?? 'head-in-range';
  if (rule !== 'head-in-range') return { errors: [], skipped: `dependencyResolution is "${rule}"` };
  const world = await loadWorld(ctx.root); // all dependents, whatever `--plugin` says
  if (world.catalogError) return [world.catalogError];
  const versions = new Map(world.plugins.map((p) => [p.name, p.manifest?.version]));
  const errors = [];
  for (const plugin of world.plugins) {
    if (!plugin.wanted || plugin.manifest === null || !Array.isArray(plugin.manifest.dependencies)) continue;
    for (const dep of plugin.manifest.dependencies) {
      if (dep === null || typeof dep !== 'object' || typeof dep.version !== 'string') continue; // dep-form reports it
      const actual = versions.get(dep.name);
      if (actual === undefined) continue; // graph reports a missing dependency
      try {
        if (!satisfies(actual, dep.version)) {
          errors.push(`${plugin.name}: requires ${dep.name} ${dep.version}, but ${dep.name} is at ${actual} on HEAD`);
        }
      } catch (error) {
        errors.push(`${plugin.name}: dependency ${dep.name}: ${error.message}`);
      }
    }
  }
  return errors;
}

await cliMain(import.meta.url, { name, run });
