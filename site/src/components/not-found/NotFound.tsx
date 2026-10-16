import { t } from '../../i18n/t';
import { homePath, searchPath } from '../../lib/paths';
import styles from './NotFound.module.css';

export interface NotFoundProps {
  variant: 'plugin' | 'component' | 'page';
  name?: string;
}

function body(variant: NotFoundProps['variant'], name: string | undefined): string {
  if (variant === 'plugin') return t('notFound.pluginBody', { name: name ?? '' });
  if (variant === 'component') return t('notFound.componentBody');
  return t('notFound.pageBody');
}

export function NotFound({ variant, name }: NotFoundProps) {
  return (
    <section className={styles.root}>
      <h1>{t('notFound.title')}</h1>
      <p className={styles.body}>{body(variant, name)}</p>
      <p className={styles.links}>
        <a href={homePath()}>{t('notFound.home')}</a>
        <a href={searchPath()}>{t('notFound.search')}</a>
      </p>
    </section>
  );
}
