import { describe, expect, it } from 'vitest';
import type { SiteIndex } from '../contract/site-index';
import { search, toSearchEntries, type SearchEntry } from './search';

type P = SiteIndex['plugins'][number];
type C = SiteIndex['components'][number];

function plugin(over: Partial<P> & { name: string }): P {
  return {
    version: '1.0.0',
    description: '',
    author: 'a',
    keywords: [],
    dependencies: [],
    dependents: [],
    installCommand: 'x',
    sourcePath: `plugins/${over.name}`,
    url: 'https://github.com/o/r/tree/main/x',
    updated: '2026-01-01T00:00:00Z',
    released: true,
    changelog: [],
    counts: { skill: 0, agent: 0, command: 0, hook: 0, mcp: 0 },
    ...over,
  };
}

function component(over: Partial<C> & { kind: C['kind']; plugin: string; name: string }): C {
  return {
    id: `${over.kind}:${over.plugin}/${over.name}`,
    description: '',
    path: `plugins/${over.plugin}/${over.name}.md`,
    ...over,
  };
}

function makeIndex(plugins: P[], components: C[]): SiteIndex {
  return {
    schemaVersion: 1,
    meta: {
      marketplaceName: 'm',
      ownerName: 'o',
      repo: { owner: 'o', name: 'r', url: 'https://github.com/o/r', defaultBranch: 'main' },
      commit: { sha: 'abcdef1234', shortSha: 'abcdef1', date: '2026-01-01T00:00:00Z' },
      builtAt: '2026-01-02T00:00:00Z',
      releaseTagCount: 0,
    },
    plugins,
    components,
    releases: [],
    stats: { plugins: plugins.length, skills: 0, agents: 0, commands: 0, hooks: 0, mcp: 0, releases: 0 },
  };
}

const index = makeIndex(
  [
    plugin({ name: 'zeta', description: 'misc', author: 'ann', keywords: ['react'], updated: '2026-03-01T00:00:00Z', readme: 'uses widgets' }),
    plugin({ name: 'alpha', description: 'widgets helper', author: 'bob', keywords: ['widgets'], updated: '2026-02-01T00:00:00Z' }),
    plugin({ name: 'widgets-kit', author: 'ann', updated: '2026-01-15T00:00:00Z' }),
  ],
  [
    component({ kind: 'agent', plugin: 'zeta', name: 'architecture-reviewer', description: 'Reviews architecture' }),
    component({ kind: 'skill', plugin: 'alpha', name: 'writer', description: 'writes' }),
  ],
);
const entries = toSearchEntries(index);
const names = (r: SearchEntry[]) => r.map((e) => e.name);

describe('search', () => {
  it('matches every token against some field, literally', () => {
    expect(names(search(entries, 'review architecture'))).toEqual(['architecture-reviewer']);
    expect(search(entries, 'react zzz')).toEqual([]);
    expect(() => search(entries, '(')).not.toThrow();
    expect(search(entries, '.*')).toEqual([]);
    expect(search(entries, '   ')).toHaveLength(entries.length);
    expect(search(entries, '')).toHaveLength(5);
  });

  it('ranks name, then keyword, then description, then body; ties by name', () => {
    expect(names(search(entries, 'widgets'))).toEqual(['widgets-kit', 'alpha', 'zeta']);
    const tie = toSearchEntries(
      makeIndex([plugin({ name: 'b-x', description: 'q' }), plugin({ name: 'a-x', description: 'q' })], []),
    );
    expect(names(search(tie, 'q'))).toEqual(['a-x', 'b-x']);
  });

  it('sorts by name and by newest updated', () => {
    expect(names(search(entries, '', undefined, 'name'))).toEqual([
      'alpha',
      'architecture-reviewer',
      'widgets-kit',
      'writer',
      'zeta',
    ]);
    expect(names(search(entries, '', undefined, 'updated')).slice(0, 3)).toEqual([
      'architecture-reviewer', // inherits zeta's date; ties go by name
      'zeta',
      'alpha',
    ]);
  });

  it('combines kind, keyword and author filters', () => {
    expect(names(search(entries, '', { kinds: ['agent'], keywords: [] }))).toEqual(['architecture-reviewer']);
    expect(names(search(entries, '', { kinds: ['plugin'], keywords: [], author: 'ann' }, 'name'))).toEqual([
      'widgets-kit',
      'zeta',
    ]);
    expect(names(search(entries, '', { kinds: [], keywords: ['react', 'widgets'] }, 'name'))).toEqual(['alpha', 'zeta']);
    expect(search(entries, '', { kinds: ['skill'], keywords: ['react'] })).toEqual([]);
  });

  it('answers a 200-entry query fast (median of 200 runs <= 10 ms)', () => {
    // Tripwire, not a browser budget: jsdom/CI timing is noisy, so the bound is loose on purpose.
    const many = toSearchEntries(
      makeIndex(
        Array.from({ length: 200 }, (_, i) =>
          plugin({ name: `plugin-${i}`, description: `description ${i} lorem ipsum`, keywords: ['k'], readme: 'body '.repeat(200) }),
        ),
        [],
      ),
    );
    const times: number[] = [];
    for (let i = 0; i < 200; i++) {
      const t = performance.now();
      search(many, 'lorem plugin', undefined, 'relevance');
      times.push(performance.now() - t);
    }
    times.sort((a, b) => a - b);
    expect(times[100] ?? Infinity).toBeLessThanOrEqual(10);
  });
});
