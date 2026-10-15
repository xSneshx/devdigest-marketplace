import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

/** A release tag. Deliberately has no e-mail field (AC-7). */
export interface TagInfo {
  name: string;
  /** ISO 8601 timestamp, offset preserved. */
  date: string;
  subject: string;
}

export interface GitSource {
  tags(): TagInfo[];
  head(): { sha: string; date: string };
  /** Committer date of the latest commit touching a repo-relative directory. */
  lastCommitDate(relDir: string): string | undefined;
  /** File names inside `docs/release-evidence`. */
  evidenceFiles(): string[];
}

/** Read-only git invocation. `execFileSync` with an argument array: no shell, safe for paths with spaces. */
export function runGit(root: string, args: string[]): string {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

const TAG_FORMAT = '%(refname:short)%00%(creatordate:iso-strict)%00%(subject)';

export function createGitCliSource(root: string): GitSource {
  try {
    runGit(root, ['rev-parse', '--git-dir']);
  } catch {
    throw new Error(`site index: ${path.basename(root)} is not a git repository (release tags and commit data need one)`);
  }

  return {
    tags() {
      const out = runGit(root, ['for-each-ref', 'refs/tags', `--format=${TAG_FORMAT}`]);
      if (out === '') return [];
      return out.split('\n').map((line) => {
        const [name = '', date = '', subject = ''] = line.split('\0');
        return { name, date, subject };
      });
    },
    head() {
      return {
        sha: runGit(root, ['rev-parse', 'HEAD']),
        date: runGit(root, ['log', '-1', '--format=%cI']),
      };
    },
    lastCommitDate(relDir) {
      const out = runGit(root, ['log', '-1', '--format=%cI', '--', relDir]);
      return out === '' ? undefined : out;
    },
    evidenceFiles() {
      try {
        return readdirSync(path.join(root, 'docs', 'release-evidence'));
      } catch {
        return [];
      }
    },
  };
}
