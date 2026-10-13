import type { Kind } from '../../contract/site-index';
import { kindLabel } from '../../i18n/t';

/** Badge with the kind word; colour is never the only signal. Styling lives in global.css. */
export function KindBadge({ kind }: { kind: Kind }) {
  return (
    <span className="kind-badge" data-kind={kind}>
      <KindDot kind={kind} />
      {kindLabel(kind)}
    </span>
  );
}

/** Small decorative dot in the kind colour. */
export function KindDot({ kind }: { kind: Kind }) {
  return <span className="kind-dot" data-kind={kind} aria-hidden="true" />;
}
