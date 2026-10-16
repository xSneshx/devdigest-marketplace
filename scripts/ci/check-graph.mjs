// AC-8: every declared dependency names a plugin of this catalog, and the graph has no cycle.
import { cliMain } from './lib/check.mjs';
import { loadWorld } from './lib/repo.mjs';

export const name = 'graph';

export function dependencyNames(manifest) {
  if (!manifest || !Array.isArray(manifest.dependencies)) return [];
  return manifest.dependencies
    .map((dep) => (typeof dep === 'string' ? dep.split('@')[0] : dep?.name))
    .filter((n) => typeof n === 'string');
}

export async function run(ctx) {
  const world = await loadWorld(ctx.root); // the whole graph, whatever `--plugin` says
  if (world.catalogError) return [world.catalogError];
  const errors = [];
  const names = new Set(world.plugins.map((p) => p.name));
  const edges = new Map();
  for (const plugin of world.plugins) {
    const deps = dependencyNames(plugin.manifest);
    edges.set(plugin.name, deps);
    if (!plugin.wanted) continue;
    for (const dep of deps) {
      if (dep === plugin.name) errors.push(`${plugin.name}: depends on itself`);
      else if (!names.has(dep)) errors.push(`${plugin.name}: dependency "${dep}" is not a plugin of this catalog`);
    }
  }

  const state = new Map(); // 1 = on the stack, 2 = done
  const reported = new Set();
  const visit = (node, stack) => {
    state.set(node, 1);
    for (const next of edges.get(node) ?? []) {
      if (!edges.has(next) || next === node) continue;
      if (state.get(next) === 1) {
        const cycle = [...stack.slice(stack.indexOf(next)), node, next];
        const key = [...new Set(cycle)].sort().join(',');
        if (!reported.has(key)) {
          reported.add(key);
          errors.push(`${cycle[0]}: dependency cycle ${cycle.join(' -> ')}`);
        }
      } else if (!state.has(next)) {
        visit(next, [...stack, node]);
      }
    }
    state.set(node, 2);
  };
  for (const node of edges.keys()) if (!state.has(node)) visit(node, []);
  return errors;
}

await cliMain(import.meta.url, { name, run });
