/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEXT_ATTRS = new Set(['aria-label', 'aria-description', 'title', 'placeholder', 'alt', 'label']);
const HAS_LETTER = /\p{L}/u;

function listTsx(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listTsx(full));
    else if (name.endsWith('.tsx') && !/\.test\.tsx$/.test(name)) out.push(full);
  }
  return out;
}

export function findLiterals(source: string, file: string): string[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const report = (node: ts.Node, what: string) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    found.push(`${file}:${line + 1} ${what}`);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node) && HAS_LETTER.test(node.text)) {
      report(node, `JSX text "${node.text.trim()}"`);
    }
    if (ts.isJsxAttribute(node) && TEXT_ATTRS.has(node.name.getText(sf)) && node.initializer) {
      const init = node.initializer;
      const lit = ts.isJsxExpression(init) ? init.expression : init;
      if (lit && (ts.isStringLiteral(lit) || ts.isNoSubstitutionTemplateLiteral(lit))) {
        report(lit, `attribute ${node.name.getText(sf)}="${lit.text}"`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

describe('no literal UI strings in components', () => {
  it('finds none under src/**/*.tsx', () => {
    const files = listTsx(SRC);
    const problems = files.flatMap((f) => findLiterals(readFileSync(f, 'utf8'), path.relative(SRC, f)));
    expect(problems).toEqual([]);
  });

  it('detects a probe with literal text and attributes', () => {
    const probe = [
      'export const X = () => (',
      '  <div>',
      '    <button aria-label="Close" />',
      '    <p>Hello there</p>',
      '    <input placeholder={"Find"} title={`Tip`} />',
      '  </div>',
      ');',
    ].join('\n');
    const hits = findLiterals(probe, 'probe.tsx');
    expect(hits).toHaveLength(4);
    expect(hits[0]).toMatch(/^probe\.tsx:3 /);
  });
});
