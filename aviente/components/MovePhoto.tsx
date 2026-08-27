'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { movePhoto, recipesWithoutPhoto } from '@/lib/mutations';
import { categoryLabel } from '@/lib/constants';
import BusyButton from './BusyButton';
import { useT } from './LangProvider';
import styles from './MovePhoto.module.css';

/* "This photo belongs to a different recipe" — the correction you actually need
 * after importing a batch of photographs, when one lands on the wrong dish.
 *
 * A picker rather than drag-and-drop: dragging across a scrolling list on a phone
 * is fiddly, and undoing it means dragging back. Picking the destination is one
 * tap and behaves identically on the Ultra and on a desktop.
 */
export default function MovePhoto({ recipeId }: { recipeId: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<{ id: string; title: string; category: string }[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPicker() {
    setBusy(true); setError(null);
    try {
      // Loaded on demand: a list of every photo-less recipe is not worth sending
      // to a page nobody may use it on.
      setOptions(await recipesWithoutPhoto(recipeId));
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('photo.loadFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function moveTo(id: string) {
    setBusy(true); setError(null);
    try {
      await movePhoto(recipeId, id);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('photo.moveFailed'));
    } finally {
      setBusy(false);
    }
  }

  const shown = query.trim()
    ? options.filter((o) => o.title.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <>
      {/* The picker loads every photo-less recipe over the network, and this said
          nothing at all while it did — on kitchen wifi a tap looked ignored. */}
      <BusyButton busy={busy && !open} className={styles.trigger} onClick={openPicker}
        busyLabel={t('photo.loading')}>
        {t('photo.moveThis')}
      </BusyButton>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {open && (
        <div className={styles.sheet} role="dialog" aria-label={t('photo.move')}>
          <div className={styles.head}>
            <strong>{t('photo.whichRecipe')}</strong>
            <button type="button" className={styles.close} onClick={() => setOpen(false)}>
              {t('common.close')}
            </button>
          </div>

          <input
            className={styles.search} placeholder={t('common.search')} value={query} autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />

          <p className={styles.hint}>{t('photo.onlyEmpty')}</p>

          <ul className={styles.list}>
            {shown.map((o) => (
              <li key={o.id}>
                <BusyButton busy={busy} className={styles.pick}
                  busyLabel={t('photo.moving')} onClick={() => moveTo(o.id)}>
                  <span lang="he">{o.title}</span>
                  <span className={styles.meta}>{categoryLabel(o.category).en}</span>
                </BusyButton>
              </li>
            ))}
            {shown.length === 0 && (
              <li className={styles.empty}>
                {options.length === 0
                  ? t('photo.allHave')
                  : t('common.noMatch')}
              </li>
            )}
          </ul>
        </div>
      )}
    </>
  );
}
