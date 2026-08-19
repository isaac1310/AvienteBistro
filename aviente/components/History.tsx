'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from './LangProvider';
import styles from './History.module.css';

/* ⟲ Earlier versions — the other half of the safety net.
 *
 * Every save has been writing a snapshot since the first migration, but nothing
 * showed them, so last-write-wins was survivable only in principle. This is what
 * makes it survivable in practice.
 *
 * One component for recipes and menus: the actions differ, the interface does
 * not, and two copies of a list would drift.
 */

export type Version = {
  id: string;
  created_at: string;
  editor: { name: string } | null;
};

function when(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? 'day' : 'days'} ago`;
}

export default function History({
  load, restore, label = 'this recipe',
}: {
  load: () => Promise<Version[]>;
  restore: (id: string) => Promise<void>;
  label?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function show() {
    setBusy(true); setError(null);
    try {
      // Fetched on demand — a list of twenty snapshots is not worth sending to
      // every page view on the chance someone wants it.
      setVersions(await load());
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load earlier versions.');
    } finally { setBusy(false); }
  }

  async function put(id: string) {
    if (!confirm(`Put ${label} back to this version? The current one is kept too.`)) return;
    setBusy(true); setError(null);
    try {
      await restore(id);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore.');
    } finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" className={styles.trigger} onClick={show} disabled={busy}>
        ⟲ Earlier versions
      </button>
      {error && <p className={styles.error} role="alert">{error}</p>}

      {open && (
        <div className={styles.sheet} role="dialog" aria-label={t('history.title')}>
          <div className={styles.head}>
            <strong>{t('history.title')}</strong>
            <button type="button" className={styles.close} onClick={() => setOpen(false)}>
              Close
            </button>
          </div>

          <p className={styles.hint}>
            A version is kept every time anyone saves. Restoring keeps the current
            one too, so nothing is ever lost by looking.
          </p>

          <ul className={styles.list}>
            {versions?.map((v, i) => (
              <li key={v.id}>
                <button type="button" className={styles.row} disabled={busy}
                  onClick={() => put(v.id)}>
                  <span className={styles.time}>
                    {i === 0 ? 'before the last save' : when(v.created_at)}
                  </span>
                  <span className={styles.who}>
                    {v.editor?.name ? `saved over by ${v.editor.name}` : '—'}
                  </span>
                </button>
              </li>
            ))}
            {versions?.length === 0 && (
              <li className={styles.empty}>
                No earlier versions yet — this has only been saved once.
              </li>
            )}
          </ul>
        </div>
      )}
    </>
  );
}
