'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { restoreRecipe } from '@/lib/mutations';
import { categoryLabel } from '@/lib/constants';
import { categoryName } from '@/lib/i18n';
import { useLang, useT } from './LangProvider';
import BusyButton from './BusyButton';
import styles from './TrashList.module.css';

/* The trash list. Restore only — there is deliberately NO permanent delete here:
 * these rows are the family's only copy of these recipes, and the soft-delete rule
 * exists precisely so that no tap can ever make one unrecoverable. */
export default function TrashList({
  rows,
}: { rows: { id: string; title: string; category: string; deleted_at: string }[] }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRestore(id: string) {
    setBusyId(id); setError(null);
    try {
      await restoreRecipe(id);
      router.refresh();
    } catch {
      setError(t('trash.failed'));
    } finally {
      setBusyId(null);
    }
  }

  const shortDate = (iso: string) => {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${p(d.getFullYear() % 100)}`;
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>{t('trash.hint')}</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <ul className={styles.list}>
        {rows.map((r) => (
          <li key={r.id} className={`card ${styles.row}`}>
            <div className={styles.text}>
              <span className={styles.title} lang="he" dir="auto">{r.title}</span>
              <span className={styles.meta}>
                {categoryName(categoryLabel(r.category), lang)}
                {' · '}
                {t('trash.deletedOn', { date: shortDate(r.deleted_at) })}
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
          {t('trash.empty')}{' '}
          <Link href="/recipes">{t('book.back')}</Link>
        </p>
      )}
    </div>
  );
}
