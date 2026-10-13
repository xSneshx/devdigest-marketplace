// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from './cli';
import { createFakeGitSource } from './test-helpers/fake-git';
import { createFixtureRepo, type FixtureRepo, type FixtureSpec } from './test-helpers/fixture-repo';

const open: FixtureRepo[] = [];
const dirs: string[] = [];
afterEach(() => {
  while (open.length) open.pop()?.cleanup();
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

const catalog = { name: 'test-market', owner: { name: 'Ann' }, plugins: [{ name: 'demo', source: './plugins/demo' }] };
const manifest = { name: 'demo', version: '1.0.0', description: 'Demo plugin', author: { name: 'Ann' } };

function run(spec: FixtureSpec, preexisting = false) {
  const repo = createFixtureRepo(spec);
  open.push(repo);
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-out-'));
  dirs.push(outDir);
  const outFile = path.join(outDir, 'public', 'site-index.json');
  if (preexisting) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, '{"stale":true}');
  }
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = runCli({
    root: repo.root,
    outFile,
    env: { SITE_REPOSITORY: 'acme/market' },
    git: createFakeGitSource(),
    repo: { owner: 'acme', name: 'market', url: 'https://github.com/acme/market', defaultBranch: 'main' },
    now: new Date('2026-10-13T12:00:00Z'),
    stdout: (l) => stdout.push(l),
    stderr: (l) => stderr.push(l),
  });
  return { code, outFile, stdout, stderr };
}

describe('runCli', () => {
  it('writes the index atomically and reports counts', () => {
    const r = run({
      '.claude-plugin/marketplace.json': catalog,
      'plugins/demo/.claude-plugin/plugin.json': manifest,
    });
    expect(r.code).toBe(0);
    expect(r.stdout[0]).toBe('site index: 1 plugins, 0 components, 0 release tags (built from 0123456)');
    expect(JSON.parse(fs.readFileSync(r.outFile, 'utf8')).schemaVersion).toBe(1);
    expect(fs.existsSync(`${r.outFile}.tmp`)).toBe(false);
  });

  it('exits 1 naming the plugin on a version mismatch and removes a stale file', () => {
    const r = run(
      {
        '.claude-plugin/marketplace.json': { ...catalog, plugins: [{ name: 'demo', source: './plugins/demo', version: '2.0.0' }] },
        'plugins/demo/.claude-plugin/plugin.json': manifest,
      },
      true,
    );
    expect(r.code).toBe(1);
    expect(r.stderr.join('\n')).toMatch(/^site index: .*demo/);
    expect(fs.existsSync(r.outFile)).toBe(false);
  });

  it('exits 1 naming the file on malformed frontmatter', () => {
    const r = run({
      '.claude-plugin/marketplace.json': catalog,
      'plugins/demo/.claude-plugin/plugin.json': manifest,
      'plugins/demo/agents/broken.md': '---\nname: [unclosed\n---\nbody\n',
    });
    expect(r.code).toBe(1);
    expect(r.stderr.join('\n')).toContain('broken.md');
    expect(fs.existsSync(r.outFile)).toBe(false);
  });

  it('refuses to write an index whose text contains an e-mail', () => {
    const r = run({
      '.claude-plugin/marketplace.json': catalog,
      'plugins/demo/.claude-plugin/plugin.json': { ...manifest, description: ['user', '@', 'corp.io'].join('') },
    });
    expect(r.code).toBe(1);
    expect(r.stderr.join('\n')).toContain('email-address');
    expect(fs.existsSync(r.outFile)).toBe(false);
  });
});
