import { cleanup, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import {
  installCommand,
  marketplaceAddCommand,
  marketplaceUpdateCommand,
  pluginUpdateCommand,
  releaseChannelsUrl,
  STABLE_CHANNEL_REF,
  stableMarketplaceName,
} from '../../contract/commands';
import { makeFixtureIndex } from '../../test/fixture-index';
import { renderAt } from '../../test/render-app';

afterEach(cleanup);

describe('GettingStartedScreen', () => {
  it('shows both channel add commands, the docs link and the public note, built from index data', async () => {
    const index = makeFixtureIndex();
    const { container } = renderAt('/getting-started', index);
    const { marketplaceName, repo } = index.meta;

    expect(await screen.findByRole('heading', { level: 1, name: 'Getting started' })).toBeInTheDocument();
    expect(screen.getByText(marketplaceAddCommand(repo.owner, repo.name))).toBeInTheDocument();
    expect(screen.getByText(marketplaceAddCommand(repo.owner, repo.name, STABLE_CHANNEL_REF))).toBeInTheDocument();
    expect(screen.getByText(`Latest channel (${marketplaceName})`)).toBeInTheDocument();
    expect(screen.getByText(`Stable channel (${stableMarketplaceName(marketplaceName)})`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /release channels/i })).toHaveAttribute(
      'href',
      releaseChannelsUrl(repo.url, repo.defaultBranch),
    );
    expect(screen.getByText(installCommand('zod-helper', marketplaceName))).toBeInTheDocument();
    expect(screen.getByText(marketplaceUpdateCommand(marketplaceName))).toBeInTheDocument();
    expect(screen.getByText(pluginUpdateCommand('zod-helper', marketplaceName))).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Copy' })).toHaveLength(5);
    expect(screen.getByText(/repository is public/)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/private|credential/i);
    expect(screen.getByText(/Start a new session/)).toBeInTheDocument();

    for (const theme of ['dark', 'light']) {
      document.documentElement.dataset.theme = theme;
      const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    }
  });
});
