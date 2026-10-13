// AC-73: the CLI silently ignores a range in the string form ("name@marketplace@range") while
// `claude plugin validate --strict` accepts it. Ranges are allowed only in the object form
// { "name": ..., "version": ... }.
import { cliMain } from './lib/check.mjs';
import { validRange } from './lib/semver.mjs';
import { loadWorld } from './lib/repo.mjs';

export const name = 'dep-form';

export async function run(ctx) {
  const world = await loadWorld(ctx.root, { plugins: ctx.plugins });
  if (world.catalogError) return [world.catalogError];
  const errors = [];
  for (const plugin of world.plugins) {
    if (!plugin.wanted || plugin.manifest === null) continue;
    const { dependencies } = plugin.manifest;
    if (dependencies === undefined) continue;
    if (!Array.isArray(dependencies)) {
      errors.push(`${plugin.name}: "dependencies" must be an array`);
      continue;
    }
    for (const dep of dependencies) {
      if (typeof dep === 'string') {
        const hasRange = dep.split('@').length > 2 || /[\^~<>=*|\s]/.test(dep);
        errors.push(
          hasRange
            ? `${plugin.name}: string dependency "${dep}" carries a range that the CLI ignores; use { "name", "version" }`
            : `${plugin.name}: string dependency "${dep}" has no version; use { "name", "version" }`,
        );
      } else if (dep === null || typeof dep !== 'object' || typeof dep.name !== 'string') {
        errors.push(`${plugin.name}: dependency entry must be an object with a "name"`);
      } else if (typeof dep.version !== 'string' || !validRange(dep.version)) {
        errors.push(`${plugin.name}: dependency "${dep.name}" needs a "version" range this checker understands, got ${JSON.stringify(dep.version)}`);
      }
    }
  }
  return errors;
}

await cliMain(import.meta.url, { name, run });
