import { describe, expect, it } from 'vitest';
import { kindLabel, t, tPlural } from './t';

describe('t', () => {
  it('interpolates params and leaves unknown placeholders alone', () => {
    expect(t('card.openLabel', { name: 'alpha' })).toBe('Open alpha');
    expect(t('app.documentTitle', { screen: 'Home', name: 'x' })).toBe('Home · x');
    expect(t('card.openLabel')).toBe('Open {name}');
  });

  it('resolves plural forms and kind labels', () => {
    expect(tPlural('search.resultCount', 1)).toBe('1 result');
    expect(tPlural('search.resultCount', 0)).toBe('0 results');
    expect(tPlural('home.footerReleases', 5)).toBe('5 releases');
    expect(kindLabel('mcp')).toBe('MCP server');
    expect(kindLabel('skill', true)).toBe('Skills');
  });
});
