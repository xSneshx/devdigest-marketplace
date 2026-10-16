import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { makeFixtureIndex } from '../../test/fixture-index';
import { renderAt } from '../../test/render-app';

afterEach(cleanup);

const names = () => screen.getAllByRole('article').map((a) => within(a).getByRole('heading', { level: 3 }).textContent);

describe('SearchScreen', () => {
  it('lists everything, filters, shows no-results and recovers via clear', async () => {
    const user = userEvent.setup();
    renderAt('/search');
    expect(await screen.findByRole('heading', { level: 1, name: 'Catalog' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(7);
    expect(screen.getByText('7 results')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Skills' }));
    expect(names()).toEqual(['schema']);
    await user.click(screen.getByRole('checkbox', { name: 'Plugins' }));
    expect(names().sort()).toEqual(['review-kit', 'schema', 'zod-helper']);
    await user.click(screen.getByRole('checkbox', { name: 'review' }));
    expect(names()).toEqual(['review-kit']);
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.getAllByRole('article')).toHaveLength(7);

    await user.selectOptions(screen.getByLabelText('Author'), 'Grace');
    expect(names()).toEqual(['review-kit']);
    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    await user.selectOptions(screen.getByLabelText('Sort by'), 'name');
    expect(names()[0]).toBe('checker');
    await user.selectOptions(screen.getByLabelText('Sort by'), 'updated');
    expect(names().at(-1)).toBe('review-kit');
  });

  it('reorders the rendered list through each sort option and mirrors it in the URL', async () => {
    const user = userEvent.setup();
    renderAt('/search');
    await screen.findByRole('heading', { level: 1 });
    const sort = screen.getByLabelText('Sort by');
    expect(sort).toHaveValue('relevance');
    const relevance = names();

    await user.selectOptions(sort, 'name');
    const byName = names();
    expect(byName).toEqual([...byName].sort((a, b) => a!.localeCompare(b!, 'en')));
    expect(window.location.hash).toContain('sort=name');

    await user.selectOptions(sort, 'updated');
    const byUpdated = names();
    expect(byUpdated).not.toEqual(byName);
    expect(byUpdated.at(-1)).toBe('review-kit');
    expect(byName.at(-1)).not.toBe('review-kit');
    expect(window.location.hash).toContain('sort=updated');

    await user.selectOptions(sort, 'relevance');
    expect(names()).toEqual(relevance);
    expect(window.location.hash).not.toContain('sort=');
  });

  it('shows no-results for zzzz and restores the list; restores state from the URL', async () => {
    const user = userEvent.setup();
    renderAt('/search?q=zzzz');
    expect(await screen.findByText('Nothing matches')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByRole('article')).toHaveLength(7);
    cleanup();

    renderAt('/search?q=zod&kind=skill');
    expect(await screen.findByRole('heading', { level: 1, name: /zod/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Skills' })).toBeChecked();
    expect(names()).toEqual(['schema']);
  });

  it('hides the author filter with one author and is axe-clean in both themes', async () => {
    const base = makeFixtureIndex();
    const one = makeFixtureIndex({ plugins: base.plugins.map((p) => ({ ...p, author: 'Ada' })) });
    const { container } = renderAt('/search', one);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByLabelText('Author')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: 'MCP servers' })).not.toBeNull();

    for (const theme of ['dark', 'light']) {
      document.documentElement.dataset['theme'] = theme;
      const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
      expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
    }
  });
});
