import type { Kind, SiteIndex } from '../../../contract/site-index';
import { KindDot } from '../../../components/kind-badge';
import { kindLabel, t } from '../../../i18n/t';
import { searchPath } from '../../../lib/paths';
import { kindCount } from '../helpers';
import styles from '../HomeScreen.module.css';

export interface KindSectionsProps {
  index: SiteIndex;
  kinds: Kind[];
}

export function KindSections({ index, kinds }: KindSectionsProps) {
  return (
    <>
      <section aria-labelledby="home-stats">
        <h2 id="home-stats" className={styles.sectionTitle}>
          {t('home.statsHeading')}
        </h2>
        <ul className="stats-grid">
          {kinds.map((kind) => {
            const count = kindCount(index, kind);
            return (
              <li key={kind}>
                <a
                  className={styles.tile}
                  data-kind={kind}
                  href={searchPath({ kinds: [kind] })}
                  aria-label={t('home.statTileLabel', { count, kind: kindLabel(kind, true) })}
                >
                  <span className={styles.tileCount}>{count}</span>
                  <span className={styles.tileKind}>
                    <KindDot kind={kind} />
                    {kindLabel(kind, true)}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-labelledby="home-browse">
        <h2 id="home-browse" className={styles.sectionTitle}>
          {t('home.browseByKindHeading')}
        </h2>
        <ul className={styles.kindList}>
          {kinds.map((kind) => (
            <li key={kind}>
              <a className={styles.kindRow} href={searchPath({ kinds: [kind] })}>
                <KindDot kind={kind} />
                <span className={styles.kindName}>{kindLabel(kind, true)}</span>
                <span className={styles.kindCount}>{kindCount(index, kind)}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
