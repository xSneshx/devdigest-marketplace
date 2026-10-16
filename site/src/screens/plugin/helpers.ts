import { KIND_ORDER, type ComponentKind, type SiteIndex } from '../../contract/site-index';

type Component = SiteIndex['components'][number];

export interface ComponentGroup {
  kind: ComponentKind;
  items: Component[];
}

function isComponentKind(kind: (typeof KIND_ORDER)[number]): kind is ComponentKind {
  return kind !== 'plugin';
}

/** Components of one plugin grouped by `KIND_ORDER`; empty groups are omitted. */
export function groupComponents(components: readonly Component[], plugin: string): ComponentGroup[] {
  const own = components.filter((c) => c.plugin === plugin);
  return KIND_ORDER.filter(isComponentKind)
    .map((kind) => ({ kind, items: own.filter((c) => c.kind === kind) }))
    .filter((g) => g.items.length > 0);
}
