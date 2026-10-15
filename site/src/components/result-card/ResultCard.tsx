import { useRef } from 'react';
import { installCommand } from '../../contract/commands';
import { t } from '../../i18n/t';
import { componentPath, pluginPath } from '../../lib/paths';
import type { SearchEntry } from '../../lib/search';
import { CopyButton } from '../copy-button';
import { KindBadge } from '../kind-badge';
import styles from './ResultCard.module.css';

const MAX_KEYWORDS = 3;

export interface ResultCardProps {
  entry: SearchEntry;
  /** Marketplace name from the index meta; used to build the owning plugin's install command. */
  marketplace: string;
}

/** Every field is rendered as JSX text; nothing from the index is interpreted as HTML. */
export function ResultCard({ entry, marketplace }: ResultCardProps) {
  const codeRef = useRef<HTMLElement>(null);
  const command = installCommand(entry.plugin, marketplace);
  const href = entry.kind === 'plugin' ? pluginPath(entry.name) : componentPath(entry.id);

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <KindBadge kind={entry.kind} />
        <h3 className={styles.name}>{entry.name}</h3>
        {entry.version !== '' && <span className={styles.version}>{t('card.version', { version: entry.version })}</span>}
      </header>
      <p className={`${styles.description} clamp-2`}>{entry.description}</p>
      {entry.keywords.length > 0 && (
        <ul className={styles.keywords}>
          {entry.keywords.slice(0, MAX_KEYWORDS).map((k) => (
            <li key={k} className={styles.keyword}>
              {k}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.byline}>{t('card.byline', { plugin: entry.plugin, author: entry.author })}</p>
      <div className={styles.footer}>
        <code ref={codeRef} className={styles.command}>
          {command}
        </code>
        <CopyButton text={command} label={t('card.copyInstall')} targetRef={codeRef} />
        <a className={styles.open} href={href} aria-label={t('card.openLabel', { name: entry.name })}>
          {t('card.open')}
        </a>
      </div>
    </article>
  );
}
