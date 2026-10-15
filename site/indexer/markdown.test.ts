// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { compatibilityRow, splitChangelog } from './markdown';

describe('splitChangelog', () => {
  it('splits version sections and keeps nested headings inside them', () => {
    const md = '# Changelog\n\n## [1.1.0] - 2026-01-01\n\n### Added\n- one\n\n## v1.0.0\n- Initial release.\n';
    const sections = splitChangelog(md);
    expect(sections.map((s) => s.version)).toEqual(['1.1.0', '1.0.0']);
    expect(sections[0]?.markdown).toContain('### Added');
    expect(sections[1]?.markdown).toBe('- Initial release.');
  });
});

describe('compatibilityRow', () => {
  it('returns the second cell of the matching row or undefined', () => {
    const md = '| Requirement | Version | Notes |\n|---|---|---|\n| Claude Code | >= 2.1.269 | note |\n| Node.js | >= 22 | x |\n';
    expect(compatibilityRow(md, 'Claude Code')).toBe('>= 2.1.269');
    expect(compatibilityRow(md, 'Python')).toBeUndefined();
  });
});
