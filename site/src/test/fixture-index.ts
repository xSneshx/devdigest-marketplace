import { SiteIndex } from '../contract/site-index';

const REPO = 'https://github.com/acme/market';

/** A small valid index: 2 plugins, every component kind, 3 releases. Shallow-merges `overrides`. */
export function makeFixtureIndex(overrides: Partial<SiteIndex> = {}): SiteIndex {
  const base: SiteIndex = {
    schemaVersion: 1,
    meta: {
      marketplaceName: 'acme-market',
      ownerName: 'Acme',
      repo: { owner: 'acme', name: 'market', url: REPO, defaultBranch: 'main' },
      commit: { sha: 'abcdef0123456789abcdef0123456789abcdef01', shortSha: 'abcdef0', date: '2026-10-01T10:00:00Z' },
      builtAt: '2026-10-02T08:00:00Z',
      releaseTagCount: 3,
    },
    plugins: [
      {
        name: 'zod-helper',
        version: '1.2.0',
        description: 'Validation helpers built on zod.',
        author: 'Ada',
        keywords: ['zod', 'validation', 'schema', 'extra'],
        dependencies: [],
        dependents: ['review-kit'],
        installCommand: 'claude plugin install zod-helper@acme-market',
        sourcePath: 'plugins/zod-helper',
        url: `${REPO}/tree/main/plugins/zod-helper`,
        compatibility: 'Claude Code 2+',
        updated: '2026-10-01T10:00:00Z',
        released: true,
        readme: '# zod-helper\n\nValidate things.',
        changelog: [{ version: '1.2.0', tag: 'zod-helper--v1.2.0', date: '2026-10-01T10:00:00Z', markdown: '- Added schema skill' }],
        counts: { skill: 1, agent: 1, command: 1, hook: 1, mcp: 1 },
      },
      {
        name: 'review-kit',
        version: '0.4.1',
        description: 'Pull request review tooling.',
        author: 'Grace',
        keywords: ['review', 'pr'],
        dependencies: [{ name: 'zod-helper', range: '^1.0.0' }],
        dependents: [],
        installCommand: 'claude plugin install review-kit@acme-market',
        sourcePath: 'plugins/review-kit',
        url: `${REPO}/tree/main/plugins/review-kit`,
        updated: '2026-09-20T10:00:00Z',
        released: true,
        changelog: [],
        counts: { skill: 0, agent: 0, command: 0, hook: 0, mcp: 0 },
      },
    ],
    components: [
      { id: 'skill:zod-helper/schema', kind: 'skill', plugin: 'zod-helper', name: 'schema', invocation: 'zod-helper:schema', description: 'Write a zod schema.', body: 'Use zod.', path: 'plugins/zod-helper/skills/schema/SKILL.md' },
      { id: 'agent:zod-helper/checker', kind: 'agent', plugin: 'zod-helper', name: 'checker', invocation: 'zod-helper:checker', description: 'Checks schemas.', path: 'plugins/zod-helper/agents/checker.md', tools: ['Read', 'Grep'], model: 'sonnet' },
      { id: 'command:zod-helper/gen', kind: 'command', plugin: 'zod-helper', name: 'gen', invocation: '/zod-helper:gen', description: 'Generate a schema.', path: 'plugins/zod-helper/commands/gen.md', argumentHint: '<type>' },
      { id: 'hook:zod-helper/lint', kind: 'hook', plugin: 'zod-helper', name: 'lint', description: 'Lint on edit.', path: 'plugins/zod-helper/hooks/hooks.json', event: 'PostToolUse', matcher: 'Edit', timeout: 10 },
      { id: 'mcp:zod-helper/docs', kind: 'mcp', plugin: 'zod-helper', name: 'docs', invocation: 'zod-helper:docs', description: 'Docs server.', path: 'plugins/zod-helper/.mcp.json' },
    ],
    releases: [
      { plugin: 'zod-helper', version: '1.2.0', tag: 'zod-helper--v1.2.0', date: '2026-10-01T10:00:00Z', summary: '- Added schema skill', evidenceUrl: `${REPO}/releases/tag/zod-helper--v1.2.0` },
      { plugin: 'review-kit', version: '0.4.1', tag: 'review-kit--v0.4.1', date: '2026-09-20T10:00:00Z', summary: '- Fix review output' },
      { plugin: 'zod-helper', version: '1.0.0', tag: 'zod-helper--v1.0.0', date: '2026-09-01T10:00:00Z', summary: '- First release' },
    ],
    stats: { plugins: 2, skills: 1, agents: 1, commands: 1, hooks: 1, mcp: 1, releases: 3, latestReleaseDate: '2026-10-01T10:00:00Z' },
  };
  return SiteIndex.parse({ ...base, ...overrides });
}
