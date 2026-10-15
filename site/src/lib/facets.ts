import { KIND_ORDER, type Kind, type SiteIndex } from '../contract/site-index';

const ALWAYS_VISIBLE: ReadonlySet<Kind> = new Set<Kind>(['plugin', 'skill', 'agent']);

function kindCount(index: SiteIndex, kind: Kind): number {
  if (kind === 'plugin') return index.plugins.length;
  return index.components.filter((c) => c.kind === kind).length;
}

/** Plugin, skill and agent always; the other kinds only when something of that kind exists. */
export function visibleKinds(index: SiteIndex): Kind[] {
  return KIND_ORDER.filter((k) => ALWAYS_VISIBLE.has(k) || kindCount(index, k) > 0);
}

export function topKeywords(index: SiteIndex, limit: number): string[] {
  const freq = new Map<string, number>();
  for (const p of index.plugins) {
    for (const k of new Set(p.keywords)) freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'))
    .slice(0, Math.max(0, limit))
    .map(([k]) => k);
}

export function authors(index: SiteIndex): string[] {
  return [...new Set(index.plugins.map((p) => p.author).filter((a) => a !== ''))].sort((a, b) =>
    a.localeCompare(b, 'en'),
  );
}

export function showAuthorFilter(index: SiteIndex): boolean {
  return authors(index).length >= 2;
}

export function hasKeywords(index: SiteIndex): boolean {
  return index.plugins.some((p) => p.keywords.length > 0);
}
