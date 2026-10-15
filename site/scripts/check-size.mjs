import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 1_000_000;
const SKIP = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.avif']);
const dist = resolve(fileURLToPath(new URL('..', import.meta.url)), 'dist');

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

let rows;
try {
  rows = [...walk(dist)]
    .filter((f) => !SKIP.has(extname(f).toLowerCase()))
    .map((f) => ({ file: relative(dist, f), bytes: gzipSync(readFileSync(f), { level: 9 }).length }))
    .sort((a, b) => b.bytes - a.bytes);
} catch {
  console.error(`size: cannot read ${dist}; run "npm run build" first`);
  process.exit(1);
}

const total = rows.reduce((n, r) => n + r.bytes, 0);
for (const r of rows) console.log(`${String(r.bytes).padStart(9)}  ${r.file}`);
console.log(`${String(total).padStart(9)}  TOTAL gzip (budget ${BUDGET_BYTES}; images skipped)`);
if (total > BUDGET_BYTES) {
  console.error('size: budget exceeded');
  process.exit(1);
}
