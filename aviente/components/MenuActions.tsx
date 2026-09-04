'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { duplicateMenu, shareMenu, softDeleteMenu, toggleSaved, unshareMenu } from '@/lib/menuMutations';
import { useT } from './LangProvider';
import BusyButton from './BusyButton';
import Confirm from './Confirm';
import ExportPdfButton from './ExportPdfButton';
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
  /* Clipboard denied or missing. The link field below is selectable, so the
     fallback is to say so rather than fail silently with "Copied" never showing. */
  const [copyFailed, setCopyFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* The date being copied to, or null when nobody is duplicating. */
  const [copyDate, setCopyDate] = useState<string | null>(null);
  /* Revoking is the least reversible thing on this screen: a new link can be minted,
     but the one already in somebody's WhatsApp is dead for good. It asked nothing. */
  const [askUnshare, setAskUnshare] = useState(false);
  /* Deleting a menu. Soft — it goes to /menus/trash — but its share link is revoked
     for good, which is why it asks. */
  const [askDelete, setAskDelete] = useState(false);

  async function onDelete() {
    setAskDelete(false);
    setBusy(true); setError(null);
    try {
      await softDeleteMenu(id);
      /* Push, THEN refresh — not through run(), whose refresh runs before the push
         and re-fetches a page that no longer exists. The refresh after is needed:
         without it the router cache served the list with the deleted menu still on it
         (seen in the v11.5.0 run). Same order MenuBuilder uses after a save. */
      router.push('/menus');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('menu.actionFailed'));
      setBusy(false);
    }
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : t('menu.actionFailed')); }
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
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      } catch {
        setCopyFailed(true); // the link field renders below; it selects on focus
      }
    });
  }

  /* A DATE PICKER, not window.prompt.
     The prompt asked for a date as free text — the one input type a phone has a
     proper control for — and it is suppressed outright in embedded browsers, so
     Duplicate did nothing there. It also could not be driven by the regression
     agent. Now the field appears in the page, typed as `date`, so the platform
     validates it and the keyboard is the right one. */
  async function onDuplicate(when: string) {
    if (!when) return;
    setCopyDate(null);
    await run(async () => {
      const newId = await duplicateMenu(id, when);
      router.push(`/menus/${newId}`);
    });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.buttons}>
        <BusyButton busy={busy} className="btn btn--ghost" busyLabel={t('menu.working')}
          onClick={() => run(() => toggleSaved(id, !saved))}>
          {saved ? t('menu.kept') : t('menu.keepThis')}
        </BusyButton>

        <BusyButton busy={busy} className="btn btn--ghost" busyLabel={t('menu.working')}
          onClick={() => setCopyDate(new Date().toISOString().slice(0, 10))}>
          {t('menu.duplicate')}
        </BusyButton>

        <a className="btn btn--ghost" href={`/menus/${id}/edit`}>{t('menu.editDishes')}</a>

        <a className="btn btn--ghost" href={`/print/menu/${id}`}>{t('common.print')}</a>

        <ExportPdfButton path={`/print/menu/${id}`} name={`aviente-menu-${date}`} />
      </div>

      <div className={styles.share}>
        {link ? (
          <>
            <p className={styles.shareNote}>{t('menu.shareNote')}</p>
            <div className={styles.linkRow}>
              <input className={styles.linkField} readOnly value={
                typeof window === 'undefined' ? link : `${window.location.origin}${link}`
              } onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className={styles.copy} disabled={busy}
                onClick={async (e) => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}${link}`);
                    setCopied(true); setCopyFailed(false);
                  } catch {
                    const field = (e.currentTarget.previousElementSibling as HTMLInputElement | null);
                    field?.focus(); field?.select();
                    setCopyFailed(true);
                  }
                }}>
                {copied ? t('menu.copied') : t('menu.copy')}
              </button>
            </div>
            {copyFailed && <p className={styles.error} role="status">{t('clipboard.failed')}</p>}
            <BusyButton busy={busy} className={styles.revoke} busyLabel={t('menu.working')}
              onClick={() => setAskUnshare(true)}>
              <Motif name="link_off" size={18} /> {t('menu.stopSharing')}
            </BusyButton>
          </>
        ) : (
          <BusyButton busy={busy} className="btn btn--ghost" busyLabel={t('menu.working')}
            onClick={onShare}>
            <Motif name="link" size={18} /> {t('menu.shareLink')}
          </BusyButton>
        )}
      </div>

      {/* Delete, de-emphasised and last — the one action here that removes the whole
          object rather than changing something about it. */}
      <BusyButton busy={busy} className={styles.revoke} busyLabel={t('menu.working')}
        onClick={() => setAskDelete(true)}>
        {t('menu.delete')}
      </BusyButton>

      {askDelete && (
        <Confirm
          message={t('menu.deleteConfirm')}
          confirmLabel={t('common.confirmDelete')}
          busy={busy}
          onConfirm={onDelete}
          onCancel={() => setAskDelete(false)}
        />
      )}

      {askUnshare && (
        <Confirm
          message={t('menu.unshareConfirm')}
          confirmLabel={t('menu.unshareYes')}
          busy={busy}
          onConfirm={() => {
            setAskUnshare(false);
            void run(async () => { await unshareMenu(id); setLink(null); setCopied(false); });
          }}
          onCancel={() => setAskUnshare(false)}
        />
      )}

      {copyDate !== null && (
        <div className={styles.copyRow}>
          <label className={styles.copyLabel}>
            <span>{t('menu.copyDate')}</span>
            <input
              className={styles.copyField} type="date" value={copyDate}
              onChange={(e) => setCopyDate(e.target.value)}
              /* Enter is what a date field invites; without this the only way
                 through was a mouse. */
              onKeyDown={(e) => { if (e.key === 'Enter') onDuplicate(copyDate); }}
            />
          </label>
          <div className={styles.copyBtns}>
            <BusyButton busy={busy} busyLabel={t('menu.working')}
              onClick={() => onDuplicate(copyDate)}>
              {t('menu.duplicate')}
            </BusyButton>
            <button type="button" className="btn btn--ghost" disabled={busy}
              onClick={() => setCopyDate(null)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
