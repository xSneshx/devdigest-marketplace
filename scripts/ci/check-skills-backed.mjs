// AC-71: every cross-plugin `skills:` entry of an agent is backed by a declared dependency
// (frontmatter injects at run time, `dependencies` installs at install time; neither replaces
// the other).
import { readFile } from 'node:fs/promises';
import { cliMain } from './lib/check.mjs';
import { asList, parseFrontmatter } from './lib/frontmatter.mjs';
import { componentFiles, loadWorld } from './lib/repo.mjs';
import { dependencyNames } from './check-graph.mjs';

export const name = 'skills-backed';

export async function run(ctx) {
  const world = await loadWorld(ctx.root, { plugins: ctx.plugins });
  if (world.catalogError) return [world.catalogError];
  const errors = [];
  const names = new Set(world.plugins.map((p) => p.name));
  for (const plugin of world.plugins) {
    if (!plugin.wanted) continue;
    const declared = new Set(dependencyNames(plugin.manifest));
    for (const file of await componentFiles(plugin)) {
      if (file.kind !== 'agent') continue;
      const { data } = parseFrontmatter(await readFile(file.abs, 'utf8'));
      for (const entry of asList(data.skills)) {
        const colon = entry.indexOf(':');
        if (colon === -1) continue;
        const owner = entry.slice(0, colon);
        if (owner === plugin.name) continue;
        if (!names.has(owner)) {
          errors.push(`${plugin.name}: ${file.rel} lists skill "${entry}" from "${owner}", which is not a plugin of this catalog`);
        } else if (!declared.has(owner)) {
          errors.push(`${plugin.name}: ${file.rel} lists skill "${entry}" but ${plugin.name} does not declare a dependency on "${owner}"`);
        }
      }
    }
  }
  return errors;
}

await cliMain(import.meta.url, { name, run });
