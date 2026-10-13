import { describe, expect, it } from 'vitest';
import { formatDate } from './format';
import { componentPath, gettingStartedPath, homePath, parseComponentRoute, pluginPath, searchPath, whatsNewPath } from './paths';

describe('paths and format', () => {
  it('builds encoded hash paths', () => {
    expect(homePath()).toBe('#/');
    expect(whatsNewPath()).toBe('#/whats-new');
    expect(gettingStartedPath()).toBe('#/getting-started');
    expect(pluginPath('a b/c')).toBe('#/plugin/a%20b%2Fc');
    expect(componentPath('skill:p/my skill')).toBe('#/component/skill/p/my%20skill');
    expect(componentPath('garbage')).toBe('#/');
    expect(searchPath()).toBe('#/search');
    expect(searchPath({ q: 'x y', kinds: ['agent'] })).toBe('#/search?q=x+y&kind=agent');
  });

  it('parses component routes', () => {
    expect(parseComponentRoute('agent', 'p', 'n')).toBe('agent:p/n');
    expect(parseComponentRoute('plugin', 'p', 'n')).toBeUndefined();
    expect(parseComponentRoute('agent', undefined, 'n')).toBeUndefined();
  });

  it('formats dates without locale', () => {
    expect(formatDate('2026-10-13T23:59:59-05:00')).toBe('2026-10-13');
    expect(formatDate('garbage')).toBe('garbage');
  });
});
