import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import styles from './Announcer.module.css';

type Announce = (message: string) => void;

const noop: Announce = () => undefined;
const AnnounceContext = createContext<Announce>(noop);

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState({ text: '', n: 0 });
  const announce = useCallback<Announce>((text) => setMessage((m) => ({ text, n: m.n + 1 })), []);
  const value = useMemo(() => announce, [announce]);

  return (
    <AnnounceContext.Provider value={value}>
      {children}
      <div className={styles.region} aria-live="polite" aria-atomic="true" role="status">
        <span key={message.n}>{message.text}</span>
      </div>
    </AnnounceContext.Provider>
  );
}

/** Returns a function that announces a message to screen readers. A no-op outside the provider. */
export function useAnnounce(): Announce {
  return useContext(AnnounceContext);
}
