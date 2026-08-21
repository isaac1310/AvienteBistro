'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { restoreRecipe } from '@/lib/mutations';
import { useT } from './LangProvider';
import styles from './UndoToast.module.css';

/* The ten seconds after a delete.
 *
 * Soft delete has always been reversible in the database; without this, undoing
 * a mistap meant asking someone to run SQL. The toast is the difference between
 * "recoverable in principle" and "recoverable by the person who did it".
 *
 * It reads ?undo=<id> from the URL rather than holding state across a navigation,
 * so it survives the redirect that follows a delete.
 */
export default function UndoToast() {
  const t = useT();
  const router = useRouter();
  const id = useSearchParams().get('undo');
  const [left, setLeft] = useState(10);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       Deliberate: the countdown restarts when a NEW ?undo= arrives, and that
       id lives in the URL rather than in state. The rule flags the cascading render; here it is one
       extra paint on mount, which is the price of not mismatching the
       server HTML. Restructure this and the reason above goes with it. */
    setLeft(10); setDone(false);
    const t = setInterval(() => setLeft((n) => (n <= 1 ? 0 : n - 1)), 1000);
    return () => clearInterval(t);
  }, [id]);

  if (!id || done || left === 0) return null;

  return (
    <div className={styles.toast} role="status">
      <span className={styles.text}>{t('undo.deleted')}</span>
      <button
        type="button"
        className={styles.undo}
        onClick={async () => {
          await restoreRecipe(id);
          setDone(true);
          router.refresh();
        }}
      >
        {t('undo.undo')}
      </button>
      {/* The count is shown, not just implied: a disappearing button with no
          warning is how people miss their only chance to undo. */}
      <span className={styles.count} aria-hidden="true">{left}</span>
    </div>
  );
}
