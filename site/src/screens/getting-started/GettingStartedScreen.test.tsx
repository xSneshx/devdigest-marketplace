import { cleanup, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import {
  installCommand,
  marketplaceAddCommand,
  marketplaceUpdateCommand,
  pluginUpdateCommand,
} from '../../contract/commands';
import { makeFixtureIndex } from '../../test/fixture-index';
import { renderAt } from '../../test/render-app';

afterEach(cleanup);

describe('GettingStartedScreen', () => {
  it('shows three copyable steps built from index data, plus both notes', async () => {
    const index = makeFixtureIndex();
    const { container } = renderAt('/getting-started', index);
    const { marketplaceName, repo } = index.meta;

    expect(await screen.findByRole('heading', { level: 1, name: 'Getting started' })).toBeInTheDocument();
    expect(screen.getByText(marketplaceAddCommand(repo.owner, repo.name))).toBeInTheDocument();
    expect(screen.getByText(installCommand('zod-helper', marketplaceName))).toBeInTheDocument();
    expect(screen.getByText(marketplaceUpdateCommand(marketplaceName))).toBeInTheDocument();
    expect(screen.getByText(pluginUpdateCommand('zod-helper', marketplaceName))).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Copy' })).toHaveLength(4);
    expect(screen.getByText(/repository is private/)).toBeInTheDocument();
    expect(screen.getByText(/Start a new session/)).toBeInTheDocument();

    for (const theme of ['dark', 'light']) {
      document.documentElement.dataset.theme = theme;
      const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    }
  });
});
