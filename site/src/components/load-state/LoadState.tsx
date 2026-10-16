import { t } from '../../i18n/t';
import styles from './LoadState.module.css';

export interface LoadStateProps {
  state: 'loading' | 'error';
  onRetry?: () => void;
}

export function LoadState({ state, onRetry }: LoadStateProps) {
  if (state === 'loading') {
    return (
      <div className={styles.root} role="status">
        <p>{t('app.loading')}</p>
      </div>
    );
  }
  return (
    <div className={styles.root} role="alert">
      <p>{t('app.loadError')}</p>
      {onRetry && (
        <button type="button" className={styles.button} onClick={onRetry}>
          {t('app.retry')}
        </button>
      )}
    </div>
  );
}
