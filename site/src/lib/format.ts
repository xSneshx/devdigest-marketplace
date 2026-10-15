const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

/** `YYYY-MM-DD` from an ISO string, with no Date object and no locale dependence. */
export function formatDate(iso: string): string {
  const match = DATE_PREFIX.exec(iso);
  return match?.[1] ?? iso;
}
