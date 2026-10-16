import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { invocation } from '../src/contract/commands';
import { componentId, type ComponentKind, type SiteComponent } from '../src/contract/site-index';
import { IndexError } from './errors';
import { asBool, asString, parseFrontmatter, parseToolList } from './frontmatter';
import { compatibilityRow, splitChangelog, type ChangelogSection } from './markdown';

const CatalogEntry = z.object({
  name: z.string().min(1),
  source: z.string().min(1),
  version: z.string().optional(),
  description: z.string().optional(),
  author: z.union([z.string(), z.object({ name: z.string().optional() }).passthrough()]).optional(),
  keywords: z.array(z.string()).optional(),
});

const CatalogFile = z.object({
  name: z.string().min(1),
  owner: z.object({ name: z.string().optional() }).passthrough().optional(),
  plugins: z.array(CatalogEntry),
});

export type CatalogEntry = z.infer<typeof CatalogEntry>;

export interface Catalog {
  name: string;
  ownerName: string;
  plugins: CatalogEntry[];
}

export interface ParsedPlugin {
  name: string;
  version: string;
  description: string;
  author: string;
  keywords: string[];
  dependencies: { name: string; range: string }[];
  /** Repository-relative, forward slashes. */
  sourcePath: string;
  compatibility?: string;
  readme?: string;
  /** Newest section first as written in the file; dates are attached later from release tags. */
  changelog: ChangelogSection[];
  components: SiteComponent[];
}

const CATALOG_REL = '.claude-plugin/marketplace.json';

const posix = (p: string): string => p.split(path.sep).join('/');

function readText(file: string): string | undefined {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw err;
  }
}

function readJson(file: string, rel: string): unknown {
  const text = readText(file);
  if (text === undefined) throw new IndexError(rel, 'file not found');
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new IndexError(rel, `invalid JSON: ${err instanceof Error ? err.message : 'parse error'}`);
  }
}

function isInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function listDir(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

export function readCatalog(root: string): Catalog {
  const rel = CATALOG_REL;
  const parsed = CatalogFile.safeParse(readJson(path.join(root, rel), rel));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new IndexError(rel, `invalid catalog: ${issue?.path.join('.') ?? ''} ${issue?.message ?? ''}`.trim());
  }
  return {
    name: parsed.data.name,
    ownerName: parsed.data.owner?.name ?? '',
    plugins: parsed.data.plugins,
  };
}

function authorName(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return asString((value as Record<string, unknown>).name);
  return undefined;
}

function readDependencies(manifest: Record<string, unknown>): { name: string; range: string }[] {
  const raw = manifest.dependencies;
  if (!Array.isArray(raw)) return [];
  const out: { name: string; range: string }[] = [];
  for (const dep of raw) {
    if (typeof dep === 'string') {
      out.push({ name: dep, range: '*' });
    } else if (dep && typeof dep === 'object') {
      const d = dep as Record<string, unknown>;
      const name = asString(d.name);
      if (name) out.push({ name, range: asString(d.version) ?? asString(d.range) ?? '*' });
    }
  }
  return out;
}

function makeComponent(
  kind: ComponentKind,
  plugin: string,
  name: string,
  file: string,
  fields: Partial<SiteComponent>,
): SiteComponent {
  const inv = invocation(kind, plugin, name);
  return {
    id: componentId(kind, plugin, name),
    kind,
    plugin,
    name,
    description: '',
    path: file,
    ...(inv ? { invocation: inv } : {}),
    ...fields,
  };
}

function readMarkdownComponent(
  kind: 'skill' | 'agent' | 'command',
  plugin: string,
  fallbackName: string,
  absFile: string,
  relFile: string,
): SiteComponent {
  const text = readText(absFile);
  if (text === undefined) throw new IndexError(relFile, 'file not found');
  const { data, body } = parseFrontmatter(text, relFile);
  const name = asString(data.name) || fallbackName;
  const fields: Partial<SiteComponent> = {
    description: asString(data.description) ?? '',
    body: body.trim(),
  };
  if (asBool(data['disable-model-invocation'])) fields.manualOnly = true;
  if (kind === 'agent') {
    const tools = parseToolList(data.tools);
    const disallowed = parseToolList(data.disallowedTools);
    const model = asString(data.model);
    if (tools.length > 0) fields.tools = tools;
    if (disallowed.length > 0) fields.disallowedTools = disallowed;
    if (model) fields.model = model;
  }
  if (kind === 'command') {
    const hint = asString(data['argument-hint']);
    if (hint) fields.argumentHint = hint;
  }
  return makeComponent(kind, plugin, name, relFile, fields);
}

function readHooks(plugin: string, absFile: string, relFile: string): SiteComponent[] {
  if (readText(absFile) === undefined) return [];
  const json = readJson(absFile, relFile) as { hooks?: unknown };
  const events = json && typeof json === 'object' ? json.hooks : undefined;
  if (!events || typeof events !== 'object') return [];

  const out: SiteComponent[] = [];
  for (const [event, groups] of Object.entries(events as Record<string, unknown>)) {
    if (!Array.isArray(groups)) continue;
    groups.forEach((group, i) => {
      const g = (group && typeof group === 'object' ? group : {}) as Record<string, unknown>;
      const first = Array.isArray(g.hooks) ? (g.hooks[0] as Record<string, unknown> | undefined) : undefined;
      const fields: Partial<SiteComponent> = { event };
      const matcher = asString(g.matcher);
      if (matcher) fields.matcher = matcher;
      if (typeof first?.timeout === 'number') fields.timeout = first.timeout;
      out.push(makeComponent('hook', plugin, groups.length > 1 ? `${event}-${i + 1}` : event, relFile, fields));
    });
  }
  return out;
}

function mcpKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>);
}

function readMcp(
  plugin: string,
  pluginDir: string,
  pluginRel: string,
  manifest: Record<string, unknown>,
): SiteComponent[] {
  const found = new Map<string, string>();
  const add = (keys: string[], file: string) => {
    for (const key of keys) if (!found.has(key)) found.set(key, file);
  };

  const declared = manifest.mcpServers;
  const manifestRel = `${pluginRel}/.claude-plugin/plugin.json`;
  if (typeof declared === 'string') {
    const abs = path.resolve(pluginDir, declared);
    if (!isInside(pluginDir, abs)) throw new IndexError(manifestRel, 'mcpServers path leaves the plugin directory');
    const rel = posix(path.join(pluginRel, path.relative(pluginDir, abs)));
    if (readText(abs) !== undefined) {
      const json = readJson(abs, rel) as Record<string, unknown>;
      add(mcpKeys(json?.mcpServers ?? json), rel);
    }
  } else {
    add(mcpKeys(declared), manifestRel);
  }

  const dotRel = `${pluginRel}/.mcp.json`;
  const dotAbs = path.join(pluginDir, '.mcp.json');
  if (readText(dotAbs) !== undefined) {
    const json = readJson(dotAbs, dotRel) as Record<string, unknown>;
    add(mcpKeys(json?.mcpServers), dotRel);
  }

  return [...found].map(([name, file]) => makeComponent('mcp', plugin, name, file, {}));
}

function readOnePlugin(root: string, entry: CatalogEntry): ParsedPlugin {
  const pluginDir = path.resolve(root, entry.source);
  if (!isInside(root, pluginDir) || pluginDir === path.resolve(root)) {
    throw new IndexError(CATALOG_REL, `source of plugin "${entry.name}" is outside the repository: ${entry.source}`);
  }
  let isDir = false;
  try {
    isDir = fs.statSync(pluginDir).isDirectory();
  } catch {
    isDir = false;
  }
  const pluginRel = posix(path.relative(root, pluginDir));
  if (!isDir) {
    throw new IndexError(CATALOG_REL, `source of plugin "${entry.name}" is not a directory: ${pluginRel}`);
  }

  const manifestRel = `${pluginRel}/.claude-plugin/plugin.json`;
  const manifestRaw = readJson(path.join(pluginDir, '.claude-plugin', 'plugin.json'), manifestRel);
  if (!manifestRaw || typeof manifestRaw !== 'object' || Array.isArray(manifestRaw)) {
    throw new IndexError(manifestRel, 'manifest must be a JSON object');
  }
  const manifest = manifestRaw as Record<string, unknown>;

  const manifestName = asString(manifest.name);
  if (manifestName !== entry.name) {
    throw new IndexError(manifestRel, `plugin "${entry.name}": catalog name and manifest name "${manifestName ?? ''}" disagree`);
  }
  const manifestVersion = asString(manifest.version);
  if (entry.version !== undefined && manifestVersion !== undefined && entry.version !== manifestVersion) {
    throw new IndexError(
      manifestRel,
      `plugin "${entry.name}": catalog version ${entry.version} and manifest version ${manifestVersion} disagree`,
    );
  }
  const version = manifestVersion ?? entry.version;
  if (!version) throw new IndexError(manifestRel, `plugin "${entry.name}" has no version`);

  const readme = readText(path.join(pluginDir, 'README.md'));
  const changelog = readText(path.join(pluginDir, 'CHANGELOG.md'));
  const compat = readText(path.join(pluginDir, 'COMPATIBILITY.md'));

  const components: SiteComponent[] = [];
  for (const dir of listDir(path.join(pluginDir, 'skills'))) {
    if (!dir.isDirectory()) continue;
    const abs = path.join(pluginDir, 'skills', dir.name, 'SKILL.md');
    if (readText(abs) === undefined) continue;
    components.push(readMarkdownComponent('skill', entry.name, dir.name, abs, `${pluginRel}/skills/${dir.name}/SKILL.md`));
  }
  for (const [kind, folder] of [['agent', 'agents'], ['command', 'commands']] as const) {
    for (const file of listDir(path.join(pluginDir, folder))) {
      if (!file.isFile() || !file.name.endsWith('.md')) continue;
      const base = file.name.slice(0, -'.md'.length);
      components.push(
        readMarkdownComponent(kind, entry.name, base, path.join(pluginDir, folder, file.name), `${pluginRel}/${folder}/${file.name}`),
      );
    }
  }
  components.push(...readHooks(entry.name, path.join(pluginDir, 'hooks', 'hooks.json'), `${pluginRel}/hooks/hooks.json`));
  components.push(...readMcp(entry.name, pluginDir, pluginRel, manifest));

  const keywords =
    entry.keywords ?? (Array.isArray(manifest.keywords) ? manifest.keywords.filter((k): k is string => typeof k === 'string') : []);

  const compatibility = compat === undefined ? undefined : compatibilityRow(compat, 'Claude Code');

  return {
    name: entry.name,
    version,
    description: asString(manifest.description) ?? entry.description ?? '',
    author: authorName(manifest.author) ?? authorName(entry.author) ?? '',
    keywords,
    dependencies: readDependencies(manifest),
    sourcePath: pluginRel,
    ...(compatibility ? { compatibility } : {}),
    ...(readme !== undefined ? { readme } : {}),
    changelog: changelog === undefined ? [] : splitChangelog(changelog),
    components,
  };
}

/** Reads every catalog plugin. Files are only read as text or JSON data; nothing inside a plugin is ever run. */
export function readPlugins(root: string, catalog: Catalog): ParsedPlugin[] {
  const absRoot = path.resolve(root);
  return catalog.plugins.map((entry) => readOnePlugin(absRoot, entry));
}
