// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SiteIndex } from '../contract/site-index';
import { search, toSearchEntries } from './search';

const INDEX_PATH = new URL('../../public/site-index.json', import.meta.url);
const present = existsSync(INDEX_PATH);

if (!present) {
  console.warn('search.real-index: public/site-index.json is absent, run `npm run index` first; tests skipped');
}

const QUERIES = [
  'zod',
  'review architecture',
  'react',
  'sdd',
  'spec creator',
  'hook',
  'agent',
  'typescript',
  'code review',
  'paved path',
  'marketplace',
  'install',
  'engineering',
  'researcher',
  'plan',
  'verify',
  'drizzle',
  'security',
  'a',
  '(',
];

describe.skipIf(!present)('search over the real generated index', () => {
  const index = SiteIndex.parse(JSON.parse(readFileSync(INDEX_PATH, 'utf8')));
  const entries = toSearchEntries(index);

  it('lists every catalog entry for an empty query and finds the zod skill', () => {
    expect(search(entries, '')).toHaveLength(31);
    const hits = search(entries, 'zod');
    expect(hits.some((e) => e.kind === 'skill' && e.name === 'zod')).toBe(true);
  });

  it('answers a query in at most 10 ms at the median (AC-18)', () => {
    // A single wall-clock sample is flaky under a loaded machine (a jsdom wall-clock assertion flaked under load in the dev-digest client suite),
    // so the bound is the median over 200 queries, not the worst case.
    const durations: number[] = [];
    for (let round = 0; round < 10; round++) {
      for (const q of QUERIES) {
        const start = performance.now();
        search(entries, q);
        durations.push(performance.now() - start);
      }
    }
    durations.sort((a, b) => a - b);
    expect(durations).toHaveLength(200);
    expect(durations[100]).toBeLessThanOrEqual(10);
  });
});
