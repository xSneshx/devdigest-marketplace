// AC-9: a plugin whose files changed against the base ref must carry a new manifest version,
// but only once its current version is released (tag `<plugin>--v<version>` exists); changes
// to an unreleased version are fine. A version must never go down against the base.
// Skipped when there is no usable base (first push, local run without --base).
import { cliMain } from './lib/check.mjs';
import { compare, parseVersion } from './lib/semver.mjs';
import { loadWorld } from './lib/repo.mjs';

export const name = 'versions';

export async function run(ctx) {
  if (!ctx.base) return { errors: [], skipped: 'no base ref (set --base <ref> or GITHUB_BASE_REF)' };
  const sha = ctx.git.resolve(ctx.base);
  if (!sha) return { errors: [], skipped: `base ref "${ctx.base}" does not resolve` };
  const world = await loadWorld(ctx.root, { plugins: ctx.plugins });
  if (world.catalogError) return [world.catalogError];
  const changed = ctx.git.changedFiles(sha);
  const errors = [];
  for (const plugin of world.plugins) {
    if (!plugin.wanted || plugin.relDir === null || plugin.manifest === null) continue;
    const touched = changed.filter((file) => file.startsWith(`${plugin.relDir}/`));
    const before = ctx.git.fileAt(sha, `${plugin.relDir}/.claude-plugin/plugin.json`);
    if (before === null) continue; // new plugin: nothing to bump against
    let previous;
    try {
      previous = JSON.parse(before).version;
    } catch {
      errors.push(`${plugin.name}: manifest at base ${ctx.base} is not valid JSON`);
      continue;
    }
    const [was, now] = [parseVersion(previous), parseVersion(plugin.manifest.version)];
    if (was && now && compare(now, was) < 0) {
      errors.push(`${plugin.name}: version went down from ${previous} (${ctx.base}) to ${plugin.manifest.version}`);
      continue;
    }
    if (touched.length === 0) continue;
    if (previous === plugin.manifest.version && ctx.git.hasTag(`${plugin.name}--v${plugin.manifest.version}`)) {
      const sample = touched.slice(0, 3).join(', ');
      errors.push(`${plugin.name}: ${touched.length} file(s) changed since ${ctx.base} (${sample}) but released version ${previous} (tag ${plugin.name}--v${previous}) is unchanged; bump it`);
    }
  }
  return errors;
}

await cliMain(import.meta.url, { name, run });
