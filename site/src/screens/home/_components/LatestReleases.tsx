import { SafeMarkdown } from '../../../components/safe-markdown';
import type { SiteIndex } from '../../../contract/site-index';
import { t } from '../../../i18n/t';
import { formatDate } from '../../../lib/format';
import { pluginPath, whatsNewPath } from '../../../lib/paths';
import { newestReleases } from '../helpers';
import styles from '../HomeScreen.module.css';

export function LatestReleases({ index }: { index: SiteIndex }) {
  const releases = newestReleases(index);
  const { repo } = index.meta;
  return (
    <section aria-labelledby="home-whats-new">
      <h2 id="home-whats-new" className={styles.sectionTitle}>
        {t('home.whatsNewHeading')}
      </h2>
      {releases.length > 0 && (
        <ul className={styles.feed}>
          {releases.map((release) => (
            <li key={release.tag} className={styles.feedItem}>
              <a className={styles.feedLink} href={pluginPath(release.plugin)}>
                <span className={styles.feedPlugin}>{release.plugin}</span>
                <span className={styles.feedVersion}>{release.version}</span>
                <time className={styles.feedDate} dateTime={release.date}>
                  {formatDate(release.date)}
                </time>
              </a>
              <div className={styles.feedSummary}>
                <SafeMarkdown
                  inline
                  markdown={release.summary}
                  source={{ repoUrl: repo.url, branch: repo.defaultBranch, filePath: 'CHANGELOG.md' }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p>
        <a href={whatsNewPath()}>{t('home.whatsNewAll')}</a>
      </p>
    </section>
  );
}
