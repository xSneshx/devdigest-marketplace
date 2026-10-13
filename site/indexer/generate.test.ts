// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { generateIndex } from './generate';
import { createGitCliSource } from './git-source';
import { scanForLeaks } from './leak-patterns';
import { resolveRepoIdentity, type RepoIdentity } from './repo-identity';
import { createFakeGitSource } from './test-helpers/fake-git';
import { createFixtureRepo, type FixtureRepo, type FixtureSpec } from './test-helpers/fixture-repo';

const REAL_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const hasRealRepo = fs.existsSync(path.join(REAL_ROOT, '.claude-plugin', 'marketplace.json'));

const REPO: RepoIdentity = { owner: 'acme', name: 'market', url: 'https://github.com/acme/market', defaultBranch: 'main' };
const NOW = new Date('2026-10-13T12:00:00Z');

const open: FixtureRepo[] = [];
afterEach(() => {
  while (open.length) open.pop()?.cleanup();
});

function fixture(spec: FixtureSpec): string {
  const repo = createFixtureRepo(spec);
  open.push(repo);
  return repo.root;
}

const catalog = (plugins: object[]) => ({ name: 'test-market', owner: { name: 'Ann' }, plugins });
const manifest = (over: object = {}) => ({ name: 'demo', version: '1.0.0', description: 'Demo plugin', author: { name: 'Ann' }, ...over });

describe('generateIndex on the real repository', () => {
  it.skipIf(!hasRealRepo)('matches the known catalog shape and leaks nothing', () => {
    const index = generateIndex({
      root: REAL_ROOT,
      git: createGitCliSource(REAL_ROOT),
      repo: resolveRepoIdentity({ SITE_REPOSITORY: 'xSneshx/devdigest-marketplace' }, REAL_ROOT),
      now: NOW,
    });

    expect(index.stats).toMatchObject({ plugins: 5, skills: 12, agents: 7, commands: 5, hooks: 2, mcp: 0 });
    expect(index.stats.releases).toBeGreaterThanOrEqual(6);
    expect(index.plugins.length + index.components.length).toBe(31);

    const paved = index.plugins.find((p) => p.name === 'engineering-paved-path');
    expect(paved?.dependents).toEqual(['architecture-review', 'code-agents', 'sdd-engineering']);
    expect(index.plugins.find((p) => p.name === 'sdd-engineering')?.compatibility).toBe('>= 2.1.269');
    expect(index.plugins.find((p) => p.name === 'sdd-engineering')?.installCommand).toBe(
      'claude plugin install sdd-engineering@' + index.meta.marketplaceName,
    );
    const spec = index.components.find((c) => c.id === 'command:sdd-engineering/spec');
    expect(spec?.invocation).toBe('/sdd-engineering:spec');

    expect(scanForLeaks(JSON.stringify(index))).toEqual([]);
  });
});

describe('generateIndex on fixtures', () => {
  it('produces a valid, all-zero index for an empty catalog', () => {
    const root = fixture({ '.claude-plugin/marketplace.json': catalog([]) });
    const index = generateIndex({ root, git: createFakeGitSource(), repo: REPO, now: NOW });
    expect(index.plugins).toEqual([]);
    expect(index.stats).toEqual({ plugins: 0, skills: 0, agents: 0, commands: 0, hooks: 0, mcp: 0, releases: 0 });
    expect(index.meta.releaseTagCount).toBe(0);
  });

  it('counts an MCP server and links plugin and release data', () => {
    const root = fixture({
      '.claude-plugin/marketplace.json': catalog([{ name: 'demo', source: './plugins/demo' }]),
      'plugins/demo/.claude-plugin/plugin.json': manifest({ mcpServers: { tool: { command: 'x' } } }),
      'plugins/demo/CHANGELOG.md': '## [1.0.0] - 2026-01-01\n\n- First release.\n',
    });
    const git = createFakeGitSource({
      tags: [{ name: 'demo--v1.0.0', date: '2026-01-02T10:00:00+00:00', subject: 'release' }],
    });
    const index = generateIndex({ root, git, repo: REPO, now: NOW });

    expect(index.stats.mcp).toBe(1);
    const plugin = index.plugins[0]!;
    expect(plugin.counts.mcp).toBe(1);
    expect(plugin.released).toBe(true);
    expect(plugin.updated).toBe('2026-01-02T10:00:00+00:00');
    expect(plugin.url).toBe('https://github.com/acme/market/tree/main/plugins/demo');
    expect(plugin.changelog[0]).toMatchObject({ version: '1.0.0', tag: 'demo--v1.0.0' });
    expect(index.releases[0]).toMatchObject({ plugin: 'demo', summary: 'First release.' });
    expect(index.meta.releaseTagCount).toBe(1);
  });
});

describe('scanForLeaks', () => {
  it('flags an e-mail, a home path and an absolute path value built at run time', () => {
    const email = JSON.stringify({ description: ['user', '@', 'corp.io'].join('') });
    expect(scanForLeaks(email).map((f) => f.id)).toContain('email-address');

    const home = JSON.stringify({ description: ['see ', '/', 'Users', '/bob/notes'].join('') });
    expect(scanForLeaks(home).map((f) => f.id)).toContain('absolute-home-path (/Users/)');

    const abs = JSON.stringify({ components: [{ path: ['', 'etc', 'hosts'].join('/') }] });
    expect(scanForLeaks(abs).map((f) => f.id)).toContain('absolute-path-value');

    expect(scanForLeaks(JSON.stringify({ path: 'plugins/x/README.md', description: 'fine' }))).toEqual([]);
  });
});
