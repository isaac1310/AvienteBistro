'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { movePhoto, recipesWithoutPhoto } from '@/lib/mutations';
import { categoryLabel } from '@/lib/constants';
import styles from './MovePhoto.module.css';

/* "This photo belongs to a different recipe" — the correction you actually need
 * after importing a batch of photographs, when one lands on the wrong dish.
 *
 * A picker rather than drag-and-drop: dragging across a scrolling list on a phone
 * is fiddly, and undoing it means dragging back. Picking the destination is one
 * tap and behaves identically on the Ultra and on a desktop.
 */
export default function MovePhoto({ recipeId }: { recipeId: string }) {
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
      setError(e instanceof Error ? e.message : 'Could not load recipes.');
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
      setError(e instanceof Error ? e.message : 'Could not move the photo.');
    } finally {
      setBusy(false);
    }
  }

  const shown = query.trim()
    ? options.filter((o) => o.title.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <>
      <button type="button" className={styles.trigger} onClick={openPicker} disabled={busy}>
        ↗ Move this photo to another recipe
      </button>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {open && (
        <div className={styles.sheet} role="dialog" aria-label="Move photo">
          <div className={styles.head}>
            <strong>Which recipe is this a photo of?</strong>
            <button type="button" className={styles.close} onClick={() => setOpen(false)}>
              Close
            </button>
          </div>

          <input
            className={styles.search} placeholder="Search…" value={query} autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />

          <p className={styles.hint}>
            Only recipes without a photo are listed — a photograph belongs to one
            dish, so nothing is overwritten.
          </p>

          <ul className={styles.list}>
            {shown.map((o) => (
              <li key={o.id}>
                <button type="button" className={styles.pick} disabled={busy}
                  onClick={() => moveTo(o.id)}>
                  <span lang="he">{o.title}</span>
                  <span className={styles.meta}>{categoryLabel(o.category).en}</span>
                </button>
              </li>
            ))}
            {shown.length === 0 && (
              <li className={styles.empty}>
                {options.length === 0
                  ? 'Every other recipe already has a photo.'
                  : 'Nothing matches that.'}
              </li>
            )}
          </ul>
        </div>
      )}
    </>
  );
}
