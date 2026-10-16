/** Navigation state set by the home hero: hand the typing focus to the header search. */
export const FOCUS_HEADER_SEARCH = { focusHeaderSearch: true } as const;

export function wantsHeaderFocus(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'focusHeaderSearch' in state;
}
