import type { SiteIndex } from '../../../contract/site-index';
import { t } from '../../../i18n/t';
import { gettingStartedPath } from '../../../lib/paths';
import styles from '../HomeScreen.module.css';

export function EmptyCatalog({ repo }: { repo: SiteIndex['meta']['repo'] }) {
  return (
    <section className={styles.empty}>
      <h1>{t('home.emptyTitle')}</h1>
      <p>{t('home.emptyBody')}</p>
      <p className={styles.ctas}>
        <a className={styles.ctaPrimary} href={gettingStartedPath()}>
          {t('home.emptyGettingStarted')}
        </a>
        <a
          className={styles.ctaSecondary}
          href={`${repo.url}/blob/${repo.defaultBranch}/CONTRIBUTING.md`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('home.emptyContributing')}
        </a>
      </p>
    </section>
  );
}
