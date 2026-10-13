import { execFileSync } from 'node:child_process';

function run(root, args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Read-only git helpers over the base ref. Tests inject a stub with the same three methods. */
export function defaultGit(root) {
  return {
    resolve(ref) {
      for (const candidate of [ref, `origin/${ref}`]) {
        try {
          return run(root, ['rev-parse', '--verify', '--quiet', `${candidate}^{commit}`]).trim();
        } catch {
          // try the next candidate
        }
      }
      return null;
    },
    changedFiles(sha) {
      const tracked = run(root, ['diff', '--name-only', '--relative', sha]).split('\n');
      const untracked = run(root, ['ls-files', '--others', '--exclude-standard']).split('\n');
      return [...new Set([...tracked, ...untracked].filter((f) => f !== ''))];
    },
    fileAt(sha, relPath) {
      try {
        return run(root, ['show', `${sha}:./${relPath}`]);
      } catch {
        return null;
      }
    },
  };
}
