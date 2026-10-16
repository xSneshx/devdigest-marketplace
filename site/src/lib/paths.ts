import { ComponentKind, componentId } from '../contract/site-index';
import { toSearchParams, type SearchState } from './search-params';

const enc = encodeURIComponent;

export function homePath(): string {
  return '#/';
}

export function searchPath(state?: Partial<SearchState>): string {
  const qs = state ? toSearchParams(state).toString() : '';
  return qs ? `#/search?${qs}` : '#/search';
}

export function pluginPath(name: string): string {
  return `#/plugin/${enc(name)}`;
}

/** `id` is a component id: `${kind}:${plugin}/${name}`. A malformed id falls back to home. */
export function componentPath(id: string): string {
  const colon = id.indexOf(':');
  const slash = id.indexOf('/', colon + 1);
  if (colon < 1 || slash < 0) return homePath();
  const kind = id.slice(0, colon);
  const plugin = id.slice(colon + 1, slash);
  const name = id.slice(slash + 1);
  return `#/component/${enc(kind)}/${enc(plugin)}/${enc(name)}`;
}

export function whatsNewPath(): string {
  return '#/whats-new';
}

export function gettingStartedPath(): string {
  return '#/getting-started';
}

/** Validates route params; returns the component id, or undefined for an unknown kind. */
export function parseComponentRoute(
  kind: string | undefined,
  plugin: string | undefined,
  name: string | undefined,
): string | undefined {
  const parsed = ComponentKind.safeParse(kind);
  if (!parsed.success || !plugin || !name) return undefined;
  return componentId(parsed.data, plugin, name);
}
