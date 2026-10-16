import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { makeFixtureIndex } from './test/fixture-index';
import { renderAt } from './test/render-app';

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('app shell', () => {
  it('starts dark, toggles, and keeps the choice across a re-render', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('button', { name: /switch to light theme/i }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('catalog-theme')).toBe('light');

    cleanup();
    renderAt('/');
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument();
  });

  it('defaults to the dark theme', () => {
    renderAt('/');
    expect(screen.getByRole('button', { name: /switch to light theme/i })).toBeInTheDocument();
  });

  it('opens the palette on Ctrl+K and gives focus back on Escape', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const search = within(screen.getAllByRole('banner')[0]!).getByRole('searchbox', { name: /search the catalog/i });
    search.focus();
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog', { name: /quick search/i })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(search).toHaveFocus();
  });

  it('navigates to the search route while typing in the header search', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.type(within(screen.getAllByRole('banner')[0]!).getByRole('searchbox', { name: /search the catalog/i }), 'zod');
    expect(window.location.hash).toBe('#/search?q=zod');
    expect(within(screen.getAllByRole('banner')[0]!).getByRole('searchbox', { name: /search the catalog/i })).toHaveValue('zod');
    expect(within(screen.getAllByRole('banner')[0]!).getByRole('searchbox', { name: /search the catalog/i })).toHaveFocus();
  });

  it('renders not found for an unknown plugin and an unknown page', () => {
    renderAt('/plugin/unknown');
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByText(/no plugin named “unknown”/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '#/');
    expect(screen.getByRole('link', { name: /search the catalog/i })).toHaveAttribute('href', '#/search');
    cleanup();

    renderAt('/nope');
    expect(screen.getByText(/that page does not exist/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go home/i })).toBeInTheDocument();
  });

  it('sets the document title for the screen', () => {
    renderAt('/getting-started');
    expect(document.title).toBe('Getting started · acme-market');
  });
});

describe('index loading', () => {
  it('fetches the index once from a relative URL, then shows the shell', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(makeFixtureIndex()) });
    vi.stubGlobal('fetch', fetchMock);
    window.location.hash = '#/';
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading the catalog/i);
    expect(await screen.findByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('./site-index.json');
  });

  it('shows an error and refetches on retry', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(makeFixtureIndex()) });
    vi.stubGlobal('fetch', fetchMock);
    window.location.hash = '#/';
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded/i);
    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats an index that fails validation as an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ nope: true }) }));
    window.location.hash = '#/';
    render(<App />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
