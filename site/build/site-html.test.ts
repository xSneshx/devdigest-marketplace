// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CSP, escapeHtml, renderSiteHtml } from './site-html';

const HTML = `<head>
    <meta charset="UTF-8" />
    <title><!--site:title--></title>
  </head><body><!--site:noscript--></body>`;
const INPUT = {
  marketplaceName: 'Tom & <Jerry> "m"',
  repoUrl: 'https://github.com/o/r?a=1&b="2"',
  noscript: 'Needs <JS>',
  noscriptLink: 'Browse',
};

describe('site html transform', () => {
  it('escapes values, injects the CSP only in build mode', () => {
    const build = renderSiteHtml(HTML, INPUT, true);
    expect(build).toContain('<title>Tom &amp; &lt;Jerry&gt; &quot;m&quot;</title>');
    expect(build).toContain('<noscript><p>Needs &lt;JS&gt;</p><a href="https://github.com/o/r?a=1&amp;b=&quot;2&quot;">Browse</a></noscript>');
    expect(build).toContain(`http-equiv="Content-Security-Policy" content="${CSP}"`);
    expect(CSP).not.toContain('frame-ancestors');
    expect(build).not.toContain('<!--site:');

    const serve = renderSiteHtml(HTML, INPUT, false);
    expect(serve).not.toContain('Content-Security-Policy');
    expect(serve).toContain('<noscript>');
  });

  it('escapes the five HTML metacharacters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});
