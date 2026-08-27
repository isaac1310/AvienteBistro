'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from './LangProvider';
import BusyButton from './BusyButton';
import Confirm from './Confirm';
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

/**
 * Relative times, in the reader's language.
 *
 * Module level, not a closure inside the component: it reads `Date.now()`, and an
 * impure read during render is exactly what react-hooks/purity is there to catch —
 * the clock would be sampled on every re-render. `t` is passed in instead.
 *
 * Singular and plural are separate dictionary entries rather than an English
 * `n === 1 ? 'hour' : 'hours'`, because Hebrew does not inflect the same way.
 */
function when(iso: string, t: (k: TimeKey, v?: Record<string, string | number>) => string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t('time.justNow');
  if (mins < 60) return t('time.minsAgo', { n: mins });
  const h = Math.round(mins / 60);
  if (h < 24) return h === 1 ? t('time.hourAgo') : t('time.hoursAgo', { n: h });
  const d = Math.round(h / 24);
  return d === 1 ? t('time.dayAgo') : t('time.daysAgo', { n: d });
}

type TimeKey =
  | 'time.justNow' | 'time.minsAgo' | 'time.hourAgo'
  | 'time.hoursAgo' | 'time.dayAgo' | 'time.daysAgo';

export default function History({
  load, restore, kind = 'recipe',
}: {
  load: () => Promise<Version[]>;
  restore: (id: string) => Promise<void>;
  /* Which noun the question uses. Was a `label` prop holding the literal English
     "this recipe" / "this menu", which is how a Hebrew-first screen ended up asking
     in English. */
  kind?: 'recipe' | 'menu';
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* The revision awaiting a yes, or null. */
  const [asking, setAsking] = useState<string | null>(null);

  async function show() {
    setBusy(true); setError(null);
    try {
      // Fetched on demand — a list of twenty snapshots is not worth sending to
      // every page view on the chance someone wants it.
      setVersions(await load());
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('history.loadFailed'));
    } finally { setBusy(false); }
  }

  async function put(id: string) {
    setAsking(null);
    setBusy(true); setError(null);
    try {
      await restore(id);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('history.restoreFailed'));
    } finally { setBusy(false); }
  }

  return (
    <>
      {/* Fetching the revision list is a round trip and this said nothing. */}
      <BusyButton busy={busy} className={styles.trigger} onClick={show}
        busyLabel={t('history.loading')}>
        {t('history.earlier')}
      </BusyButton>
      {error && <p className={styles.error} role="alert">{error}</p>}

      {open && (
        <div className={styles.sheet} role="dialog" aria-label={t('history.title')}>
          <div className={styles.head}>
            <strong>{t('history.title')}</strong>
            <button type="button" className={styles.close} onClick={() => setOpen(false)}>
              {t('common.close')}
            </button>
          </div>

          <p className={styles.hint}>{t('history.hint')}</p>

          {/* Asked inside the sheet, above the list it is about. */}
          {asking && (
            <Confirm
              message={t(kind === 'menu' ? 'history.putBackMenu' : 'history.putBackRecipe')}
              confirmLabel={t('history.putBack')}
              danger={false}
              busy={busy}
              onConfirm={() => put(asking)}
              onCancel={() => setAsking(null)}
            />
          )}

          <ul className={styles.list}>
            {versions?.map((v, i) => (
              <li key={v.id}>
                <button type="button" className={styles.row} disabled={busy}
                  onClick={() => setAsking(v.id)}>
                  <span className={styles.time}>
                    {i === 0 ? t('history.beforeLastSave') : when(v.created_at, t)}
                  </span>
                  <span className={styles.who}>
                    {v.editor?.name ? t('history.savedOverBy', { name: v.editor.name }) : '—'}
                  </span>
                </button>
              </li>
            ))}
            {versions?.length === 0 && (
              <li className={styles.empty}>{t('history.empty')}</li>
            )}
          </ul>
        </div>
      )}
    </>
  );
}
