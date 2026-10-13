// Minimal frontmatter reader. There is no YAML library on purpose (zero dependencies), so this
// reads only: top-level `key: value`, inline lists, block lists and indented continuation lines.
// It fails on what it cannot parse instead of guessing: an invalid description silently
// truncates a skill, so the CI check must be stricter than the loader.

function unquote(raw, errors, key) {
  const value = raw.trim();
  if (value.startsWith('"')) {
    let i = 1;
    while (i < value.length && value[i] !== '"') i += value[i] === '\\' ? 2 : 1;
    if (i >= value.length) {
      errors.push(`${key}: unterminated double-quoted value`);
      return value;
    }
    const rest = value.slice(i + 1).trim();
    if (rest !== '' && !rest.startsWith('#')) {
      errors.push(`${key}: unescaped double quote inside a double-quoted value (use single quotes inside)`);
    }
    return value.slice(1, i);
  }
  if (value.startsWith("'")) {
    let i = 1;
    while (i < value.length) {
      if (value[i] === "'" && value[i + 1] === "'") i += 2;
      else if (value[i] === "'") break;
      else i += 1;
    }
    if (i >= value.length) {
      errors.push(`${key}: unterminated single-quoted value`);
      return value;
    }
    const rest = value.slice(i + 1).trim();
    if (rest !== '' && !rest.startsWith('#')) errors.push(`${key}: text after a single-quoted value`);
    return value.slice(1, i).replace(/''/g, "'");
  }
  if (/:(\s|$)/.test(value) && !/^[|>]/.test(value)) {
    errors.push(`${key}: plain value contains ": " (quote the value)`);
  }
  return value.replace(/\s+#.*$/, '');
}

function splitInline(inner, errors, key) {
  return inner
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')
    .map((item) => unquote(item, errors, key));
}

/**
 * @returns {{ present: boolean, data: Record<string, string | string[]>, errors: string[] }}
 */
export function parseFrontmatter(text) {
  const normalized = text.replace(/^﻿/, '');
  if (!/^---[ \t]*\r?\n/.test(normalized)) return { present: false, data: {}, errors: [] };
  const lines = normalized.split(/\r?\n/);
  const end = lines.findIndex((line, i) => i > 0 && /^---[ \t]*$/.test(line));
  if (end === -1) return { present: true, data: {}, errors: ['frontmatter is not terminated by "---"'] };

  const errors = [];
  const data = {};
  let current = null;
  for (const line of lines.slice(1, end)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const indented = /^\s/.test(line);
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (!indented && !item) {
      const m = /^([A-Za-z_][\w-]*):(?:\s+(.*))?$/.exec(line);
      if (!m) {
        errors.push(`cannot parse frontmatter line: ${line.trim().slice(0, 60)}`);
        current = null;
        continue;
      }
      const [, key, rawValue = ''] = m;
      current = key;
      const trimmed = rawValue.trim();
      if (trimmed === '') data[key] = '';
      else if (trimmed.startsWith('[') && trimmed.endsWith(']')) data[key] = splitInline(trimmed.slice(1, -1), errors, key);
      else data[key] = unquote(trimmed, errors, key);
    } else if (item && current !== null) {
      if (!Array.isArray(data[current])) data[current] = data[current] === '' ? [] : [data[current]];
      data[current].push(unquote(item[1], errors, current));
    }
    // other indented lines are continuations or nested maps: the key itself is already recorded
  }
  return { present: true, data, errors };
}

export function asList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  return value.split(',').map((s) => s.trim()).filter((s) => s !== '');
}
