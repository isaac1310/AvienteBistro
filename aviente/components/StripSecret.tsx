'use client';

import { useEffect } from 'react';

/**
 * Removes `?k=` from the address bar after the page has loaded.
 *
 * Straight from TravelHub, and for the same two reasons: the secret should not
 * sit on screen where anyone glancing at the phone can read it, and it should not
 * travel in the `Referer` header of any outbound request the page makes.
 * `vercel.json` sets `Referrer-Policy: no-referrer` as well — belt and braces.
 *
 * The URL is replaced, not pushed, so Back still leaves the page rather than
 * cycling through the same address twice.
 */
export default function StripSecret() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('k')) return;
    url.searchParams.delete('k');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, []);

  return null;
}
