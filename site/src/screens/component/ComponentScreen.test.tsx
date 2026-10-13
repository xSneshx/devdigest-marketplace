import { cleanup, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { SiteIndex } from '../../contract/site-index';
import { makeFixtureIndex } from '../../test/fixture-index';
import { renderAt } from '../../test/render-app';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

const serious = async (container: HTMLElement) => {
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
};

function indexWith(): SiteIndex {
  const base = makeFixtureIndex();
  return makeFixtureIndex({
    components: [
      ...base.components.map((c) =>
        c.id === 'agent:zod-helper/checker'
          ? { ...c, tools: ['Read', 'Agent(x:y, Explore)'], disallowedTools: ['Bash'], body: '# Checker\n\nDocs.' }
          : c.id === 'command:zod-helper/gen'
            ? { ...c, manualOnly: true }
            : c,
      ),
    ],
  });
}

describe('ComponentScreen', () => {
  it('shows agent fields, breadcrumb and install command', async () => {
    const { container } = renderAt('/component/agent/zod-helper/checker', indexWith());

    expect(await screen.findByRole('heading', { level: 1, name: 'checker' })).toBeInTheDocument();
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'zod-helper' })).toHaveAttribute('href', '#/plugin/zod-helper');
    expect(screen.getByText('Agent(x:y, Explore)')).toBeInTheDocument();
    expect(screen.getByText('Bash')).toBeInTheDocument();
    expect(screen.getByText('sonnet')).toBeInTheDocument();
    expect(screen.getByText('zod-helper:checker')).toBeInTheDocument();
    expect(screen.getByText('claude plugin install zod-helper@acme-market')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View source' })).toHaveAttribute(
      'href',
      'https://github.com/acme/market/blob/main/plugins/zod-helper/agents/checker.md',
    );
    expect(await serious(container)).toEqual([]);

    document.documentElement.dataset.theme = 'dark';
    expect(await serious(container)).toEqual([]);
  });

  it('labels a manual-only command with its slash invocation', async () => {
    renderAt('/component/command/zod-helper/gen', indexWith());
    expect(await screen.findByText('/zod-helper:gen')).toBeInTheDocument();
    expect(screen.getByText('Manual only')).toBeInTheDocument();
    expect(screen.getByText('<type>')).toBeInTheDocument();
  });

  it('shows hook event, matcher and timeout without an invocation', async () => {
    renderAt('/component/hook/zod-helper/lint');
    expect(await screen.findByRole('heading', { level: 1, name: 'lint' })).toBeInTheDocument();
    expect(screen.getByText('PostToolUse')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('10 s')).toBeInTheDocument();
    expect(screen.queryByText('Invocation')).not.toBeInTheDocument();
  });

  it('shows not-found for an unknown component', async () => {
    renderAt('/component/skill/zod-helper/nope');
    expect(await screen.findByText('That component does not exist.')).toBeInTheDocument();
  });
});
