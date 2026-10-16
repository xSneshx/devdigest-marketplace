import { describe, expect, it } from 'vitest';
import {
  installCommand,
  invocation,
  marketplaceAddCommand,
  marketplaceUpdateCommand,
  pluginUpdateCommand,
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

  it('formats invocations per kind', () => {
    expect(invocation('command', 'sdd-engineering', 'execute-plan')).toBe('/sdd-engineering:execute-plan');
    expect(invocation('skill', 'p', 'zod')).toBe('p:zod');
    expect(invocation('agent', 'p', 'a')).toBe('p:a');
    expect(invocation('mcp', 'p', 'srv')).toBe('p:srv');
    expect(invocation('hook', 'p', 'h')).toBeUndefined();
    expect(invocation('plugin', 'p', 'p')).toBeUndefined();
  });
});
