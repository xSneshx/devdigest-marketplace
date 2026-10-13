import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { AnnouncerProvider, useAnnounce } from './Announcer';

function Trigger() {
  const announce = useAnnounce();
  return (
    <button type="button" onClick={() => announce('Saved it')}>
      go
    </button>
  );
}

describe('Announcer', () => {
  it('puts announcements in one polite live region and has no serious a11y violations', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AnnouncerProvider>
        <Trigger />
      </AnnouncerProvider>,
    );
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('');
    await user.click(screen.getByRole('button', { name: 'go' }));
    expect(region).toHaveTextContent('Saved it');

    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
});
