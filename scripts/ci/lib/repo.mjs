import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export async function readJson(file) {
  try {
    return { value: JSON.parse(await readFile(file, 'utf8')) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function isDirectory(p) {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

export async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Recursive listing, POSIX-style relative paths. Skips only `.git`. */
export async function walk(dir) {
  const files = [];
  const dirs = [];
  async function visit(current, prefix) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === '.git') continue;
      const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        dirs.push(rel);
        await visit(path.join(current, entry.name), rel);
      } else {
        files.push(rel);
      }
    }
  }
  await visit(dir, '');
  return { files: files.sort(), dirs: dirs.sort() };
}

/** True when `child` resolves to `parent` or something inside it. */
export function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * Loads the catalog and, for every catalog entry whose string source resolves to a directory
 * inside the repository, the plugin manifest. Problems are returned, never thrown: the checks
 * decide which of them to report so that one broken plugin does not hide the others.
 */
export async function loadWorld(root, { plugins: filter = null } = {}) {
  const catalogPath = path.join(root, '.claude-plugin', 'marketplace.json');
  const parsed = await readJson(catalogPath);
  if (parsed.error) return { catalogError: `.claude-plugin/marketplace.json: ${parsed.error}`, entries: [], plugins: [] };
  const catalog = parsed.value;
  if (!catalog || !Array.isArray(catalog.plugins)) {
    return { catalogError: '.claude-plugin/marketplace.json: "plugins" must be an array', entries: [], plugins: [] };
  }
  const entries = catalog.plugins;
  const plugins = [];
  for (const entry of entries) {
    if (!entry || typeof entry.name !== 'string') continue;
    const wanted = filter === null || filter.includes(entry.name);
    const source = typeof entry.source === 'string' ? entry.source : null;
    const dir = source === null ? null : path.resolve(root, source);
    const insideRepo = dir !== null && !source.split(/[\\/]/).includes('..') && isInside(root, dir);
    const plugin = {
      name: entry.name,
      entry,
      wanted,
      source,
      dir: insideRepo ? dir : null,
      relDir: insideRepo ? path.relative(root, dir).split(path.sep).join('/') : null,
      manifest: null,
      manifestError: null,
    };
    if (plugin.dir !== null) {
      const manifest = await readJson(path.join(plugin.dir, '.claude-plugin', 'plugin.json'));
      if (manifest.error) plugin.manifestError = manifest.error;
      else plugin.manifest = manifest.value;
    }
    plugins.push(plugin);
  }
  return { catalogError: null, entries, plugins };
}

/** Agent, skill and command markdown files of one plugin: `[{ kind, rel, abs }]`. */
export async function componentFiles(plugin) {
  const out = [];
  if (plugin.dir === null) return out;
  const listMd = async (sub, kind, deep) => {
    const base = path.join(plugin.dir, sub);
    if (!(await isDirectory(base))) return;
    if (!deep) {
      for (const entry of await readdir(base, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          out.push({ kind, rel: `${sub}/${entry.name}`, abs: path.join(base, entry.name) });
        }
      }
      return;
    }
    for (const entry of await readdir(base, { withFileTypes: true })) {
      const skillFile = path.join(base, entry.name, 'SKILL.md');
      if (entry.isDirectory() && (await exists(skillFile))) {
        out.push({ kind, rel: `${sub}/${entry.name}/SKILL.md`, abs: skillFile });
      }
    }
  };
  await listMd('agents', 'agent', false);
  await listMd('commands', 'command', false);
  await listMd('skills', 'skill', true);
  return out;
}
