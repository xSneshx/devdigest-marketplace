import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { t } from '../../i18n/t';
import { useSearchEntries, useSiteIndex } from '../../lib/index-context';
import { componentPath, pluginPath } from '../../lib/paths';
import type { SearchEntry } from '../../lib/search';
import { useAnnounce } from '../announcer';
import { CommandPalette } from '../command-palette';
import { wantsHeaderFocus } from './focus-state';
import { Header } from './Header';
import styles from './Layout.module.css';

export function Layout({ children }: { children: ReactNode }) {
  const { meta } = useSiteIndex();
  const entries = useSearchEntries();
  const navigate = useNavigate();
  const { pathname, state } = useLocation();
  const lastPath = useRef<string | null>(null);
  const announce = useAnnounce();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // Ctrl/Cmd+K opens the quick-search palette from anywhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Per route: title always; focus and announcement only after a navigation, never on first load.
  // Depends on the pathname only, so typing in the search box (query changes) keeps focus.
  useEffect(() => {
    const heading = mainRef.current?.querySelector('h1');
    const screen = heading?.textContent ?? '';
    document.title = t('app.documentTitle', { screen, name: meta.marketplaceName });
    // The one-shot hand-off flag is cleared by a same-path replace; that is not a navigation.
    const samePath = lastPath.current === pathname;
    lastPath.current = pathname;
    if (samePath) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Never pull focus out of a text field: typing in the header search navigates to /search.
    // The header search takes focus itself when the home hero hands it over (see Header).
    if (heading && !wantsHeaderFocus(state) && !(document.activeElement instanceof HTMLInputElement)) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    announce(t('app.routeChanged', { screen }));
  }, [pathname, state, meta.marketplaceName, announce]);

  function openEntry(entry: SearchEntry) {
    const hashPath = entry.kind === 'plugin' ? pluginPath(entry.name) : componentPath(entry.id);
    navigate(hashPath.replace(/^#/, ''));
  }

  return (
    <div className={styles.root}>
      <a
        className={styles.skip}
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        {t('app.skipToContent')}
      </a>
      <Header onOpenPalette={() => setPaletteOpen(true)} />
      <main id="main" ref={mainRef} className={styles.main} tabIndex={-1}>
        {children}
      </main>
      <CommandPalette
        open={paletteOpen}
        entries={entries}
        onClose={() => setPaletteOpen(false)}
        onOpen={openEntry}
      />
    </div>
  );
}
