import type { SiteIndex } from '../../../contract/site-index';
import { t, tPlural } from '../../../i18n/t';
import { formatDate } from '../../../lib/format';
import styles from '../HomeScreen.module.css';

export function Footer({ index }: { index: SiteIndex }) {
  const { stats, meta } = index;
  return (
    <p className={styles.footer}>
      <span>{tPlural('home.footerReleases', stats.releases)}</span>
      {stats.latestReleaseDate && <span>{t('home.footerLatest', { date: formatDate(stats.latestReleaseDate) })}</span>}
      <span>{t('home.footerBuiltFrom', { sha: meta.commit.shortSha, date: formatDate(meta.commit.date) })}</span>
    </p>
  );
}
