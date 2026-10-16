import { describe, expect, it } from 'vitest';
import type { SiteIndex } from '../contract/site-index';
import { authors, hasKeywords, showAuthorFilter, topKeywords, visibleKinds } from './facets';

type P = { name: string; keywords?: string[]; author?: string };

function makeIndex(plugins: P[], mcp = 0): SiteIndex {
  return {
    plugins: plugins.map((p) => ({ name: p.name, keywords: p.keywords ?? [], author: p.author ?? '' })),
    components: Array.from({ length: mcp }, (_, i) => ({ kind: 'mcp', name: `m${i}` })),
  } as unknown as SiteIndex;
}

describe('facets', () => {
  it('hides empty optional kinds and shows them once present', () => {
    expect(visibleKinds(makeIndex([{ name: 'p' }]))).toEqual(['plugin', 'skill', 'agent']);
    expect(visibleKinds(makeIndex([{ name: 'p' }], 1))).toEqual(['plugin', 'skill', 'agent', 'mcp']);
  });

  it('ranks keywords by frequency then name, and derives author/keyword visibility', () => {
    const idx = makeIndex([
      { name: 'a', keywords: ['b', 'c'], author: 'x' },
      { name: 'b', keywords: ['c', 'a'], author: 'x' },
      { name: 'c', keywords: ['b'], author: 'x' },
    ]);
    expect(topKeywords(idx, 7)).toEqual(['b', 'c', 'a']);
    expect(topKeywords(idx, 1)).toEqual(['b']);
    expect(hasKeywords(idx)).toBe(true);
    expect(hasKeywords(makeIndex([{ name: 'a' }]))).toBe(false);
    expect(authors(idx)).toEqual(['x']);
    expect(showAuthorFilter(idx)).toBe(false);
    expect(showAuthorFilter(makeIndex([{ name: 'a', author: 'x' }, { name: 'b', author: 'y' }]))).toBe(true);
  });
});
