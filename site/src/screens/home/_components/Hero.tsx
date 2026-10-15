import { useNavigate } from 'react-router';
import { FOCUS_HEADER_SEARCH } from '../../../components/layout';
import { t } from '../../../i18n/t';
import { gettingStartedPath, searchPath } from '../../../lib/paths';
import styles from '../HomeScreen.module.css';

export interface HeroProps {
  marketplaceName: string;
  keywords: string[];
}

/** `searchPath` returns a hash href; the router wants the path after the `#`. */
function toRoute(href: string): string {
  return href.startsWith('#') ? href.slice(1) : href;
}

export function Hero({ marketplaceName, keywords }: HeroProps) {
  const navigate = useNavigate();
  return (
    <section className={styles.hero}>
      <p className={styles.eyebrow}>{t('home.eyebrow')}</p>
      <h1 className={styles.title}>{t('home.heroTitle')}</h1>
      <p className={styles.subtitle}>{t('home.heroSubtitle', { name: marketplaceName })}</p>
      <input
        type="search"
        className={styles.search}
        aria-label={t('home.heroSearchLabel')}
        placeholder={t('home.heroSearchPlaceholder')}
        onChange={(event) => navigate(toRoute(searchPath({ q: event.target.value })), { state: FOCUS_HEADER_SEARCH })}
      />
      {keywords.length > 0 && (
        <section aria-labelledby="home-keywords" className={styles.keywords}>
          <h2 id="home-keywords" className={styles.visuallyHidden}>
            {t('home.keywordsHeading')}
          </h2>
          <ul className={styles.chips}>
            {keywords.map((keyword) => (
              <li key={keyword}>
                <a className={styles.chip} href={searchPath({ keywords: [keyword] })}>
                  {keyword}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className={styles.ctas}>
        <a className={styles.ctaPrimary} href={gettingStartedPath()}>
          {t('home.ctaGettingStarted')}
        </a>
        <a className={styles.ctaSecondary} href={searchPath()}>
          {t('home.ctaBrowse')}
        </a>
      </p>
    </section>
  );
}
