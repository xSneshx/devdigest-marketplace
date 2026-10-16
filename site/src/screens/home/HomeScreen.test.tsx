import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { makeFixtureIndex } from '../../test/fixture-index';
import { renderAt } from '../../test/render-app';

afterEach(cleanup);

function feedLinks(): HTMLElement[] {
  const region = screen.getByRole('region', { name: 'Latest releases' });
  return within(region)
    .getAllByRole('link')
    .filter((a) => a.getAttribute('href')?.startsWith('#/plugin/'));
}

async function expectNoSeriousViolations(container: HTMLElement) {
  for (const theme of ['dark', 'light']) {
    document.documentElement.dataset.theme = theme;
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  }
}

describe('HomeScreen', () => {
  it('shows stats, browse list, keyword chips, feed and footer from the index', async () => {
    const { container } = renderAt('/');

    const stats = screen.getByRole('region', { name: 'Catalog at a glance' });
    const skillTile = within(stats).getByRole('link', { name: '1 Skills' });
    expect(skillTile).toHaveAttribute('href', '#/search?kind=skill');
    expect(within(stats).getByRole('link', { name: '2 Plugins' })).toHaveAttribute('href', '#/search?kind=plugin');
    expect(within(stats).getByRole('link', { name: '1 MCP servers' })).toBeInTheDocument();

    expect(screen.getByRole('region', { name: 'Browse by kind' })).toBeInTheDocument();

    const chips = within(screen.getByRole('region', { name: 'Popular keywords' })).getAllByRole('link');
    expect(chips).toHaveLength(6);
    expect(chips[0]).toHaveAttribute('href', expect.stringContaining('#/search?kw='));

    const feed = feedLinks();
    expect(feed).toHaveLength(3);
    expect(feed[0]).toHaveTextContent('zod-helper');
    expect(feed[0]).toHaveTextContent('1.2.0');
    expect(feed[0]).toHaveTextContent('2026-10-01');
    expect(feed[0]).toHaveAttribute('href', '#/plugin/zod-helper');
    expect(screen.getByRole('link', { name: 'All releases' })).toHaveAttribute('href', '#/whats-new');

    expect(screen.getByText('3 releases')).toBeInTheDocument();
    expect(screen.getByText('built from abcdef0 · 2026-10-01')).toBeInTheDocument();

    await expectNoSeriousViolations(container);
  });

  it('limits the feed to the 4 newest releases', () => {
    const base = makeFixtureIndex();
    const extra = ['a', 'b', 'c'].map((p, i) => ({
      plugin: p,
      version: '1.0.0',
      tag: `${p}--v1.0.0`,
      date: `2026-08-0${i + 1}T10:00:00Z`,
      summary: '- old',
    }));
    renderAt('/', makeFixtureIndex({ releases: [...extra, ...base.releases] }));
    const feed = feedLinks();
    expect(feed).toHaveLength(4);
    expect(feed[0]).toHaveTextContent('zod-helper');
  });

  it('hides the mcp tile, keyword chips and author-free sections when absent', () => {
    const base = makeFixtureIndex();
    renderAt(
      '/',
      makeFixtureIndex({
        components: base.components.filter((c) => c.kind !== 'mcp'),
        stats: { ...base.stats, mcp: 0 },
        plugins: base.plugins.map((p) => ({ ...p, keywords: [] })),
      }),
    );
    const stats = screen.getByRole('region', { name: 'Catalog at a glance' });
    expect(within(stats).queryByRole('link', { name: /MCP servers/ })).not.toBeInTheDocument();
    expect(within(stats).getByRole('link', { name: '1 Commands' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Popular keywords' })).not.toBeInTheDocument();
  });

  it('navigates to the search screen as the user types in the hero', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const hero = within(screen.getByRole('main')).getByRole('searchbox', { name: 'Search the catalog' });
    await user.click(hero);
    await user.paste('zod');
    await waitFor(() => expect(window.location.hash).toBe('#/search?q=zod'));
  });

  it('shows the empty-catalog state with both links and no stats', async () => {
    const { container } = renderAt('/', makeFixtureIndex({ plugins: [], components: [], releases: [] }));
    expect(screen.getByRole('heading', { name: 'The catalog is empty' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read how to get started' })).toHaveAttribute('href', '#/getting-started');
    expect(screen.getByRole('link', { name: 'Read the contributing guide' })).toHaveAttribute(
      'href',
      'https://github.com/acme/market/blob/main/CONTRIBUTING.md',
    );
    expect(screen.queryByRole('region', { name: 'Catalog at a glance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Latest releases' })).not.toBeInTheDocument();
    await expectNoSeriousViolations(container);
  });
});

describe('HomeScreen hero search', () => {
  it('keeps typing: zod typed character by character lands in the header search with focus', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.type(within(screen.getByRole('main')).getByRole('searchbox'), 'zod');

    await waitFor(() => expect(window.location.hash).toBe('#/search?q=zod'));
    const focused = document.activeElement as HTMLInputElement;
    expect(focused.tagName).toBe('INPUT');
    expect(focused.type).toBe('search');
    expect(focused).toHaveValue('zod');
    expect(focused.selectionStart).toBe(3);
    // The hand-off flag is one-shot, so Back/Forward to this entry cannot re-focus.
    await waitFor(() => expect(window.history.state?.usr ?? null).toBeNull());
  });
});
