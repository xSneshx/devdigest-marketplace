export interface MarkdownSource {
  repoUrl: string;
  branch: string;
  filePath: string;
}

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto']);

function dirname(filePath: string): string[] {
  const parts = filePath.split('/').filter(Boolean);
  parts.pop();
  return parts;
}

/** POSIX-normalise `base/target`; returns null when the path escapes the repo root. */
function resolvePath(baseDir: string[], target: string): string | null {
  const stack = target.startsWith('/') ? [] : [...baseDir];
  for (const seg of target.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (stack.length === 0) return null;
      stack.pop();
    } else {
      stack.push(seg);
    }
  }
  return stack.join('/');
}

/**
 * Maps a Markdown link or image target to a safe URL, or '' when it must not be rendered as a link.
 * Allowed: http(s)/mailto as is; relative paths and fragments rewritten to the repository file view.
 */
export function transformUrl(url: string, source: MarkdownSource): string {
  const trimmed = url.trim();
  if (trimmed === '') return '';
  const scheme = SCHEME.exec(trimmed);
  if (scheme) {
    return ALLOWED_SCHEMES.has((scheme[1] ?? '').toLowerCase()) ? trimmed : '';
  }
  if (trimmed.startsWith('//')) return '';

  const base = `${source.repoUrl.replace(/\/+$/, '')}/blob/${source.branch}/`;
  const hashAt = trimmed.indexOf('#');
  const beforeHash = hashAt === -1 ? trimmed : trimmed.slice(0, hashAt);
  const fragment = hashAt === -1 ? '' : trimmed.slice(hashAt);
  const pathPart = beforeHash.split('?')[0] ?? '';
  const query = beforeHash.slice(pathPart.length);

  if (pathPart === '') return `${base}${source.filePath}${fragment}`;
  const resolved = resolvePath(dirname(source.filePath), pathPart);
  if (resolved === null) return '';
  return `${base}${resolved}${query}${fragment}`;
}
