import { useEffect, useRef, useState, type RefObject } from 'react';
import { copyText, selectContents } from '../../lib/clipboard';
import { t } from '../../i18n/t';
import { useAnnounce } from '../announcer';
import styles from './CopyButton.module.css';

const COPIED_MS = 2000;

export interface CopyButtonProps {
  text: string;
  /** Accessible name; defaults to the visible "Copy" label. */
  label?: string;
  /** The `<code>` element shown next to the button; selected when copying is unavailable. */
  targetRef?: RefObject<HTMLElement | null>;
}

type Phase = 'idle' | 'copied' | 'manual';

export function CopyButton({ text, label, targetRef }: CopyButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const announce = useAnnounce();

  useEffect(() => () => clearTimeout(timer.current), []);

  async function onClick() {
    clearTimeout(timer.current);
    const ok = await copyText(text);
    if (ok) {
      setPhase('copied');
      announce(t('copy.announced', { text }));
      timer.current = setTimeout(() => setPhase('idle'), COPIED_MS);
    } else {
      selectContents(targetRef?.current ?? null);
      setPhase('manual');
    }
  }

  return (
    <span className={styles.root}>
      <button type="button" className={styles.button} onClick={() => void onClick()} aria-label={label}>
        {phase === 'copied' ? t('copy.copied') : t('copy.copy')}
      </button>
      {phase === 'manual' && (
        <span role="status" className={`${styles.manual} anim-toast`}>
          {t('copy.manual')}
        </span>
      )}
    </span>
  );
}
