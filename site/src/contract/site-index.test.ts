import { describe, expect, it } from 'vitest';
import { KIND_ORDER, SiteIndex, componentId } from './site-index';

const valid = {
  schemaVersion: 1,
  meta: {
    marketplaceName: 'm',
    ownerName: 'o',
    repo: { owner: 'o', name: 'r', url: 'https://github.com/o/r', defaultBranch: 'main' },
    commit: { sha: 'a'.repeat(40), shortSha: 'aaaaaaa', date: '2026-10-13T00:00:00Z' },
    builtAt: '2026-10-13T00:00:00Z',
    releaseTagCount: 0,
  },
  plugins: [],
  components: [],
  releases: [],
  stats: { plugins: 0, skills: 0, agents: 0, commands: 0, hooks: 0, mcp: 0, releases: 0 },
};

describe('SiteIndex', () => {
  it('accepts an empty plugins array and rejects missing or unsafe fields', () => {
    expect(SiteIndex.safeParse(valid).success).toBe(true);

    expect(SiteIndex.safeParse({ ...valid, meta: undefined }).success).toBe(false);
    expect(SiteIndex.safeParse({ ...valid, schemaVersion: 2 }).success).toBe(false);

    const plugin = {
      name: 'p', version: '1.0.0', description: 'd', author: 'a', keywords: [], dependencies: [],
      dependents: [], installCommand: 'x', sourcePath: 'plugins/p', url: 'https://github.com/o/r/tree/main/plugins/p',
      updated: '2026-10-13T00:00:00Z', released: true, changelog: [], counts: { skill: 0, agent: 0, command: 0, hook: 0, mcp: 0 },
    };
    expect(SiteIndex.safeParse({ ...valid, plugins: [plugin] }).success).toBe(true);
    expect(SiteIndex.safeParse({ ...valid, plugins: [{ ...plugin, sourcePath: ['', 'Users', 'x', 'plugins', 'p'].join('/') }] }).success).toBe(false);
    expect(SiteIndex.safeParse({ ...valid, plugins: [{ ...plugin, version: undefined }] }).success).toBe(false);
  });

  it('exposes kind order and component ids', () => {
    expect(KIND_ORDER).toEqual(['plugin', 'skill', 'agent', 'command', 'hook', 'mcp']);
    expect(componentId('skill', 'p', 'zod')).toBe('skill:p/zod');
  });
});
