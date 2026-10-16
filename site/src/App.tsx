import type { ReactNode } from 'react';
import { HashRouter } from 'react-router';
import type { SiteIndex } from './contract/site-index';
import { AnnouncerProvider } from './components/announcer';
import { Layout } from './components/layout';
import { LoadState } from './components/load-state';
import { IndexProvider, useIndexState } from './lib/index-context';
import { AppRoutes } from './routes';

function Ready({ children }: { children: ReactNode }) {
  const state = useIndexState();
  if (state.status === 'loading') return <LoadState state="loading" />;
  if (state.status === 'error') return <LoadState state="error" onRetry={state.retry} />;
  return children;
}

/** `index` is for tests: it skips the fetch. */
export function App({ index }: { index?: SiteIndex }) {
  return (
    <HashRouter>
      <IndexProvider {...(index ? { value: index } : {})}>
        <Ready>
          <AnnouncerProvider>
            <Layout>
              <AppRoutes />
            </Layout>
          </AnnouncerProvider>
        </Ready>
      </IndexProvider>
    </HashRouter>
  );
}
