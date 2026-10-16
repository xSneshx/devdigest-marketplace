import type { Kind, SiteIndex } from '../contract/site-index';

export type SortKey = 'relevance' | 'name' | 'updated';

export interface SearchFilters {
  kinds: readonly Kind[];
  keywords: readonly string[];
  author?: string | undefined;
}

export interface SearchEntry {
  id: string;
  kind: Kind;
  name: string;
  /** Owning plugin: the plugin itself for a plugin entry. */
  plugin: string;
  description: string;
  keywords: string[];
  body: string;
  version: string;
  author: string;
  updated: string;
  /** Lower-cased copies, computed once in `toSearchEntries`. */
  lower: { name: string; keywords: string[]; description: string; body: string };
}

export const NO_FILTERS: SearchFilters = { kinds: [], keywords: [], author: undefined };

function makeEntry(e: Omit<SearchEntry, 'lower'>): SearchEntry {
  return {
    ...e,
    lower: {
      name: e.name.toLowerCase(),
      keywords: e.keywords.map((k) => k.toLowerCase()),
      description: e.description.toLowerCase(),
      body: e.body.toLowerCase(),
    },
  };
}

export function toSearchEntries(index: SiteIndex): SearchEntry[] {
  const byPlugin = new Map(index.plugins.map((p) => [p.name, p]));
  const entries: SearchEntry[] = index.plugins.map((p) =>
    makeEntry({
      id: p.name,
      kind: 'plugin',
      name: p.name,
      plugin: p.name,
      description: p.description,
      keywords: p.keywords,
      body: p.readme ?? '',
      version: p.version,
      author: p.author,
      updated: p.updated,
    }),
  );
  for (const c of index.components) {
    const owner = byPlugin.get(c.plugin);
    entries.push(
      makeEntry({
        id: c.id,
        kind: c.kind,
        name: c.name,
        plugin: c.plugin,
        description: c.description,
        keywords: [],
        body: c.body ?? '',
        version: owner?.version ?? '',
        author: owner?.author ?? '',
        updated: owner?.updated ?? '',
      }),
    );
  }
  return entries;
}

const TIER_NAME = 0;
const TIER_KEYWORD = 1;
const TIER_DESCRIPTION = 2;
const TIER_BODY = 3;

/** Best (lowest) tier at which the token matches, or undefined when it matches nowhere. */
function tokenTier(entry: SearchEntry, token: string): number | undefined {
  const { lower } = entry;
  if (lower.name.includes(token)) return TIER_NAME;
  if (lower.keywords.some((k) => k.includes(token))) return TIER_KEYWORD;
  if (lower.description.includes(token)) return TIER_DESCRIPTION;
  if (lower.body.includes(token)) return TIER_BODY;
  return undefined;
}

/** Sum of per-token tiers; undefined when any token fails to match. */
function relevanceScore(entry: SearchEntry, tokens: readonly string[]): number | undefined {
  let score = 0;
  for (const token of tokens) {
    const tier = tokenTier(entry, token);
    if (tier === undefined) return undefined;
    score += tier;
  }
  return score;
}

function passesFilters(entry: SearchEntry, filters: SearchFilters): boolean {
  if (filters.kinds.length > 0 && !filters.kinds.includes(entry.kind)) return false;
  if (filters.keywords.length > 0) {
    const own = entry.lower.keywords;
    if (!filters.keywords.some((k) => own.includes(k.toLowerCase()))) return false;
  }
  if (filters.author !== undefined && filters.author !== '' && entry.author !== filters.author) return false;
  return true;
}

const byName = (a: SearchEntry, b: SearchEntry): number =>
  a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id, 'en');

/** Literal, case-insensitive token matching. Never builds a RegExp from user input. */
export function search(
  entries: readonly SearchEntry[],
  query: string,
  filters: SearchFilters = NO_FILTERS,
  sort: SortKey = 'relevance',
): SearchEntry[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  const scored: Array<{ entry: SearchEntry; score: number }> = [];
  for (const entry of entries) {
    if (!passesFilters(entry, filters)) continue;
    const score = relevanceScore(entry, tokens);
    if (score === undefined) continue;
    scored.push({ entry, score });
  }

  if (sort === 'name') scored.sort((a, b) => byName(a.entry, b.entry));
  else if (sort === 'updated')
    scored.sort((a, b) => b.entry.updated.localeCompare(a.entry.updated, 'en') || byName(a.entry, b.entry));
  else scored.sort((a, b) => a.score - b.score || byName(a.entry, b.entry));

  return scored.map((s) => s.entry);
}
