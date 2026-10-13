// Serves dist/ under a sub-path and checks the built site end to end. Node only, no dependency.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SUB = '/catalog-subpath/';
const PORT = Number(process.env.SMOKE_PORT ?? 4173);
const dist = resolve(fileURLToPath(new URL('..', import.meta.url)), 'dist');
const serve = process.argv.includes('--serve');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith(SUB)) {
      res.writeHead(404).end('not found');
      return;
    }
    const rel = decodeURIComponent(url.pathname.slice(SUB.length)) || 'index.html';
    const file = normalize(join(dist, rel));
    if (file !== dist && !file.startsWith(dist + sep)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const info = await stat(file);
    const target = info.isDirectory() ? join(file, 'index.html') : file;
    const body = await readFile(target);
    res.writeHead(200, { 'content-type': TYPES[extname(target)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

function fail(message) {
  console.error(`smoke: FAIL ${message}`);
  server.close();
  process.exit(1);
}

const base = `http://127.0.0.1:${PORT}`;

async function get(path) {
  const res = await fetch(`${base}${path}`);
  return { status: res.status, text: await res.text() };
}

async function check() {
  const home = await get(SUB);
  if (home.status !== 200) fail(`${SUB} returned ${home.status}`);
  const html = home.text;
  if (!/<meta[^>]+http-equiv="Content-Security-Policy"/i.test(html)) fail('CSP meta missing');
  if (!/<noscript>/i.test(html)) fail('<noscript> missing');

  // Loaded resources only: <a href> in the noscript fallback may legitimately point at the repository.
  const refs = [...html.matchAll(/<(?!a\b)[a-z][^>]*?\b(?:src|href)="([^"]+)"/gi)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith('//')) fail(`external reference in HTML: ${ref}`);
  }
  const assets = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  const css = [];
  for (const ref of assets) {
    const path = SUB + ref.replace(/^\.\//, '');
    const res = await get(path);
    if (res.status !== 200) fail(`${ref} returned ${res.status}`);
    if (ref.endsWith('.css')) css.push({ ref, text: res.text });
  }

  for (const { ref, text } of css) {
    for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      const target = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith('data:')) fail(`${ref} references ${target}`);
      if (target.startsWith('//')) fail(`${ref} references ${target}`);
    }
  }

  const idx = await get(`${SUB}site-index.json`);
  if (idx.status !== 200) fail(`site-index.json returned ${idx.status}`);
  let index;
  try {
    index = JSON.parse(idx.text);
  } catch {
    fail('site-index.json is not valid JSON');
  }
  if (!Array.isArray(index.plugins) || index.plugins.length !== index.stats?.plugins) {
    fail('plugins.length does not equal stats.plugins');
  }
  console.log('smoke: ok');
}

server.on('error', (err) => fail(`server error: ${err.message}`));
server.listen(PORT, '127.0.0.1', async () => {
  if (serve) {
    console.log(`smoke: serving ${base}${SUB} (Ctrl+C to stop)`);
    await check();
    return;
  }
  try {
    await check();
  } catch (err) {
    fail(String(err));
  }
  server.close();
});
