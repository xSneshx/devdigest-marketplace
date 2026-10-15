// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseRemoteUrl, resolveRepoIdentity } from './repo-identity.ts';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

describe('parseRemoteUrl', () => {
  it('parses https, https with credentials, scp-style ssh and ssh URLs', () => {
    expect(parseRemoteUrl('https://github.com/acme/market.git')).toEqual({ owner: 'acme', name: 'market' });
    expect(parseRemoteUrl('https://user:pw@github.com/acme/market')).toEqual({ owner: 'acme', name: 'market' });
    expect(parseRemoteUrl('git@github.com:acme/market.git')).toEqual({ owner: 'acme', name: 'market' });
    expect(parseRemoteUrl('ssh://git@github.com/acme/market.git')).toEqual({ owner: 'acme', name: 'market' });
    expect(parseRemoteUrl('https://example.org/acme/market.git')).toBeUndefined();
  });
});

describe('resolveRepoIdentity', () => {
  it('prefers SITE_REPOSITORY over GITHUB_REPOSITORY over the git remote', () => {
    const both = resolveRepoIdentity(
      { SITE_REPOSITORY: 'one/first', GITHUB_REPOSITORY: 'two/second', SITE_DEFAULT_BRANCH: 'trunk' },
      ROOT,
    );
    expect(both).toEqual({ owner: 'one', name: 'first', url: 'https://github.com/one/first', defaultBranch: 'trunk' });

    expect(resolveRepoIdentity({ GITHUB_REPOSITORY: 'two/second' }, ROOT)).toMatchObject({ owner: 'two', name: 'second' });

    const fromRemote = resolveRepoIdentity({}, ROOT);
    expect(fromRemote.url).toBe(`https://github.com/${fromRemote.owner}/${fromRemote.name}`);
    expect(fromRemote.defaultBranch).toMatch(/^\S+$/);
  });

  it('fails clearly when nothing identifies the repository', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'site-id-'));
    try {
      expect(() => resolveRepoIdentity({}, dir)).toThrow(/SITE_REPOSITORY/);
      expect(resolveRepoIdentity({ SITE_REPOSITORY: 'a/b' }, dir).defaultBranch).toBe('main');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
