import { Route, Routes, useParams } from 'react-router';
import { NotFound } from './components/not-found';
import { useSiteIndex } from './lib/index-context';
import { parseComponentRoute } from './lib/paths';
import { ComponentScreen } from './screens/component';
import { GettingStartedScreen } from './screens/getting-started';
import { HomeScreen } from './screens/home';
import { PluginScreen } from './screens/plugin';
import { SearchScreen } from './screens/search';
import { WhatsNewScreen } from './screens/whats-new';

function PluginRoute() {
  const { name } = useParams();
  const index = useSiteIndex();
  if (!name || !index.plugins.some((p) => p.name === name)) {
    return <NotFound variant="plugin" name={name ?? ''} />;
  }
  return <PluginScreen />;
}

function ComponentRoute() {
  const { kind, plugin, name } = useParams();
  const index = useSiteIndex();
  const id = parseComponentRoute(kind, plugin, name);
  if (!id || !index.components.some((c) => c.id === id)) return <NotFound variant="component" />;
  return <ComponentScreen />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/search" element={<SearchScreen />} />
      <Route path="/plugin/:name" element={<PluginRoute />} />
      <Route path="/component/:kind/:plugin/:name" element={<ComponentRoute />} />
      <Route path="/whats-new" element={<WhatsNewScreen />} />
      <Route path="/getting-started" element={<GettingStartedScreen />} />
      <Route path="*" element={<NotFound variant="page" />} />
    </Routes>
  );
}
