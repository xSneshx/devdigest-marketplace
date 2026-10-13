import type { SitePlugin, SiteRelease } from '../src/contract/site-index.ts';
import type { GitSource, TagInfo } from './git-source.ts';
import type { RepoIdentity } from './repo-identity.ts';

type ChangelogEntry = SitePlugin['changelog'][number];
export interface ChangelogSection {
  version: string;
  markdown: string;
}

const TAG = /^(.+)--v(\d+\.\d+\.\d+\S*)$/;

export function parseReleaseTag(name: string): { plugin: string; version: string } | undefined {
  const m = TAG.exec(name);
  return m ? { plugin: m[1]!, version: m[2]! } : undefined;
}

/** Semver precedence, enough for release ordering: numeric core, then a prerelease sorts below its release. */
export function compareVersions(a: string, b: string): number {
  const split = (v: string) => {
    const [core = '', pre] = v.split('+')[0]!.split('-', 2);
    return { nums: core.split('.').map((n) => Number.parseInt(n, 10) || 0), pre };
  };
  const x = split(a);
  const y = split(b);
  for (let i = 0; i < Math.max(x.nums.length, y.nums.length); i++) {
    const d = (x.nums[i] ?? 0) - (y.nums[i] ?? 0);
    if (d !== 0) return d;
  }
  if (x.pre === y.pre) return 0;
  if (x.pre === undefined) return 1;
  if (y.pre === undefined) return -1;
  return x.pre < y.pre ? -1 : 1;
}

/** Text of the first Markdown list item in a section, with inline list continuation lines joined. */
export function firstListItem(markdown: string): string | undefined {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => /^\s*(?:[-*+]|\d+[.)])\s+\S/.test(l));
  if (start < 0) return undefined;
  const parts = [lines[start]!.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '').trim()];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '' || /^\s*(?:[-*+]|\d+[.)])\s+/.test(line) || /^#/.test(line)) break;
    parts.push(line.trim());
  }
  return parts.join(' ');
}

function time(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

export interface BuildReleasesInput {
  tags: TagInfo[];
  changelogs: Map<string, ChangelogSection[]>;
  evidenceFiles: string[];
  repo: RepoIdentity;
  pluginNames: string[];
}

/** One item per release tag of a catalog plugin, newest first by full timestamp (same-day tags differ by time). */
export function buildReleases(input: BuildReleasesInput): SiteRelease[] {
  const { tags, changelogs, evidenceFiles, repo, pluginNames } = input;
  const known = new Set(pluginNames);
  const evidence = new Set(evidenceFiles);
  const items: SiteRelease[] = [];

  for (const tag of tags) {
    const parsed = parseReleaseTag(tag.name);
    if (!parsed || !known.has(parsed.plugin)) continue;
    const section = changelogs.get(parsed.plugin)?.find((s) => s.version === parsed.version);
    const summary = (section && firstListItem(section.markdown)) || tag.subject;
    const file = `${tag.name}.md`;
    items.push({
      plugin: parsed.plugin,
      version: parsed.version,
      tag: tag.name,
      date: tag.date,
      summary,
      ...(evidence.has(file)
        ? { evidenceUrl: `${repo.url}/blob/${repo.defaultBranch}/docs/release-evidence/${encodeURIComponent(file)}` }
        : {}),
    });
  }

  return items.sort(
    (a, b) =>
      time(b.date) - time(a.date) || compareVersions(b.version, a.version) || a.plugin.localeCompare(b.plugin, 'en'),
  );
}

/** Attaches `tag` and `date` to each changelog section; untagged versions keep both undefined ("unreleased"). */
export function datedChangelog(plugin: string, sections: ChangelogSection[], tags: TagInfo[]): ChangelogEntry[] {
  const byName = new Map(tags.map((t) => [t.name, t]));
  return [...sections]
    .sort((a, b) => compareVersions(b.version, a.version))
    .map((s) => {
      const tag = byName.get(`${plugin}--v${s.version}`);
      return {
        version: s.version,
        markdown: s.markdown,
        ...(tag ? { tag: tag.name, date: tag.date } : {}),
      };
    });
}

/** Latest release tag date of the plugin, else its directory's last commit date, else the HEAD commit date. */
export function pluginUpdated(
  plugin: { name: string; sourcePath: string },
  tags: TagInfo[],
  git: GitSource,
): string {
  const own = tags.filter((t) => parseReleaseTag(t.name)?.plugin === plugin.name);
  const latest = own.reduce<TagInfo | undefined>((acc, t) => (!acc || time(t.date) > time(acc.date) ? t : acc), undefined);
  return latest?.date ?? git.lastCommitDate(plugin.sourcePath) ?? git.head().date;
}
