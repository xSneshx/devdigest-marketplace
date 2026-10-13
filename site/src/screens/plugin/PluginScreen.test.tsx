import { cleanup, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { makeFixtureIndex } from '../../test/fixture-index';
import { renderAt } from '../../test/render-app';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe('PluginScreen', () => {
  it('shows header, grouped components, dependency links and changelog', () => {
    renderAt('/plugin/zod-helper');
    expect(screen.getByRole('heading', { level: 1, name: 'zod-helper' })).toBeInTheDocument();
    expect(screen.getByText('1.2.0', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('Claude Code 2+')).toBeInTheDocument();
    expect(screen.getByText('claude plugin install zod-helper@acme-market')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy install command' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/acme/market/tree/main/plugins/zod-helper',
    );
    for (const label of ['Skills (1)', 'Agents (1)', 'Commands (1)', 'Hooks (1)', 'MCP servers (1)']) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'schema' })).toHaveAttribute('href', '#/component/skill/zod-helper/schema');
    const requiredBy = screen.getByRole('region', { name: 'Required by' });
    expect(within(requiredBy).getByRole('link', { name: 'review-kit' })).toHaveAttribute('href', '#/plugin/review-kit');
    expect(screen.getByRole('heading', { name: /^1\.2\.0/ })).toHaveTextContent('2026-10-01');
  });

  it('shows dependencies with their range and unreleased changelog entries', () => {
    const base = makeFixtureIndex();
    const index = makeFixtureIndex({
      plugins: base.plugins.map((p) =>
        p.name === 'review-kit' ? { ...p, changelog: [{ version: '0.5.0', markdown: '- wip' }] } : p,
      ),
    });
    renderAt('/plugin/review-kit', index);
    const deps = screen.getByRole('region', { name: 'Dependencies' });
    expect(within(deps).getByRole('link', { name: 'zod-helper' })).toHaveAttribute('href', '#/plugin/zod-helper');
    expect(within(deps).getByText('^1.0.0')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^0\.5\.0/ })).toHaveTextContent('Unreleased');
    expect(screen.queryByText('Compatibility')).toBeNull();
  });

  it('renders an HTML description literally', () => {
    const hostile = '<script>alert(1)</script><img src=x onerror=alert(1)>';
    const base = makeFixtureIndex();
    const index = makeFixtureIndex({
      plugins: base.plugins.map((p) => (p.name === 'zod-helper' ? { ...p, description: hostile } : p)),
    });
    const { container } = renderAt('/plugin/zod-helper', index);
    expect(screen.getByText(hostile)).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows not-found for an unknown plugin', () => {
    renderAt('/plugin/unknown');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText('No plugin named “unknown”.')).toBeInTheDocument();
  });

  it.each(['dark', 'light'])('has no serious axe violations in the %s theme', async (theme) => {
    document.documentElement.dataset.theme = theme;
    const { container } = renderAt('/plugin/zod-helper');
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
});
