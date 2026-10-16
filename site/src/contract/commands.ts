import type { Kind } from './site-index';

export function installCommand(plugin: string, marketplace: string): string {
  return `claude plugin install ${plugin}@${marketplace}`;
}

/** The git ref of the stable release channel; the catalog served there is named `<latest name>-stable`. */
export const STABLE_CHANNEL_REF = 'stable';

export function marketplaceAddCommand(owner: string, repo: string, ref?: string): string {
  const source = ref === undefined ? `${owner}/${repo}` : `${owner}/${repo}#${ref}`;
  return `claude plugin marketplace add ${source}`;
}

/** Catalog name of the stable channel, derived from the latest channel's name. */
export function stableMarketplaceName(latestName: string): string {
  return `${latestName}-stable`;
}

/** Link to the "Release channels" section of the release guide on the default branch. */
export function releaseChannelsUrl(repoUrl: string, defaultBranch: string): string {
  return `${repoUrl}/blob/${defaultBranch}/docs/RELEASES.md#release-channels`;
}

export function marketplaceUpdateCommand(marketplace: string): string {
  return `claude plugin marketplace update ${marketplace}`;
}

export function pluginUpdateCommand(plugin: string, marketplace: string): string {
  return `claude plugin update ${plugin}@${marketplace}`;
}

/** `/<plugin>:<name>` for a command, `<plugin>:<name>` for skill/agent/mcp, none for a hook or a plugin. */
export function invocation(kind: Kind, plugin: string, name: string): string | undefined {
  switch (kind) {
    case 'command':
      return `/${plugin}:${name}`;
    case 'skill':
    case 'agent':
    case 'mcp':
      return `${plugin}:${name}`;
    case 'hook':
    case 'plugin':
      return undefined;
  }
}
