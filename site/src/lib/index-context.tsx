import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SiteIndex } from '../contract/site-index';
import { toSearchEntries, type SearchEntry } from './search';

export type IndexState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; index: SiteIndex };

const INDEX_URL = './site-index.json';

const IndexContext = createContext<IndexState | null>(null);

type Fetched = { status: 'loading' } | { status: 'error' } | { status: 'ready'; index: SiteIndex };

async function loadIndex(signal: AbortSignal): Promise<SiteIndex> {
  const response = await fetch(INDEX_URL, { signal });
  if (!response.ok) throw new Error(`index request failed: ${response.status}`);
  return SiteIndex.parse(await response.json());
}

export function IndexProvider({ children, value }: { children: ReactNode; value?: SiteIndex }) {
  const [attempt, setAttempt] = useState(0);
  const [fetched, setFetched] = useState<Fetched>({ status: 'loading' });

  useEffect(() => {
    if (value) return;
    const controller = new AbortController();
    loadIndex(controller.signal).then(
      (index) => {
        if (!controller.signal.aborted) setFetched({ status: 'ready', index });
      },
      () => {
        if (!controller.signal.aborted) setFetched({ status: 'error' });
      },
    );
    return () => controller.abort();
  }, [value, attempt]);

  const state = useMemo<IndexState>(() => {
    if (value) return { status: 'ready', index: value };
    if (fetched.status === 'error') {
      return {
        status: 'error',
        retry: () => {
          setFetched({ status: 'loading' });
          setAttempt((n) => n + 1);
        },
      };
    }
    return fetched;
  }, [value, fetched]);

  return <IndexContext.Provider value={state}>{children}</IndexContext.Provider>;
}

export function useIndexState(): IndexState {
  const state = useContext(IndexContext);
  if (!state) throw new Error('useIndexState must be used inside IndexProvider');
  return state;
}

/** The loaded index. Only call below the gate that renders children once the index is ready. */
export function useSiteIndex(): SiteIndex {
  const state = useIndexState();
  if (state.status !== 'ready') throw new Error('useSiteIndex called before the index is ready');
  return state.index;
}

export function useSearchEntries(): SearchEntry[] {
  const index = useSiteIndex();
  return useMemo(() => toSearchEntries(index), [index]);
}
