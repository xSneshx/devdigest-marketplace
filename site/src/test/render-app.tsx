import { render } from '@testing-library/react';
import { App } from '../App';
import type { SiteIndex } from '../contract/site-index';
import { makeFixtureIndex } from './fixture-index';

/** Renders the whole app at a hash route (`/plugin/x`, `/search?q=a`) with an injected index. */
export function renderAt(path: string, index: SiteIndex = makeFixtureIndex()) {
  window.location.hash = `#${path}`;
  return render(<App index={index} />);
}
