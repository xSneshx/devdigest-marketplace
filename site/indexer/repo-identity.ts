import { runGit } from './git-source.ts';

export interface RepoIdentity {
  owner: string;
  name: string;
  url: string;
  defaultBranch: string;
}

const SLUG = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;
const REMOTE =
  /^(?:https?:\/\/(?:[^@/\s]+@)?github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;

export function parseSlug(value: string): { owner: string; name: string } | undefined {
  const m = SLUG.exec(value.trim());
  return m ? { owner: m[1]!, name: m[2]! } : undefined;
}

/** Parses an https or ssh GitHub remote. Credentials in the URL are never returned. */
export function parseRemoteUrl(remote: string): { owner: string; name: string } | undefined {
  const m = REMOTE.exec(remote.trim());
  return m ? { owner: m[1]!, name: m[2]! } : undefined;
}

function git(root: string, args: string[]): string | undefined {
  try {
    const out = runGit(root, args);
    return out === '' ? undefined : out;
  } catch {
    return undefined;
  }
}

export function resolveRepoIdentity(env: Record<string, string | undefined>, root: string): RepoIdentity {
  const fromEnv = (env.SITE_REPOSITORY && parseSlug(env.SITE_REPOSITORY)) || (env.GITHUB_REPOSITORY && parseSlug(env.GITHUB_REPOSITORY));
  const remote = git(root, ['remote', 'get-url', 'origin']);
  const slug = fromEnv || (remote ? parseRemoteUrl(remote) : undefined);
  if (!slug) {
    throw new Error('site index: cannot determine the GitHub repository; set SITE_REPOSITORY=<owner>/<name>');
  }

  let defaultBranch = env.SITE_DEFAULT_BRANCH?.trim();
  if (!defaultBranch) {
    const head = git(root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
    defaultBranch = head ? head.replace(/^origin\//, '') : 'main';
  }

  return {
    owner: slug.owner,
    name: slug.name,
    url: `https://github.com/${slug.owner}/${slug.name}`,
    defaultBranch,
  };
}
