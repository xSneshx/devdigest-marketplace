import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { IndexError } from './errors';
import { generateIndex } from './generate';
import { createGitCliSource, type GitSource } from './git-source';
import { scanForLeaks } from './leak-patterns';
import { resolveRepoIdentity, type RepoIdentity } from './repo-identity';

export interface CliOptions {
  root: string;
  outFile: string;
  env: Record<string, string | undefined>;
  /** Injection points for tests; production resolves both from the real repository. */
  git?: GitSource;
  repo?: RepoIdentity;
  now?: Date;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
}

function reasonOf(err: unknown): string {
  if (err instanceof IndexError) return err.message;
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/^site index:\s*/, '');
}

function removeQuietly(file: string): void {
  fs.rmSync(file, { force: true });
}

/** Generates, scans and writes the index. Returns the exit code; on failure no index file remains. */
export function runCli(opts: CliOptions): number {
  const out = opts.stdout ?? ((l: string) => process.stdout.write(`${l}\n`));
  const err = opts.stderr ?? ((l: string) => process.stderr.write(`${l}\n`));
  const tmpFile = `${opts.outFile}.tmp`;

  try {
    const git = opts.git ?? createGitCliSource(opts.root);
    const repo = opts.repo ?? resolveRepoIdentity(opts.env, opts.root);
    const index = generateIndex({ root: opts.root, git, repo, now: opts.now ?? new Date() });
    const json = JSON.stringify(index, null, 2);

    const findings = scanForLeaks(json);
    if (findings.length > 0) {
      const detail = findings.map((f) => `${f.id} (${f.excerpt})`).join('; ');
      throw new IndexError(path.basename(opts.outFile), `index contains disallowed content: ${detail}`);
    }

    fs.mkdirSync(path.dirname(opts.outFile), { recursive: true });
    fs.writeFileSync(tmpFile, `${json}\n`);
    fs.renameSync(tmpFile, opts.outFile);

    const components = index.components.length;
    out(
      `site index: ${index.plugins.length} plugins, ${components} components, ${index.meta.releaseTagCount} release tags (built from ${index.meta.commit.shortSha})`,
    );
    return 0;
  } catch (e) {
    removeQuietly(tmpFile);
    removeQuietly(opts.outFile);
    err(`site index: ${reasonOf(e)}`);
    return 1;
  }
}

const isEntry = process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isEntry) {
  const siteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const root = path.resolve(siteRoot, '..');
  process.exit(runCli({ root, outFile: path.join(siteRoot, 'public', 'site-index.json'), env: process.env }));
}
