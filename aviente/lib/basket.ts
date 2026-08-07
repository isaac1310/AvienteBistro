'use client';

/**
 * The dishes picked for a menu, kept across category pages.
 *
 * Selection used to live in one list's `useState`, so a soup from Soups was gone the
 * moment you walked to Mains — and a menu is by definition several courses, which
 * means the one thing the flow existed for was the one thing it could not do.
 *
 * sessionStorage, not localStorage: a half-finished selection is worth surviving a
 * tap to another category, and is NOT worth being handed back tomorrow morning as if
 * you had meant it. It also dies with the tab, which is the same lifetime as the
 * intention.
 *
 * A tiny event bus on top, because two components need the same count — the bar on
 * the current list and the sticky footer — and storage events do not fire in the tab
 * that made the change.
 */

const KEY = 'aviente.basket';
const EVENT = 'aviente:basket';

export function readBasket(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    /* Anything could be in storage — an older shape, a hand-edited value, a half
       written string. Ids are strings; nothing else is allowed through. */
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function writeBasket(ids: string[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids));
  } catch { /* private mode, or storage full: the selection stops persisting, and the
                page still works with whatever is in memory. */ }
  window.dispatchEvent(new Event(EVENT));
}

export function clearBasket(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* see writeBasket */ }
  window.dispatchEvent(new Event(EVENT));
}

/** Subscribe to changes made anywhere in this tab. Returns an unsubscribe. */
export function onBasketChange(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  /* Another tab is a different session store, but listening costs nothing and keeps
     the two consistent if the browser ever shares one. */
  window.addEventListener('storage', fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener('storage', fn);
  };
}
