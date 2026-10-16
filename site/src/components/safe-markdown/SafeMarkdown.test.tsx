import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SafeMarkdown } from './SafeMarkdown';

const REPO = 'https://github.com/o/r';
const src = (filePath: string) => ({ repoUrl: REPO, branch: 'main', filePath });
const GUIDE = 'https://github.com/o/r/blob/main/docs/PLUGIN-GUIDELINES.md';

describe('SafeMarkdown', () => {
  it('keeps raw HTML as text and drops dangerous schemes', () => {
    const md = [
      '<script>alert(1)</script>',
      '',
      '<img src=x onerror=alert(1)>',
      '',
      '[a](javascript:alert(1)) [b](data:text/html,x) [c](vbscript:x)',
    ].join('\n');
    const { container } = render(<SafeMarkdown markdown={md} source={src('README.md')} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
    expect(container.querySelectorAll('a[href]')).toHaveLength(0);
    expect(container.textContent).toContain('a b c');
  });

  it('rewrites relative links to the repository file view', () => {
    render(
      <>
        <SafeMarkdown markdown="[root](docs/PLUGIN-GUIDELINES.md)" source={src('README.md')} />
        <SafeMarkdown markdown="[nested](../../docs/PLUGIN-GUIDELINES.md)" source={src('plugins/x/README.md')} />
        <SafeMarkdown markdown="[up](../../../../x.md) [frag](#usage)" source={src('plugins/x/README.md')} />
      </>,
    );
    expect(screen.getByRole('link', { name: 'root' })).toHaveAttribute('href', GUIDE);
    expect(screen.getByRole('link', { name: 'nested' })).toHaveAttribute('href', GUIDE);
    expect(screen.queryByRole('link', { name: 'up' })).toBeNull();
    expect(screen.getByRole('link', { name: 'frag' })).toHaveAttribute(
      'href',
      `${REPO}/blob/main/plugins/x/README.md#usage`,
    );
  });

  it('opens external links safely and turns images into links', () => {
    const { container } = render(
      <SafeMarkdown markdown={'[ext](https://example.com) ![alt text](x.png)'} source={src('README.md')} />,
    );
    const ext = screen.getByRole('link', { name: 'ext' });
    expect(ext).toHaveAttribute('rel', 'noopener noreferrer');
    expect(ext).toHaveAttribute('target', '_blank');
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('link', { name: 'alt text' })).toHaveAttribute('href', `${REPO}/blob/main/x.png`);
  });

  it('renders GFM tables in a scroll region, mermaid as code, and shifts headings', () => {
    const md = ['# Title', '', '| Name | Kind |', '| --- | --- |', '| a | b |', '', '```mermaid', 'graph TD', '```'].join('\n');
    const { container } = render(<SafeMarkdown markdown={md} source={src('README.md')} headingOffset={1} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Name' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(container.querySelector('pre code')?.textContent).toContain('graph TD');
  });

  it('renders inline mode without a paragraph wrapper', () => {
    const { container } = render(<SafeMarkdown markdown="Hello **bold**" source={src('README.md')} inline />);
    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('bold');
  });
});
