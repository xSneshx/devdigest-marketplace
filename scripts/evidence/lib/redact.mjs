// Redaction for everything the evidence scripts print: the home directory becomes `~`, token-shaped
// strings are masked, and `env` blocks are dropped. The home-directory pattern is built from
// os.homedir() at run time; no literal home path appears in this file.
import os from 'node:os';

const SLASH = String.fromCharCode(47);

// Token shapes mirror scripts/ci/check-content.mjs. They are written so that they do not match
// their own source text.
const TOKEN_PATTERNS = [
  /AKIA[0-9A-Z]{16}/g,
  /AIza[0-9A-Za-z_-]{35}/g,
  /gh[ps]_[A-Za-z0-9]{36,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /npm_[A-Za-z0-9]{36}/g,
  /xox[bpsa]-[0-9a-zA-Z-]+/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
];

// Any other absolute home path of a person (macOS or Linux layout) collapses to `~` as well.
const OTHER_HOME = new RegExp(`(?<![\\w.~:/-])${SLASH}(?:Users|home)${SLASH}[\\w.-]+`, 'g');

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function redact(text, { home = os.homedir() } = {}) {
  let out = String(text);
  if (home && home.length > 1) {
    const forms = new Set([home, JSON.stringify(home).slice(1, -1)]);
    for (const form of forms) out = out.replace(new RegExp(escapeRegExp(form), 'g'), '~');
  }
  out = out.replace(OTHER_HOME, '~');
  for (const re of TOKEN_PATTERNS) out = out.replace(re, '[redacted-token]');
  return out;
}

/** Deep-copies a JSON value, dropping every `env` key and redacting every string. */
export function redactValue(value, options) {
  if (typeof value === 'string') return redact(value, options);
  if (Array.isArray(value)) return value.map((v) => redactValue(v, options));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, v] of Object.entries(value)) {
      if (key === 'env') continue;
      out[key] = redactValue(v, options);
    }
    return out;
  }
  return value;
}

/** Markdown-table cell: redacted, pipes and newlines neutralised. */
export const cell = (value, options) =>
  redact(value ?? '', options).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
