import { describe, expect, it } from 'vitest';
import { parseSearchParams, toSearchParams } from './search-params';

describe('search params', () => {
  it('round-trips state and drops defaults', () => {
    const state = { q: 'a b', kinds: ['agent', 'skill'] as ('agent' | 'skill')[], keywords: ['x', 'y'], author: 'ann', sort: 'name' as const };
    const qs = toSearchParams(state);
    expect(parseSearchParams(new URLSearchParams(qs.toString()))).toEqual(state);
    expect(toSearchParams({ q: '', sort: 'relevance' }).toString()).toBe('');
  });

  it('ignores unknown values', () => {
    const s = parseSearchParams(new URLSearchParams('kind=bogus&kind=hook&sort=nope&kw=&author='));
    expect(s).toEqual({ q: '', kinds: ['hook'], keywords: [], author: undefined, sort: 'relevance' });
  });
});
