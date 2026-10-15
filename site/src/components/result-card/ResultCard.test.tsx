import { cleanup, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { toSearchEntries } from '../../lib/search';
import { makeFixtureIndex } from '../../test/fixture-index';
import { ResultCard } from './ResultCard';

afterEach(cleanup);

describe('ResultCard', () => {
  it('renders a plugin entry with at most 3 keywords, an open link and the install command', async () => {
    const index = makeFixtureIndex();
    const entry = toSearchEntries(index).find((e) => e.id === 'zod-helper')!;
    const { container } = render(<ResultCard entry={entry} marketplace="acme-market" />);

    expect(screen.getByRole('heading', { name: 'zod-helper' })).toBeInTheDocument();
    expect(screen.getByText('v1.2.0')).toBeInTheDocument();
    expect(screen.getByText('validation')).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByText('extra')).toBeNull();
    expect(screen.getByText('claude plugin install zod-helper@acme-market')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open zod-helper' })).toHaveAttribute('href', '#/plugin/zod-helper');
    expect(screen.getByRole('button', { name: 'Copy install command' })).toBeInTheDocument();

    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });

  it('renders hostile description text literally and links a component to its page', () => {
    const hostile = '<script>alert(1)</script><img src=x onerror=alert(1)>';
    const index = makeFixtureIndex();
    const entry = { ...toSearchEntries(index).find((e) => e.id === 'skill:zod-helper/schema')!, description: hostile };
    const { container } = render(<ResultCard entry={entry} marketplace="acme-market" />);

    expect(screen.getByText(hostile)).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('link', { name: 'Open schema' })).toHaveAttribute(
      'href',
      '#/component/skill/zod-helper/schema',
    );
  });
});
