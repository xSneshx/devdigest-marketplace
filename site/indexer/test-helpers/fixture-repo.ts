import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Declarative repo layout: relative file path to its text (or a JSON-serialisable value). */
export type FixtureSpec = Record<string, string | object>;

export interface FixtureRepo {
  root: string;
  cleanup: () => void;
}

export function createFixtureRepo(spec: FixtureSpec): FixtureRepo {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-fixture-'));
  for (const [rel, content] of Object.entries(spec)) {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }
  return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}
