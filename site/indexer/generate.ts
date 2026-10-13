import { installCommand, invocation } from '../src/contract/commands';
import {
  ComponentKind,
  SiteIndex,
  type SiteComponent,
  type SitePlugin,
} from '../src/contract/site-index';
import type { GitSource } from './git-source';
import { buildReleases, datedChangelog, parseReleaseTag, pluginUpdated } from './releases';
import { readCatalog, readPlugins } from './read-plugins';
import type { RepoIdentity } from './repo-identity';

export interface GenerateInput {
  root: string;
  git: GitSource;
  repo: RepoIdentity;
  now: Date;
}

const KIND_STATS = { skill: 'skills', agent: 'agents', command: 'commands', hook: 'hooks', mcp: 'mcp' } as const;

function emptyCounts(): SitePlugin['counts'] {
  return Object.fromEntries(ComponentKind.options.map((k) => [k, 0])) as SitePlugin['counts'];
}

/** Composes the catalog readers and the git source into a validated SiteIndex. Throws on any inconsistency. */
export function generateIndex({ root, git, repo, now }: GenerateInput): SiteIndex {
  const catalog = readCatalog(root);
  const parsed = readPlugins(root, catalog);
  const tags = git.tags();
  const head = git.head();
  const marketplace = catalog.name;

  const dependents = new Map<string, string[]>();
  for (const plugin of parsed) {
    for (const dep of plugin.dependencies) {
      const list = dependents.get(dep.name) ?? [];
      list.push(plugin.name);
      dependents.set(dep.name, list);
    }
  }

  const changelogs = new Map(parsed.map((p) => [p.name, p.changelog]));
  const releases = buildReleases({
    tags,
    changelogs,
    evidenceFiles: git.evidenceFiles(),
    repo,
    pluginNames: parsed.map((p) => p.name),
  });
  const releaseTagCount = tags.filter((t) => {
    const p = parseReleaseTag(t.name);
    return p !== undefined && parsed.some((x) => x.name === p.plugin);
  }).length;

  const components: SiteComponent[] = [];
  const plugins: SitePlugin[] = parsed.map((p) => {
    const counts = emptyCounts();
    for (const c of p.components) {
      counts[c.kind] += 1;
      components.push({ ...c, invocation: invocation(c.kind, p.name, c.name) });
    }
    const hasTag = tags.some((t) => t.name === `${p.name}--v${p.version}`);
    return {
      name: p.name,
      version: p.version,
      description: p.description,
      author: p.author,
      keywords: p.keywords,
      dependencies: p.dependencies,
      dependents: [...(dependents.get(p.name) ?? [])].sort((a, b) => a.localeCompare(b, 'en')),
      installCommand: installCommand(p.name, marketplace),
      sourcePath: p.sourcePath,
      url: `${repo.url}/tree/${repo.defaultBranch}/${p.sourcePath}`,
      ...(p.compatibility !== undefined ? { compatibility: p.compatibility } : {}),
      updated: pluginUpdated({ name: p.name, sourcePath: p.sourcePath }, tags, git),
      released: hasTag,
      ...(p.readme !== undefined ? { readme: p.readme } : {}),
      changelog: datedChangelog(p.name, p.changelog, tags),
      counts,
    };
  });

  const stats: SiteIndex['stats'] = {
    plugins: plugins.length,
    skills: 0,
    agents: 0,
    commands: 0,
    hooks: 0,
    mcp: 0,
    releases: releases.length,
    ...(releases[0] ? { latestReleaseDate: releases[0].date } : {}),
  };
  for (const c of components) stats[KIND_STATS[c.kind]] += 1;

  return SiteIndex.parse({
    schemaVersion: 1,
    meta: {
      marketplaceName: marketplace,
      ownerName: catalog.ownerName,
      repo,
      commit: { sha: head.sha, shortSha: head.sha.slice(0, 7), date: head.date },
      builtAt: now.toISOString(),
      releaseTagCount,
    },
    plugins,
    components,
    releases,
    stats,
  });
}
