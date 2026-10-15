import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnnouncerProvider } from '../announcer';
import { CopyButton } from './CopyButton';

const CMD = 'claude plugin install demo@market';

function Harness() {
  const ref = useRef<HTMLElement>(null);
  return (
    <AnnouncerProvider>
      <code ref={ref}>{CMD}</code>
      <CopyButton text={CMD} targetRef={ref} />
    </AnnouncerProvider>
  );
}

const noSeriousViolations = async (container: HTMLElement) => {
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CopyButton', () => {
  it('copies, announces, and reverts the label after 2 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(CMD);
    expect(screen.getAllByRole('status').some((s) => s.textContent === `Copied: ${CMD}`)).toBe(true);
    expect(await noSeriousViolations(container)).toEqual([]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('selects the command and shows a manual hint when the clipboard is unavailable', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    const { container } = render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    const hints = await screen.findAllByRole('status');
    expect(hints.some((h) => h.textContent?.startsWith('Copying is not available'))).toBe(true);
    expect(window.getSelection()?.toString()).toBe(CMD);
    expect(await noSeriousViolations(container)).toEqual([]);
  });
});
