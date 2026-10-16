import type { Kind, SiteIndex, SiteRelease } from '../../contract/site-index';

const FEED_LIMIT = 4;

export function kindCount(index: SiteIndex, kind: Kind): number {
  const { stats } = index;
  switch (kind) {
    case 'plugin':
      return stats.plugins;
    case 'skill':
      return stats.skills;
    case 'agent':
      return stats.agents;
    case 'command':
      return stats.commands;
    case 'hook':
      return stats.hooks;
    case 'mcp':
      return stats.mcp;
  }
}

/** Newest first by tag date; the index order is not relied on. */
export function newestReleases(index: SiteIndex, limit = FEED_LIMIT): SiteRelease[] {
  return [...index.releases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}
