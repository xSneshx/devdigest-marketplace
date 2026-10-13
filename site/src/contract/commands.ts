import type { Kind } from './site-index';

export function installCommand(plugin: string, marketplace: string): string {
  return `claude plugin install ${plugin}@${marketplace}`;
}

export function marketplaceAddCommand(owner: string, repo: string): string {
  return `claude plugin marketplace add ${owner}/${repo}`;
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
