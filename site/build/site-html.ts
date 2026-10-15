import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

// No frame-ancestors: it is ignored in a <meta> CSP.
export const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface SiteHtmlInput {
  marketplaceName: string;
  repoUrl: string;
  noscript: string;
  noscriptLink: string;
}

export function renderSiteHtml(html: string, input: SiteHtmlInput, withCsp: boolean): string {
  const noscript = `<noscript><p>${escapeHtml(input.noscript)}</p><a href="${escapeHtml(input.repoUrl)}">${escapeHtml(input.noscriptLink)}</a></noscript>`;
  const csp = withCsp
    ? `<meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    `
    : '';
  // Function replacers: the values are data, never `$&`-style patterns.
  return html
    .replace('<!--site:title-->', () => escapeHtml(input.marketplaceName))
    .replace('<!--site:noscript-->', () => noscript)
    .replace('<meta charset="UTF-8" />', (m) => `${m}\n    ${csp.trimEnd()}`.trimEnd());
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function str(value: unknown, what: string): string {
  if (typeof value !== 'string' || value === '') throw new Error(`site-html: missing ${what}`);
  return value;
}

export function siteHtml(): Plugin {
  let root = process.cwd();
  let isBuild = false;
  return {
    name: 'site-html',
    configResolved(config) {
      root = config.root;
      isBuild = config.command === 'build';
    },
    transformIndexHtml(html) {
      const indexPath = resolve(root, 'public/site-index.json');
      let index: { meta?: { marketplaceName?: unknown; repo?: { url?: unknown } } };
      try {
        index = readJson(indexPath) as typeof index;
      } catch (cause) {
        throw new Error(`site-html: cannot read ${indexPath}; run "npm run index" first`, { cause });
      }
      const en = readJson(resolve(root, 'src/i18n/en.json')) as { app?: Record<string, unknown> };
      return renderSiteHtml(
        html,
        {
          marketplaceName: str(index.meta?.marketplaceName, 'meta.marketplaceName'),
          repoUrl: str(index.meta?.repo?.url, 'meta.repo.url'),
          noscript: str(en.app?.noscript, 'app.noscript'),
          noscriptLink: str(en.app?.noscriptLink, 'app.noscriptLink'),
        },
        isBuild,
      );
    },
  };
}
