'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RecipeCard from './RecipeCard';
import type { RecipeSummary } from '@/lib/constants';
import styles from './SelectableList.module.css';

/* §3.2's select mode — "N SELECTED — BUILD MENU →".
 *
 * Without it, building a Friday menu from a category meant opening the builder and
 * searching for each dish by name, one at a time. This is the path you actually
 * want: stand in Mains, tick three things, go.
 *
 * Selection is deliberately NOT persisted. It lasts as long as you are looking at
 * this list, which is how long the intention lasts.
 */
export default function SelectableList({ recipes }: { recipes: RecipeSummary[] }) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);

  const toggle = (id: string) =>
    setChosen(chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id]);

  return (
    <>
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => { setSelecting(!selecting); setChosen([]); }}
        >
          {selecting ? 'Cancel' : '✓ Select for a menu'}
        </button>
      </div>

      <ul className={styles.list}>
        {recipes.map((r) => (
          <li key={r.id} className={styles.item}>
            {selecting ? (
              /* In select mode the whole card becomes a checkbox rather than a
                 link — tapping through to a recipe mid-selection would lose the
                 selection, which is worse than not browsing for a moment. */
              <label className={`card ${styles.selectable} ${chosen.includes(r.id) ? styles.on : ''}`}>
                <input
                  type="checkbox"
                  className={styles.box}
                  checked={chosen.includes(r.id)}
                  onChange={() => toggle(r.id)}
                />
                <span className={styles.body}>
                  <span className={styles.title} lang="he">{r.title}</span>
                  <span className={styles.meta}>
                    {r.source_name ? `${r.source_name}'s` : ''}
                    {r.servings ? ` · serves ${r.servings}` : ''}
                  </span>
                </span>
              </label>
            ) : (
              <RecipeCard recipe={r} />
            )}
          </li>
        ))}
      </ul>

      {/* Sticky footer, so the count and the way forward stay reachable without
          scrolling back up a long list. */}
      {selecting && chosen.length > 0 && (
        <div className={styles.sticky}>
          <span className={styles.count}>{chosen.length} selected</span>
          <button
            type="button"
            className={styles.go}
            onClick={() => router.push(`/menus/new?dish=${chosen.join(',')}`)}
          >
            Build menu →
          </button>
        </div>
      )}
    </>
  );
}
