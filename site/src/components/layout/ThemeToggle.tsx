import { t } from '../../i18n/t';
import { useTheme } from '../../lib/theme';
import styles from './Layout.module.css';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      className={styles.iconButton}
      aria-label={theme === 'dark' ? t('header.themeToLight') : t('header.themeToDark')}
      onClick={toggle}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}
