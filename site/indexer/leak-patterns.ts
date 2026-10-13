// Copied verbatim from scripts/ci/check-content.mjs (SECRET_PATTERNS, HOME_PATH_PATTERNS) so the
// generated index is held to the same bar as the repository content. Copied, not imported: the
// site never reaches into scripts/ci (AC-45). Keep the two in sync by hand.

// Pattern sources that would match themselves are written so that they do not (the checker
// scans its own file): no literal backslash after a drive letter, no `BEGIN .* PRIVATE`.
const BACKSLASH = String.fromCharCode(92);

// A value that announces itself as a placeholder is not a credential.
const PLACEHOLDER = /your|example|placeholder|changeme|dummy|fake|sample|x{4}|\*{3}|<[^>]+>|\$\{/i;

export const SECRET_PATTERNS = [
  { id: 'aws-access-key', re: /AKIA[0-9A-Z]{16}/ },
  { id: 'google-api-key', re: /AIza[0-9A-Za-z_-]{35}/ },
  { id: 'mongodb-uri-with-credentials', re: /mongodb(\+srv)?:\/\/[^:\s/]+:[^@\s]+@/ },
  { id: 'private-key-block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { id: 'github-token', re: /gh[ps]_[A-Za-z0-9]{36,}/ },
  { id: 'npm-token', re: /npm_[A-Za-z0-9]{36}/ },
  { id: 'slack-token', re: /xox[bpsa]-[0-9a-zA-Z-]+/ },
  // 16+ characters: shorter literals are documentation placeholders (`password: 'secret123'`).
  { id: 'generic-credential-assignment', re: /(secret|key|token|password)\s*[:=]\s*['"][^'"\s]{16,}/i, ignoreIf: PLACEHOLDER },
] as const satisfies readonly { id: string; re: RegExp; ignoreIf?: RegExp }[];

// Case-sensitive and anchored: `/users/:id` route examples must not match, and a path segment
// such as `.../home/` inside a URL (preceded by a word character) must not either.
export const HOME_PATH_PATTERNS = [
  { id: 'absolute-home-path (/Users/)', re: /(?<![\w.~:/-])\/Users\/[\w.-]+/ },
  { id: 'absolute-home-path (/home/)', re: /(?<![\w.~:/-])\/home\/[\w.-]+/ },
  { id: 'absolute-windows-path', re: new RegExp(`(?<![A-Za-z])C:${BACKSLASH}${BACKSLASH}`) },
] as const satisfies readonly { id: string; re: RegExp }[];

/** Site-specific addition (AC-7): the index must carry no e-mail address. */
export const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/**
 * Addresses that are documentation, not people: the public SSH remote syntax used in install
 * docs, and placeholder domains used in bundled skill code samples (e.g. form-login examples).
 */
const DOC_ADDRESS = /^git@github\.com$|@(?:example\.(?:com|org|net)|test\.com|blog\.com)$/i;

export interface LeakFinding {
  id: string;
  /** Short excerpt, never more than 40 characters, so a finding does not itself spread a secret. */
  excerpt: string;
}

const excerpt = (s: string): string => (s.length > 40 ? `${s.slice(0, 40)}...` : s);
const ABSOLUTE_PATH = /^(?:\/|\\|[A-Za-z]:)/;

function collectPathValues(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectPathValues(item, out);
  } else if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if ((key === 'path' || key === 'sourcePath') && typeof value === 'string') out.push(value);
      else collectPathValues(value, out);
    }
  }
}

/** Scans the serialised index. Any finding must fail the build. */
export function scanForLeaks(json: string): LeakFinding[] {
  const findings: LeakFinding[] = [];
  for (const { id, re, ...rest } of SECRET_PATTERNS) {
    const ignoreIf = 'ignoreIf' in rest ? rest.ignoreIf : undefined;
    const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
    for (const m of json.matchAll(new RegExp(re.source, flags))) {
      if (ignoreIf?.test(m[0])) continue;
      findings.push({ id, excerpt: excerpt(m[0]) });
    }
  }
  for (const { id, re } of HOME_PATH_PATTERNS) {
    const m = re.exec(json);
    if (m) findings.push({ id, excerpt: excerpt(m[0]) });
  }
  for (const m of json.matchAll(new RegExp(EMAIL.source, 'g'))) {
    if (DOC_ADDRESS.test(m[0])) continue;
    findings.push({ id: 'email-address', excerpt: excerpt(m[0]) });
    break;
  }

  const paths: string[] = [];
  try {
    collectPathValues(JSON.parse(json), paths);
  } catch {
    findings.push({ id: 'invalid-json', excerpt: '' });
  }
  for (const p of paths) {
    if (ABSOLUTE_PATH.test(p)) findings.push({ id: 'absolute-path-value', excerpt: excerpt(p) });
  }
  return findings;
}
