// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { IndexError } from './errors';
import { readCatalog, readPlugins } from './read-plugins';
import { createFixtureRepo, type FixtureRepo, type FixtureSpec } from './test-helpers/fixture-repo';

const REAL_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const hasRealRepo = fs.existsSync(path.join(REAL_ROOT, '.claude-plugin', 'marketplace.json'));

const open: FixtureRepo[] = [];
afterEach(() => {
  while (open.length) open.pop()?.cleanup();
});

function fixture(spec: FixtureSpec): string {
  const repo = createFixtureRepo(spec);
  open.push(repo);
  return repo.root;
}

const manifest = (over: object = {}) => ({ name: 'demo', version: '1.0.0', description: 'Demo plugin', author: { name: 'Ann' }, ...over });
const catalog = (entry: object = {}) => ({
  name: 'test-market',
  owner: { name: 'Ann' },
  plugins: [{ name: 'demo', source: './plugins/demo', ...entry }],
});

describe.skipIf(!hasRealRepo)('real repository', () => {
  const plugins = readPlugins(REAL_ROOT, readCatalog(REAL_ROOT));
  const sdd = plugins.find((p) => p.name === 'sdd-engineering');
  const byKind = (kind: string) => sdd?.components.filter((c) => c.kind === kind) ?? [];

  it('reads sdd-engineering components, tools, hook and manual-only flag', () => {
    expect(plugins).toHaveLength(5);
    expect(byKind('agent')).toHaveLength(3);
    expect(byKind('skill')).toHaveLength(2);
    expect(byKind('command').map((c) => c.name)).toEqual(['execute-plan', 'plan', 'sdd-retro', 'spec', 'verify']);
    expect(byKind('hook')).toHaveLength(1);

    const runPlan = byKind('skill').find((c) => c.name === 'run-plan');
    expect(runPlan?.description.length).toBeGreaterThan(100);
    expect(byKind('agent').find((c) => c.name === 'spec-creator')?.tools).toContain('Agent(research-tools:researcher, Explore)');
    expect(byKind('command').find((c) => c.name === 'sdd-retro')?.manualOnly).toBe(true);
    expect(sdd?.compatibility).toBe('>= 2.1.269');
    expect(sdd?.dependencies).toHaveLength(4);
    expect(sdd?.changelog.map((s) => s.version)).toEqual(['1.1.0', '1.0.0']);
  });

  it('reads the code-agents guard hook', () => {
    const hook = plugins.find((p) => p.name === 'code-agents')?.components.find((c) => c.kind === 'hook');
    expect(hook).toMatchObject({
      event: 'PreToolUse',
      matcher: 'Write|Edit|MultiEdit|NotebookEdit|Bash',
      timeout: 10,
    });
  });

  it('counts the whole catalog', () => {
    const all = plugins.flatMap((p) => p.components);
    const count = (k: string) => all.filter((c) => c.kind === k).length;
    expect([count('skill'), count('agent'), count('command'), count('hook'), count('mcp')]).toEqual([12, 7, 5, 2, 0]);
  });
});

describe('fixtures', () => {
  it('names the plugin on a version mismatch', () => {
    const root = fixture({
      '.claude-plugin/marketplace.json': catalog({ version: '2.0.0' }),
      'plugins/demo/.claude-plugin/plugin.json': manifest(),
    });
    expect(() => readPlugins(root, readCatalog(root))).toThrow(/demo.*disagree/);
  });

  it('names the plugin on a missing or escaping source', () => {
    const missing = fixture({ '.claude-plugin/marketplace.json': catalog() });
    expect(() => readPlugins(missing, readCatalog(missing))).toThrow(IndexError);
    expect(() => readPlugins(missing, readCatalog(missing))).toThrow(/demo/);

    const escaping = fixture({ '.claude-plugin/marketplace.json': catalog({ source: '../outside' }) });
    expect(() => readPlugins(escaping, readCatalog(escaping))).toThrow(/outside the repository/);
  });

  it('names the file on malformed frontmatter', () => {
    const root = fixture({
      '.claude-plugin/marketplace.json': catalog(),
      'plugins/demo/.claude-plugin/plugin.json': manifest(),
      'plugins/demo/agents/bad.md': '---\nname: [oops\n---\nbody',
    });
    expect(() => readPlugins(root, readCatalog(root))).toThrow(/plugins\/demo\/agents\/bad\.md/);
  });

  it('finds MCP servers, keeps catalog keywords and names commands from the file name', () => {
    const root = fixture({
      '.claude-plugin/marketplace.json': catalog({ keywords: ['alpha'] }),
      'plugins/demo/.claude-plugin/plugin.json': manifest({ keywords: ['beta'], mcpServers: { files: { command: 'x' } } }),
      'plugins/demo/.mcp.json': { mcpServers: { search: { command: 'y' } } },
      'plugins/demo/commands/go.md': '---\ndescription: Go\nargument-hint: <thing>\n---\nRun it',
      'plugins/demo/hooks/hooks.json': {
        hooks: { PreToolUse: [{ matcher: 'A', hooks: [{ timeout: 5 }] }, { matcher: 'B', hooks: [] }] },
      },
    });
    const [plugin] = readPlugins(root, readCatalog(root));
    expect(plugin?.keywords).toEqual(['alpha']);
    expect(plugin?.components.filter((c) => c.kind === 'mcp').map((c) => c.name).sort()).toEqual(['files', 'search']);
    expect(plugin?.components.find((c) => c.kind === 'command')).toMatchObject({ name: 'go', invocation: '/demo:go', argumentHint: '<thing>' });
    expect(plugin?.components.filter((c) => c.kind === 'hook').map((c) => c.name)).toEqual(['PreToolUse-1', 'PreToolUse-2']);
    expect(plugin?.components.every((c) => !c.path.startsWith('/'))).toBe(true);
  });

  it('never runs plugin scripts (AC-6)', () => {
    const marker = path.join(os.tmpdir(), `marker-${process.pid}-${Date.now()}.txt`);
    const script = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'x');`;
    const root = fixture({
      '.claude-plugin/marketplace.json': catalog(),
      'plugins/demo/.claude-plugin/plugin.json': manifest(),
      'plugins/demo/hooks/run.sh': `echo x > ${marker}\n`,
      'plugins/demo/hooks/hooks.json': { hooks: { Stop: [{ hooks: [{ command: 'sh run.sh' }] }] } },
      'plugins/demo/scripts/evil.mjs': script,
    });
    readPlugins(root, readCatalog(root));
    expect(fs.existsSync(marker)).toBe(false);
  });
});
