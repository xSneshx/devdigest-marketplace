import { cleanup, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { makeFixtureIndex } from '../../test/fixture-index';
import { renderAt } from '../../test/render-app';

afterEach(cleanup);

describe('WhatsNewScreen', () => {
  it('lists releases newest first with plugin links, evidence links and a subject-only summary', async () => {
    const index = makeFixtureIndex();
    index.releases[1] = { ...index.releases[1]!, summary: 'Tag subject only' };
    const { container } = renderAt('/whats-new', index);

    const feed = (await screen.findAllByRole('list'))[0]!;
    const items = Array.from(feed.children) as HTMLElement[];
    expect(items).toHaveLength(3);
    expect(within(items[0]!).getByRole('link', { name: 'zod-helper' })).toHaveAttribute('href', '#/plugin/zod-helper');
    expect(within(items[0]!).getByText('v1.2.0')).toBeInTheDocument();
    expect(within(items[0]!).getByText('2026-10-01')).toBeInTheDocument();
    expect(within(items[0]!).getByRole('link', { name: 'Evidence' })).toHaveAttribute(
      'href',
      'https://github.com/acme/market/releases/tag/zod-helper--v1.2.0',
    );
    expect(within(items[1]!).getByText('Tag subject only')).toBeInTheDocument();
    expect(within(items[1]!).queryByRole('link', { name: 'Evidence' })).toBeNull();
    expect(within(items[2]!).getByText('v1.0.0')).toBeInTheDocument();

    for (const theme of ['dark', 'light']) {
      document.documentElement.dataset.theme = theme;
      const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    }
  });

  it('shows an empty state without releases', async () => {
    renderAt('/whats-new', makeFixtureIndex({ releases: [] }));
    expect(await screen.findByText('No releases have been tagged yet.')).toBeInTheDocument();
    expect(screen.queryByText('v1.2.0')).toBeNull();
  });
});
