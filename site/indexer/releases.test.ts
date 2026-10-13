import { describe, expect, it } from 'vitest';
import { createFakeGitSource } from './test-helpers/fake-git.ts';
import { buildReleases, datedChangelog, firstListItem, parseReleaseTag, pluginUpdated } from './releases.ts';
import type { RepoIdentity } from './repo-identity.ts';

const REPO: RepoIdentity = { owner: 'acme', name: 'market', url: 'https://github.com/acme/market', defaultBranch: 'main' };

describe('parseReleaseTag', () => {
  it('splits plugin and version and rejects other tags', () => {
    expect(parseReleaseTag('sdd--v1.1.0')).toEqual({ plugin: 'sdd', version: '1.1.0' });
    expect(parseReleaseTag('a--b--v2.0.0-rc.1')).toEqual({ plugin: 'a--b', version: '2.0.0-rc.1' });
    expect(parseReleaseTag('v1.0.0')).toBeUndefined();
    expect(parseReleaseTag('sdd--v1.1')).toBeUndefined();
  });
});

describe('buildReleases', () => {
  const tags = [
    { name: 'alpha--v1.0.0', date: '2026-10-13T09:00:00+00:00', subject: 'alpha 1.0.0' },
    { name: 'alpha--v1.1.0', date: '2026-10-13T11:30:00+00:00', subject: 'alpha 1.1.0' },
    { name: 'beta--v1.0.0', date: '2026-10-13T10:00:00+00:00', subject: 'beta first' },
    { name: 'stray--v1.0.0', date: '2026-10-13T12:00:00+00:00', subject: 'not in catalog' },
    { name: 'nightly', date: '2026-10-13T12:00:00+00:00', subject: 'not a release tag' },
  ];
  const changelogs = new Map([
    ['alpha', [
      { version: '1.1.0', markdown: '### Added\n- New thing,\n  wrapped line.\n- Second\n' },
      { version: '1.0.0', markdown: '- Initial release.\n' },
    ]],
  ]);

  it('orders same-day tags by timestamp, uses subject fallback and links evidence', () => {
    const out = buildReleases({
      tags,
      changelogs,
      evidenceFiles: ['alpha--v1.1.0.md', 'TEMPLATE.md'],
      repo: REPO,
      pluginNames: ['alpha', 'beta'],
    });
    expect(out.map((r) => r.tag)).toEqual(['alpha--v1.1.0', 'beta--v1.0.0', 'alpha--v1.0.0']);
    expect(out[0]).toMatchObject({
      summary: 'New thing, wrapped line.',
      evidenceUrl: 'https://github.com/acme/market/blob/main/docs/release-evidence/alpha--v1.1.0.md',
    });
    expect(out[1]?.summary).toBe('beta first');
    expect(out[1]).not.toHaveProperty('evidenceUrl');
  });

  it('orders by instant, not by the textual offset', () => {
    const out = buildReleases({
      tags: [
        { name: 'p--v1.0.0', date: '2026-10-13T10:00:00+05:00', subject: 's1' },
        { name: 'p--v1.1.0', date: '2026-10-13T08:00:00+00:00', subject: 's2' },
      ],
      changelogs: new Map(),
      evidenceFiles: [],
      repo: REPO,
      pluginNames: ['p'],
    });
    expect(out.map((r) => r.version)).toEqual(['1.1.0', '1.0.0']);
  });
});

describe('datedChangelog / pluginUpdated', () => {
  const tags = [{ name: 'alpha--v1.0.0', date: '2026-10-01T00:00:00+00:00', subject: 'x' }];

  it('leaves untagged versions undated, newest version first', () => {
    const out = datedChangelog(
      'alpha',
      [
        { version: '1.0.0', markdown: 'old' },
        { version: '1.10.0', markdown: 'new' },
        { version: '1.2.0', markdown: 'mid' },
      ],
      tags,
    );
    expect(out.map((e) => e.version)).toEqual(['1.10.0', '1.2.0', '1.0.0']);
    expect(out[0]).not.toHaveProperty('date');
    expect(out[2]).toMatchObject({ tag: 'alpha--v1.0.0', date: '2026-10-01T00:00:00+00:00' });
  });

  it('falls back from tag date to directory commit date to head', () => {
    const git = createFakeGitSource({ commitDates: { 'plugins/beta': '2026-09-01T00:00:00+00:00' } });
    expect(pluginUpdated({ name: 'alpha', sourcePath: 'plugins/alpha' }, tags, git)).toBe('2026-10-01T00:00:00+00:00');
    expect(pluginUpdated({ name: 'beta', sourcePath: 'plugins/beta' }, tags, git)).toBe('2026-09-01T00:00:00+00:00');
    expect(pluginUpdated({ name: 'gamma', sourcePath: 'plugins/gamma' }, tags, git)).toBe(git.head().date);
  });
});

describe('firstListItem', () => {
  it('returns the first list item or undefined', () => {
    expect(firstListItem('### Added\n\n* Thing\n- Other')).toBe('Thing');
    expect(firstListItem('just prose')).toBeUndefined();
  });
});
