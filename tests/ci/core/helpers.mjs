import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const READMES = ['Use case', 'Components', 'Requirements', 'Installation', 'Quick start', 'Verification', 'Support']
  .map((s) => `## ${s}\n\ntext\n`)
  .join('\n');

/** Plugin spec: { name, version?, dependencies?, files?: { relPath: content } }. */
export async function makeMarketplace(plugins, { catalogOverrides = {}, withDocs = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mp ci core-'));
  await mkdir(path.join(root, '.claude-plugin'), { recursive: true });
  const entries = [];
  for (const spec of plugins) {
    const dir = path.join(root, 'plugins', spec.name);
    await mkdir(path.join(dir, '.claude-plugin'), { recursive: true });
    const manifest = { name: spec.name, version: spec.version ?? '1.0.0' };
    if (spec.dependencies) manifest.dependencies = spec.dependencies;
    await writeFile(path.join(dir, '.claude-plugin', 'plugin.json'), JSON.stringify(manifest));
    if (withDocs) {
      await writeFile(path.join(dir, 'README.md'), READMES);
      await writeFile(path.join(dir, 'CHANGELOG.md'), '# Changelog\n');
      await writeFile(path.join(dir, 'COMPATIBILITY.md'), '# Compatibility\n');
    }
    for (const [rel, content] of Object.entries(spec.files ?? {})) {
      await mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
      await writeFile(path.join(dir, rel), content);
    }
    entries.push({ name: spec.name, source: `./plugins/${spec.name}`, ...(catalogOverrides[spec.name] ?? {}) });
  }
  await writeFile(path.join(root, '.claude-plugin', 'marketplace.json'), JSON.stringify({ name: 'fixture', plugins: entries }));
  return root;
}

export const cleanup = (root) => rm(root, { recursive: true, force: true });

export function ctxFor(root, extra = {}) {
  return {
    root,
    base: null,
    plugins: null,
    flags: { withCli: false, requireEvals: false, worktree: false, snapshot: false },
    config: { dependencyResolution: 'head-in-range' },
    git: null,
    ...extra,
  };
}

export const errorsOf = (result) => (Array.isArray(result) ? result : (result.errors ?? []));

export const dep = (name, version = '^1.0.0') => ({ name, version });
