import { parse } from 'yaml';
import { IndexError } from './errors';

export interface Frontmatter {
  data: Record<string, unknown>;
  body: string;
}

const BOM = String.fromCharCode(0xfeff);
const OPEN =/^---[ \t]*\r?\n/;
const CLOSE = /^---[ \t]*$/m;

/** Splits `---` frontmatter from the Markdown body. A file without an opening fence has no frontmatter. */
export function parseFrontmatter(text: string, file: string): Frontmatter {
  const source = text.startsWith(BOM) ? text.slice(1) : text;
  const open = OPEN.exec(source);
  if (!open) return { data: {}, body: source };

  const rest = source.slice(open[0].length);
  const close = CLOSE.exec(rest);
  if (!close) throw new IndexError(file, 'frontmatter is missing its closing --- line');

  const raw = rest.slice(0, close.index);
  const body = rest.slice(close.index + close[0].length).replace(/^\r?\n/, '');

  let data: unknown;
  try {
    data = parse(raw);
  } catch (err) {
    const reason = err instanceof Error ? err.message.split('\n')[0] : 'invalid YAML';
    throw new IndexError(file, `frontmatter cannot be parsed: ${reason}`);
  }
  if (data === null || data === undefined) return { data: {}, body };
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new IndexError(file, 'frontmatter must be a YAML mapping');
  }
  return { data: data as Record<string, unknown>, body };
}

/** Accepts a YAML list or a comma string; splits only at parenthesis depth 0. */
export function parseToolList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
  }
  if (typeof value !== 'string') return [];

  const items: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      items.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  items.push(current);
  return items.map((v) => v.trim()).filter((v) => v.length > 0);
}

export function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

export function asBool(value: unknown): boolean {
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true');
}
