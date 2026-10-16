import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toSearchEntries, type SearchEntry } from '../../lib/search';
import { makeFixtureIndex } from '../../test/fixture-index';
import { CommandPalette } from './CommandPalette';

afterEach(cleanup);

const entries = toSearchEntries(makeFixtureIndex());

function Harness({ onOpen }: { onOpen: (e: SearchEntry) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        launch
      </button>
      <CommandPalette open={open} entries={entries} onClose={() => setOpen(false)} onOpen={onOpen} />
    </>
  );
}

describe('CommandPalette', () => {
  it('filters, navigates with the keyboard, opens a result, traps Tab and returns focus', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    const launcher = screen.getByRole('button', { name: 'launch' });

    await user.click(launcher);
    const dialog = screen.getByRole('dialog', { name: 'Quick search' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const input = screen.getByRole('combobox', { name: 'Search plugins and components' });
    expect(input).toHaveFocus();

    const results = await axe.run(dialog, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);

    await user.type(input, 'zod');
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(1);
    expect(options.length).toBeLessThanOrEqual(8);
    expect(input).toHaveAttribute('aria-activedescendant', options[0]!.id);
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[1]!.id);
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(input).toHaveAttribute('aria-activedescendant', options[options.length - 1]!.id);

    await user.tab();
    expect(input).toHaveFocus();
    await user.tab({ shift: true });
    expect(input).toHaveFocus();

    await user.clear(input);
    await user.type(input, 'review-kit');
    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'review-kit' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(launcher).toHaveFocus();

    await user.click(launcher);
    expect(screen.getByRole('combobox')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(launcher).toHaveFocus();

    await user.click(launcher);
    await user.type(screen.getByRole('combobox'), 'qqqq-none');
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });
});
