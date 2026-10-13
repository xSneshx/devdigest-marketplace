// The two guard plugins each ship their own hooks/lib (AC-59); the copies must stay
// byte-identical so they cannot drift.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cliMain } from './lib/check.mjs';
import { isDirectory, walk } from './lib/repo.mjs';

export const name = 'guard-parity';

const LEFT = 'plugins/code-agents/hooks/lib';
const RIGHT = 'plugins/sdd-engineering/hooks/lib';

export async function run(ctx) {
  const left = path.join(ctx.root, LEFT);
  const right = path.join(ctx.root, RIGHT);
  const [hasLeft, hasRight] = [await isDirectory(left), await isDirectory(right)];
  if (!hasLeft && !hasRight) return { errors: [], skipped: 'neither guard lib exists yet' };
  if (hasLeft !== hasRight) return [`${hasLeft ? RIGHT : LEFT} is missing; both guard plugins ship the same hooks/lib`];
  const a = (await walk(left)).files;
  const b = (await walk(right)).files;
  const errors = [];
  for (const file of a.filter((f) => !b.includes(f))) errors.push(`${RIGHT}/${file} is missing (present in code-agents)`);
  for (const file of b.filter((f) => !a.includes(f))) errors.push(`${LEFT}/${file} is missing (present in sdd-engineering)`);
  for (const file of a.filter((f) => b.includes(f))) {
    const [x, y] = await Promise.all([readFile(path.join(left, file)), readFile(path.join(right, file))]);
    if (!x.equals(y)) errors.push(`hooks/lib/${file} differs between code-agents and sdd-engineering`);
  }
  return errors;
}

await cliMain(import.meta.url, { name, run });
