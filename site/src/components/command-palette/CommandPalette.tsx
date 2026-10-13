import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { t } from '../../i18n/t';
import { search, type SearchEntry } from '../../lib/search';
import { KindBadge } from '../kind-badge';
import styles from './CommandPalette.module.css';

const MAX_RESULTS = 8;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface CommandPaletteProps {
  open: boolean;
  entries: readonly SearchEntry[];
  onClose: () => void;
  /** Called with the chosen entry; the palette then calls `onClose`. */
  onOpen: (entry: SearchEntry) => void;
}

export function CommandPalette({ open, entries, onClose, onOpen }: CommandPaletteProps) {
  if (!open) return null;
  return <PaletteDialog entries={entries} onClose={onClose} onOpen={onOpen} />;
}

function PaletteDialog({ entries, onClose, onOpen }: Omit<CommandPaletteProps, 'open'>) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = search(entries, query).slice(0, MAX_RESULTS);
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));
  const optionId = (i: number) => `${listId}-opt-${i}`;

  // Focus the input on open and give focus back to whatever had it before.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    return () => previous?.focus();
  }, []);

  function choose(entry: SearchEntry | undefined) {
    if (!entry) return;
    onOpen(entry);
    onClose();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) setActive((activeIndex + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0) setActive((activeIndex - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[activeIndex]);
    } else if (e.key === 'Tab') {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const current = document.activeElement;
      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      } else if (focusable.length === 1) {
        e.preventDefault();
      }
    }
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`${styles.dialog} anim-palette`}
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.label')}
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          role="combobox"
          aria-label={t('palette.inputLabel')}
          placeholder={t('palette.placeholder')}
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results.length > 0 ? optionId(activeIndex) : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
        />
        <ul id={listId} className={styles.list} role="listbox" aria-label={t('palette.label')}>
          {results.map((entry, i) => (
            <li
              key={entry.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? `${styles.option} ${styles.active}` : styles.option}
              onMouseMove={() => setActive(i)}
              onClick={() => choose(entry)}
            >
              <KindBadge kind={entry.kind} />
              <span className={styles.name}>{entry.name}</span>
              <span className={styles.description}>{entry.description}</span>
            </li>
          ))}
        </ul>
        {results.length === 0 && <p className={styles.empty}>{t('palette.noResults')}</p>}
        <p className={styles.hint}>{t('palette.hint')}</p>
      </div>
    </div>
  );
}
