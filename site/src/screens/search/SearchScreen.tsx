import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { ResultCard } from '../../components/result-card';
import type { Kind } from '../../contract/site-index';
import { kindLabel, t, tPlural } from '../../i18n/t';
import { authors, hasKeywords, showAuthorFilter, topKeywords, visibleKinds } from '../../lib/facets';
import { useSearchEntries, useSiteIndex } from '../../lib/index-context';
import { search, type SortKey } from '../../lib/search';
import { emptySearchState, parseSearchParams, toSearchParams, type SearchState } from '../../lib/search-params';
import { MAX_KEYWORD_FACETS, toggle } from './helpers';
import styles from './SearchScreen.module.css';

const SORT_LABELS: Record<SortKey, 'search.sortRelevance' | 'search.sortName' | 'search.sortUpdated'> = {
  relevance: 'search.sortRelevance',
  name: 'search.sortName',
  updated: 'search.sortUpdated',
};

export function SearchScreen() {
  const index = useSiteIndex();
  const entries = useSearchEntries();
  const [params, setParams] = useSearchParams();
  // The URL is the only state: derive everything from it on each render.
  const state = useMemo(() => parseSearchParams(params), [params]);

  const results = useMemo(
    () => search(entries, state.q, { kinds: state.kinds, keywords: state.keywords, author: state.author }, state.sort),
    [entries, state],
  );

  const kinds = visibleKinds(index);
  const keywords = hasKeywords(index) ? topKeywords(index, MAX_KEYWORD_FACETS) : [];
  const authorList = showAuthorFilter(index) ? authors(index) : [];
  const count = results.length;

  function update(patch: Partial<SearchState>) {
    setParams(toSearchParams({ ...state, ...patch }), { replace: true });
  }

  function clearAll() {
    setParams(toSearchParams(emptySearchState()), { replace: true });
  }

  const title = state.q.trim() === '' ? t('search.catalogTitle') : t('search.resultsTitle', { query: state.q });

  return (
    <div className={styles.root}>
      <aside className={styles.facets} aria-label={t('search.filtersHeading')}>
        <h2 className={styles.facetsHeading}>{t('search.filtersHeading')}</h2>

        <fieldset className={styles.group}>
          <legend>{t('search.filterKind')}</legend>
          {kinds.map((k: Kind) => (
            <label key={k} className={styles.option}>
              <input
                type="checkbox"
                checked={state.kinds.includes(k)}
                onChange={() => update({ kinds: toggle(state.kinds, k) })}
              />
              {kindLabel(k, true)}
            </label>
          ))}
        </fieldset>

        {keywords.length > 0 && (
          <fieldset className={styles.group}>
            <legend>{t('search.filterKeyword')}</legend>
            {keywords.map((k) => (
              <label key={k} className={styles.option}>
                <input
                  type="checkbox"
                  checked={state.keywords.includes(k)}
                  onChange={() => update({ keywords: toggle(state.keywords, k) })}
                />
                {k}
              </label>
            ))}
          </fieldset>
        )}

        {authorList.length > 0 && (
          <div className={styles.group}>
            <label htmlFor="search-author">{t('search.filterAuthor')}</label>
            <select
              id="search-author"
              className={styles.select}
              value={state.author ?? ''}
              onChange={(e) => update({ author: e.target.value === '' ? undefined : e.target.value })}
            >
              <option value="">{t('search.filterAuthorAny')}</option>
              {authorList.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="button" className={styles.clear} onClick={clearAll}>
          {t('search.clearAll')}
        </button>
      </aside>

      <section className={styles.main}>
        <header className={styles.top}>
          <div>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.count} aria-live="polite">
              {tPlural('search.resultCount', count)}
            </p>
          </div>
          <div className={styles.sort}>
            <label htmlFor="search-sort">{t('search.sortLabel')}</label>
            <select
              id="search-sort"
              className={styles.select}
              value={state.sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((s) => (
                <option key={s} value={s}>
                  {t(SORT_LABELS[s])}
                </option>
              ))}
            </select>
          </div>
        </header>

        {count === 0 ? (
          <div className={styles.empty}>
            <h2>{t('search.noResultsTitle')}</h2>
            <p>{t('search.noResultsBody')}</p>
            <button type="button" className={styles.clear} onClick={clearAll}>
              {t('search.clearFilters')}
            </button>
          </div>
        ) : (
          <ul className={styles.list}>
            {results.map((entry) => (
              <li key={entry.id}>
                <ResultCard entry={entry} marketplace={index.meta.marketplaceName} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
