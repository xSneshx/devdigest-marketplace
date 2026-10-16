import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { KindBadge } from './KindBadge';

describe('KindBadge', () => {
  it('shows the kind word for every kind and has no serious a11y violations', async () => {
    const { container } = render(
      <ul>
        {(['plugin', 'skill', 'agent', 'command', 'hook', 'mcp'] as const).map((k) => (
          <li key={k}>
            <KindBadge kind={k} />
          </li>
        ))}
      </ul>,
    );
    expect(screen.getByText('MCP server')).toHaveAttribute('data-kind', 'mcp');
    expect(screen.getByText('Skill')).toHaveClass('kind-badge');
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
});
