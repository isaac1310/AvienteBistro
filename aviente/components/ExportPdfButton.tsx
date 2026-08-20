'use client';

import { useEffect, useRef, useState } from 'react';
import Loading from './Loading';
import { useT } from './LangProvider';
import styles from './ExportPdfButton.module.css';

/**
 * Export a print route as a PDF, with a waiting state.
 *
 * It was a plain `<a href="/api/pdf?…">`, which cannot have one: the route boots
 * headless Chromium and is allowed sixty seconds, so the honest case is a long wait
 * during which the old link did nothing observable and invited a second tap.
 *
 * Fetching instead of navigating buys the loader and costs the things a browser used
 * to do for us, each of which is handled here rather than assumed:
 *   - a non-2xx reply is a JSON error from the route, not a PDF — read it and say so,
 *     rather than downloading a file containing an error message
 *   - `credentials: 'same-origin'` because the route is behind auth; a fetch without
 *     it gets the login page rendered as a PDF
 *   - the object URL is revoked, and on unmount too — a 2MB blob per tap otherwise
 *     stays in memory until the tab closes
 *   - the filename comes from Content-Disposition when the route sends one, so the
 *     name stays the route's business
 *
 * The download is started by clicking a generated anchor. That is the only way to
 * hand a blob to the browser, and it is worth knowing it is also the part most
 * likely to be blocked in an embedded viewer.
 */
export default function ExportPdfButton({
  path, name, className = 'btn',
}: {
  /** A /print/* route. The API refuses anything else. */
  path: string;
  /** Filename without the extension. */
  name: string;
  className?: string;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => () => { urls.current.forEach(URL.revokeObjectURL); }, []);

  async function onClick() {
    if (busy) return;                       // a second tap starts a second Chromium
    setBusy(true); setError(null);
    try {
      const res = await fetch(
        `/api/pdf?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`,
        { credentials: 'same-origin' },
      );
      if (!res.ok) {
        /* The route replies JSON on failure. If it did not, the status alone is more
           use than a parse error on top of the real one. */
        const body = await res.text();
        let detail = body.slice(0, 200);
        try { detail = (JSON.parse(body).error as string) ?? detail; } catch { /* not JSON */ }
        throw new Error(`${res.status} · ${detail}`);
      }

      const disposition = res.headers.get('content-disposition') ?? '';
      const named = /filename="?([^";]+)"?/.exec(disposition)?.[1];

      const url = URL.createObjectURL(await res.blob());
      urls.current.push(url);
      const a = document.createElement('a');
      a.href = url;
      a.download = named ?? `${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      /* An aborted fetch after 60s reads as "Failed to fetch", which tells nobody
         anything — name the likely cause instead. */
      const message = e instanceof Error ? e.message : String(e);
      setError(/failed to fetch|network/i.test(message) ? t('pdf.timeout') : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={onClick} disabled={busy}
        aria-busy={busy}>
        {busy ? (
          <span className={styles.busy}>
            <Loading size="inline" label={t('pdf.working')} />
            {t('pdf.working')}
          </span>
        ) : t('recipe.exportPdf')}
      </button>
      {error && <p className={styles.error} role="alert">{t('pdf.failed')} — {error}</p>}
    </>
  );
}
