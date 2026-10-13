/** Writes text to the clipboard. Resolves false when the API is missing or the write is refused. */
export async function copyText(text: string): Promise<boolean> {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (!clipboard || typeof clipboard.writeText !== 'function') return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Selects the contents of an element so the user can copy by hand. */
export function selectContents(el: Element | null): void {
  if (!el) return;
  const selection = typeof window === 'undefined' ? null : window.getSelection();
  selection?.selectAllChildren(el);
}
