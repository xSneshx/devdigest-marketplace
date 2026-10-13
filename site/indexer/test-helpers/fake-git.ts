import type { GitSource, TagInfo } from '../git-source.ts';

export interface FakeGitOptions {
  tags?: TagInfo[];
  head?: { sha: string; date: string };
  /** Keyed by repo-relative directory. */
  commitDates?: Record<string, string>;
  evidenceFiles?: string[];
}

/** In-memory GitSource: tests never create commits or tags. */
export function createFakeGitSource(opts: FakeGitOptions = {}): GitSource {
  return {
    tags: () => [...(opts.tags ?? [])],
    head: () => opts.head ?? { sha: '0123456789abcdef0123456789abcdef01234567', date: '2026-01-01T00:00:00+00:00' },
    lastCommitDate: (dir) => opts.commitDates?.[dir],
    evidenceFiles: () => [...(opts.evidenceFiles ?? [])],
  };
}
