import { useLocation, useNavigate } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n/t';
import { useSiteIndex } from '../../lib/index-context';
import { gettingStartedPath, homePath, searchPath, whatsNewPath } from '../../lib/paths';
import { parseSearchParams } from '../../lib/search-params';
import { wantsHeaderFocus } from './focus-state';
import { ThemeToggle } from './ThemeToggle';
import styles from './Layout.module.css';

/** react-router's HashRouter takes the path without the leading `#`. */
const toRoute = (hashPath: string): string => hashPath.replace(/^#/, '');

export function Header({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { meta } = useSiteIndex();
  const navigate = useNavigate();
  const location = useLocation();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const onSearch = location.pathname === '/search';
  // On the search screen the URL is the single source of the query.
  const value = onSearch ? parseSearchParams(new URLSearchParams(location.search)).q : draft;

  // The hero input unmounts when its first keystroke opens /search; continue typing here.
  useEffect(() => {
    const input = inputRef.current;
    if (!input || !wantsHeaderFocus(location.state)) return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
    // One-shot: drop the flag so Back/Forward to this entry does not steal focus again.
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location.key, location.state, location.pathname, location.search, navigate]);

  function onChange(q: string) {
    setDraft(q);
    navigate(toRoute(searchPath({ q })), { replace: onSearch });
  }

  return (
    <header className={styles.header}>
      <a className={styles.brand} href={homePath()}>
        {meta.marketplaceName}
      </a>
      <nav className={styles.nav} aria-label={t('app.mainNav')}>
        <a href={homePath()}>{t('nav.home')}</a>
        <a href={searchPath()}>{t('nav.search')}</a>
        <a href={whatsNewPath()}>{t('nav.whatsNew')}</a>
        <a href={gettingStartedPath()}>{t('nav.gettingStarted')}</a>
      </nav>
      <input
        ref={inputRef}
        className={styles.search}
        type="search"
        aria-label={t('header.searchLabel')}
        placeholder={t('header.searchPlaceholder')}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className={styles.paletteButton} aria-label={t('header.openPalette')} onClick={onOpenPalette}>
        <kbd>{t('header.paletteShortcut')}</kbd>
      </button>
      <ThemeToggle />
      <a className={styles.repo} href={meta.repo.url} rel="noopener noreferrer">
        {t('header.repository')}
      </a>
    </header>
  );
}
