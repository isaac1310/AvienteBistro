'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { duplicateMenu, shareMenu, toggleSaved, unshareMenu } from '@/lib/menuMutations';
import { useT } from './LangProvider';
import Motif from './Motif';
import styles from './MenuActions.module.css';

/* Everything you can do with a finished menu: keep it, copy it onto a new date,
 * hand it to someone, take the link back, or print it. */
export default function MenuActions({
  id, date, saved, shareId, shareSecret,
}: {
  id: string; date: string; saved: boolean;
  shareId: string | null; shareSecret: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(
    shareId && shareSecret ? `/m/${shareId}?k=${shareSecret}` : null,
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'That did not work.'); }
    finally { setBusy(false); }
  };

  async function onShare() {
    await run(async () => {
      const path = await shareMenu(id);
      setLink(path);
      const url = `${window.location.origin}${path}`;
      // navigator.share is the natural thing on a phone; clipboard is the fallback.
      if (navigator.share) {
        try { await navigator.share({ url, title: 'Aviente — menu' }); return; } catch { /* cancelled */ }
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
    });
  }

  async function onDuplicate() {
    const when = prompt('Copy this menu onto which date?', new Date().toISOString().slice(0, 10));
    if (!when) return;
    await run(async () => {
      const newId = await duplicateMenu(id, when);
      router.push(`/menus/${newId}`);
    });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.buttons}>
        <button className="btn btn--ghost" disabled={busy}
          onClick={() => run(() => toggleSaved(id, !saved))}>
          {saved ? '★ Kept' : '☆ Keep this one'}
        </button>

        <button className="btn btn--ghost" disabled={busy} onClick={onDuplicate}>
          Duplicate
        </button>

        <a className="btn btn--ghost" href={`/menus/${id}/edit`}>{t('menu.editDishes')}</a>

        <a className="btn btn--ghost" href={`/print/menu/${id}`}>{t('common.print')}</a>

        <a className="btn" href={`/api/pdf?path=${encodeURIComponent(`/print/menu/${id}`)}&name=aviente-menu-${date}`}>
          Export PDF
        </a>
      </div>

      <div className={styles.share}>
        {link ? (
          <>
            <p className={styles.shareNote}>
              Anyone with this link can see this menu — nothing else in the cookbook.
            </p>
            <div className={styles.linkRow}>
              <input className={styles.linkField} readOnly value={
                typeof window === 'undefined' ? link : `${window.location.origin}${link}`
              } onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className={styles.copy} disabled={busy}
                onClick={async () => {
                  await navigator.clipboard.writeText(`${window.location.origin}${link}`);
                  setCopied(true);
                }}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button type="button" className={styles.revoke} disabled={busy}
              onClick={() => run(async () => { await unshareMenu(id); setLink(null); setCopied(false); })}>
              <><Motif name="link_off" size={18} /> {t('menu.stopSharing')}</>
            </button>
          </>
        ) : (
          <button className="btn btn--ghost" disabled={busy} onClick={onShare}>
            <><Motif name="link" size={18} /> {t('menu.shareLink')}</>
          </button>
        )}
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
