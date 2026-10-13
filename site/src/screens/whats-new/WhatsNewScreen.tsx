import { SafeMarkdown } from '../../components/safe-markdown';
import { useSiteIndex } from '../../lib/index-context';
import { formatDate } from '../../lib/format';
import { pluginPath } from '../../lib/paths';
import { t } from '../../i18n/t';
import styles from './WhatsNewScreen.module.css';

export function WhatsNewScreen() {
  const index = useSiteIndex();
  const { releases, plugins, meta } = index;
  const sourcePaths = new Map(plugins.map((p) => [p.name, p.sourcePath]));

  return (
    <section className={styles.root}>
      <h1 className={styles.title}>{t('whatsNew.title')}</h1>
      <p className={styles.subtitle}>{t('whatsNew.subtitle')}</p>
      {releases.length === 0 ? (
        <p className={styles.empty}>{t('whatsNew.empty')}</p>
      ) : (
        <ol className={styles.list}>
          {releases.map((release) => {
            const sourcePath = sourcePaths.get(release.plugin) ?? '';
            return (
              <li key={release.tag} className={styles.item}>
                <div className={styles.header}>
                  <a className={styles.plugin} href={pluginPath(release.plugin)}>
                    {release.plugin}
                  </a>
                  <span className={styles.version}>{t('card.version', { version: release.version })}</span>
                  <time className={styles.date} dateTime={release.date}>
                    {formatDate(release.date)}
                  </time>
                </div>
                <div className={styles.summary}>
                  <SafeMarkdown
                    inline
                    markdown={release.summary}
                    source={{
                      repoUrl: meta.repo.url,
                      branch: meta.repo.defaultBranch,
                      filePath: `${sourcePath}/CHANGELOG.md`,
                    }}
                  />
                </div>
                {release.evidenceUrl && (
                  <a className={styles.evidence} href={release.evidenceUrl} target="_blank" rel="noopener noreferrer">
                    {t('whatsNew.evidence')}
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
