import { Kind } from '../contract/site-index';
import type { SortKey } from './search';

export interface SearchState {
  q: string;
  kinds: Kind[];
  keywords: string[];
  author: string | undefined;
  sort: SortKey;
}

export const DEFAULT_SORT: SortKey = 'relevance';
const SORTS: readonly SortKey[] = ['relevance', 'name', 'updated'];

export function emptySearchState(): SearchState {
  return { q: '', kinds: [], keywords: [], author: undefined, sort: DEFAULT_SORT };
}

function isSortKey(v: string | null): v is SortKey {
  return v !== null && (SORTS as readonly string[]).includes(v);
}

/** Unknown kinds and sorts are ignored rather than rejected. */
export function parseSearchParams(params: URLSearchParams): SearchState {
  const kinds: Kind[] = [];
  for (const raw of params.getAll('kind')) {
    const parsed = Kind.safeParse(raw);
    if (parsed.success && !kinds.includes(parsed.data)) kinds.push(parsed.data);
  }
  const keywords = [...new Set(params.getAll('kw').filter((k) => k !== ''))];
  const author = params.get('author');
  const sort = params.get('sort');
  return {
    q: params.get('q') ?? '',
    kinds,
    keywords,
    author: author === null || author === '' ? undefined : author,
    sort: isSortKey(sort) ? sort : DEFAULT_SORT,
  };
}

export function toSearchParams(state: Partial<SearchState>): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  for (const k of state.kinds ?? []) params.append('kind', k);
  for (const k of state.keywords ?? []) params.append('kw', k);
  if (state.author) params.set('author', state.author);
  if (state.sort && state.sort !== DEFAULT_SORT) params.set('sort', state.sort);
  return params;
}
