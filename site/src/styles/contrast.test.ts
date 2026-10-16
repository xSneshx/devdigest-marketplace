import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Theme = 'dark' | 'light';
type Tokens = Record<string, string>;

const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

function parseBlock(selectorPattern: RegExp): Tokens {
  const match = selectorPattern.exec(css);
  if (!match) throw new Error(`tokens.css: block not found for ${selectorPattern}`);
  const tokens: Tokens = {};
  for (const [, name, value] of match[1]!.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    tokens[name!] = value!.trim();
  }
  return tokens;
}

const THEMES: Record<Theme, Tokens> = {
  dark: parseBlock(/:root,\s*:root\[data-theme='dark'\]\s*\{([^}]*)\}/),
  light: parseBlock(/:root\[data-theme='light'\]\s*\{([^}]*)\}/),
};

type Rgb = [number, number, number];

function parseHex(value: string): { rgb: Rgb; alpha: number } {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(value);
  if (!m) throw new Error(`not a hex colour: ${value}`);
  const n = parseInt(m[1]!, 16);
  return {
    rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255],
    alpha: m[2] ? parseInt(m[2], 16) / 255 : 1,
  };
}

function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function composite(fg: string, bg: string): Rgb {
  const f = parseHex(fg);
  const b = parseHex(bg);
  return f.rgb.map((c, i) => c * f.alpha + b.rgb[i]! * (1 - f.alpha)) as Rgb;
}

function ratio(fg: string, bg: string): number {
  const a = luminance(composite(fg, bg));
  const b = luminance(parseHex(bg).rgb);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const SURFACES = ['bg', 'bg-elev', 'bg-elev2', 'bg-hover'] as const;
const KINDS = ['plugin', 'skill', 'agent', 'command', 'hook', 'mcp'] as const;

// [foreground token, background token, minimum ratio]
const PAIRS: ReadonlyArray<readonly [string, string, number]> = [
  ...(['text', 'text-dim', 'text-faint'] as const).flatMap((fg) =>
    SURFACES.map((bg) => [fg, bg, 4.5] as const),
  ),
  ['accent', 'bg', 4.5],
  ['accent', 'bg-elev', 4.5],
  ['accent-fg', 'accent', 4.5],
  ...KINDS.map((k) => [`kind-${k}`, 'bg-elev', 4.5] as const),
  ['border-strong', 'bg', 3],
];

describe('design token contrast', () => {
  it('uses hex only, no oklch()', () => {
    expect(css).not.toMatch(/oklch\(/);
  });

  for (const theme of ['dark', 'light'] as const) {
    it(`${theme}: every token pair meets its WCAG threshold`, () => {
      const t = THEMES[theme];
      const failures: string[] = [];
      for (const [fg, bg, min] of PAIRS) {
        const fgValue = t[fg];
        const bgValue = t[bg];
        if (!fgValue || !bgValue) {
          failures.push(`${fg} / ${bg}: token missing`);
          continue;
        }
        const r = ratio(fgValue, bgValue);
        if (r < min) failures.push(`${fg} on ${bg}: ${r.toFixed(2)} < ${min}`);
      }
      expect(failures).toEqual([]);
    });
  }
});
