// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createGitCliSource } from './git-source.ts';
import { buildReleases } from './releases.ts';
import type { RepoIdentity } from './repo-identity.ts';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const REPO: RepoIdentity = { owner: 'acme', name: 'market', url: 'https://github.com/acme/market', defaultBranch: 'main' };

describe('createGitCliSource (real repository, read-only)', () => {
  it('reads the release tags, head and evidence files without any e-mail', () => {
    const git = createGitCliSource(ROOT);
    const tags = git.tags();
    const releaseTags = tags.filter((t) => /--v\d/.test(t.name));
    expect(releaseTags).toHaveLength(6);

    const ordered = buildReleases({
      tags,
      changelogs: new Map(),
      evidenceFiles: [],
      repo: REPO,
      pluginNames: [...new Set(releaseTags.map((t) => t.name.split('--v')[0]!))],
    });
    expect(ordered[0]?.tag).toBe('sdd-engineering--v1.1.0');

    expect(JSON.stringify(tags)).not.toContain('@');

    const head = git.head();
    expect(head.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(head.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(git.lastCommitDate('plugins/sdd-engineering')).toMatch(/^\d{4}-/);
    expect(git.lastCommitDate('no/such/dir')).toBeUndefined();
    expect(git.evidenceFiles()).toContain('sdd-engineering--v1.1.0.md');
  });

  it('throws a clear error outside a git repository', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'site-nogit-'));
    try {
      expect(() => createGitCliSource(dir)).toThrow(/not a git repository/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
