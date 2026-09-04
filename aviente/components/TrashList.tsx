'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { shortDate } from '@/lib/dates';
import { useT } from './LangProvider';
import BusyButton from './BusyButton';
import styles from './TrashList.module.css';

/* The trash list — recipes and menus share it. Restore only — there is deliberately
 * NO permanent delete here: these rows are the family's only copy, and the soft-delete
 * rule exists precisely so that no tap can ever make one unrecoverable.
 *
 * `restore` must be a SERVER ACTION reference (restoreRecipe / restoreMenu from a
 * 'use server' module). An inline arrow written in a server page cannot cross to this
 * client component; the action reference can. */
export default function TrashList({
  rows, restore, backHref, backLabel, emptyText, hintText,
}: {
  rows: { id: string; title: string; meta: string; deleted_at: string }[];
  restore: (id: string) => Promise<void>;
  backHref: string;
  backLabel: string;
  emptyText: string;
  hintText: string;
}) {
  const t = useT();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRestore(id: string) {
    setBusyId(id); setError(null);
    try {
      await restore(id);
      router.refresh();
    } catch {
      setError(t('trash.failed'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>{hintText}</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <ul className={styles.list}>
        {rows.map((r) => (
          <li key={r.id} className={`card ${styles.row}`}>
            <div className={styles.text}>
              <span className={styles.title} lang="he" dir="auto">{r.title}</span>
              <span className={styles.meta}>
                {r.meta}{r.meta ? ' · ' : ''}{t('trash.deletedOn', { date: shortDate(r.deleted_at) })}
              </span>
            </div>
            <BusyButton busy={busyId === r.id} className="btn btn--ghost"
              busyLabel={t('trash.restoring')} onClick={() => onRestore(r.id)}>
              {t('trash.restore')}
            </BusyButton>
          </li>
        ))}
      </ul>
      {rows.length === 0 && (
        <p className={styles.empty}>
          {emptyText}{' '}
          <Link href={backHref}>{backLabel}</Link>
        </p>
      )}
    </div>
  );
}
