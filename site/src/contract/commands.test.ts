import { describe, expect, it } from 'vitest';
import {
  installCommand,
  invocation,
  marketplaceAddCommand,
  marketplaceUpdateCommand,
  pluginUpdateCommand,
  releaseChannelsUrl,
  STABLE_CHANNEL_REF,
  stableMarketplaceName,
} from './commands';

describe('command builders', () => {
  it('builds install, add and update commands from index data', () => {
    expect(installCommand('code-agents', 'devdigest-marketplace')).toBe(
      'claude plugin install code-agents@devdigest-marketplace',
    );
    expect(marketplaceAddCommand('xSneshx', 'devdigest-marketplace')).toBe(
      'claude plugin marketplace add xSneshx/devdigest-marketplace',
    );
    expect(marketplaceUpdateCommand('devdigest-marketplace')).toBe(
      'claude plugin marketplace update devdigest-marketplace',
    );
    expect(pluginUpdateCommand('code-agents', 'devdigest-marketplace')).toBe(
      'claude plugin update code-agents@devdigest-marketplace',
    );
  });

  it('builds the stable-channel add command, its catalog name and the channel docs link', () => {
    expect(STABLE_CHANNEL_REF).toBe('stable');
    expect(marketplaceAddCommand('xSneshx', 'devdigest-marketplace', STABLE_CHANNEL_REF)).toBe(
      'claude plugin marketplace add xSneshx/devdigest-marketplace#stable',
    );
    expect(stableMarketplaceName('devdigest-marketplace')).toBe('devdigest-marketplace-stable');
    expect(releaseChannelsUrl('https://github.com/xSneshx/devdigest-marketplace', 'main')).toBe(
      'https://github.com/xSneshx/devdigest-marketplace/blob/main/docs/RELEASES.md#release-channels',
    );
  });

  it('formats invocations per kind', () => {
    expect(invocation('command', 'sdd-engineering', 'execute-plan')).toBe('/sdd-engineering:execute-plan');
    expect(invocation('skill', 'p', 'zod')).toBe('p:zod');
    expect(invocation('agent', 'p', 'a')).toBe('p:a');
    expect(invocation('mcp', 'p', 'srv')).toBe('p:srv');
    expect(invocation('hook', 'p', 'h')).toBeUndefined();
    expect(invocation('plugin', 'p', 'p')).toBeUndefined();
  });
});
