// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { IndexError } from './errors';
import { parseFrontmatter, parseToolList } from './frontmatter';

describe('parseFrontmatter', () => {
  it('splits data from body and reads folded descriptions in full', () => {
    const text = '---\nname: demo\ndescription: >\n  first line\n  second line\n---\n# Title\n\nBody text\n';
    const { data, body } = parseFrontmatter(text, 'a.md');
    expect(data.name).toBe('demo');
    expect(String(data.description)).toContain('first line second line');
    expect(body).toBe('# Title\n\nBody text\n');
  });

  it('treats a file without an opening fence as body only', () => {
    expect(parseFrontmatter('# Just text\n', 'a.md')).toEqual({ data: {}, body: '# Just text\n' });
  });

  it('names the file on a missing terminator and on invalid YAML', () => {
    expect(() => parseFrontmatter('---\nname: x\n', 'plugins/p/a.md')).toThrow(IndexError);
    expect(() => parseFrontmatter('---\nname: x\n', 'plugins/p/a.md')).toThrow(/plugins\/p\/a\.md/);
    expect(() => parseFrontmatter('---\nname: [unclosed\n---\nbody', 'plugins/p/b.md')).toThrow(/plugins\/p\/b\.md/);
  });
});

describe('parseToolList', () => {
  it('keeps parenthesised items whole for strings and lists', () => {
    const csv = 'Read, Glob, Agent(research-tools:researcher, Explore), Bash';
    expect(parseToolList(csv)).toEqual(['Read', 'Glob', 'Agent(research-tools:researcher, Explore)', 'Bash']);
    expect(parseToolList(['Read', ' Bash '])).toEqual(['Read', 'Bash']);
    expect(parseToolList(undefined)).toEqual([]);
  });
});
