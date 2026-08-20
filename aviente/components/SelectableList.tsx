'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RecipeCard from './RecipeCard';
import { useT } from './LangProvider';
import { clearBasket, onBasketChange, readBasket, writeBasket } from '@/lib/basket';
import type { RecipeSummary } from '@/lib/constants';
import styles from './SelectableList.module.css';
import Arrow from './Arrow';

/* §3.2's select mode — "N SELECTED — BUILD MENU →".
 *
 * Without it, building a Friday menu from a category meant opening the builder and
 * searching for each dish by name, one at a time. This is the path you actually
 * want: stand in Mains, tick three things, go.
 *
 * Selection now survives a walk to another category — see lib/basket.ts. It used to
 * live in this component's state, which meant a soup picked in Soups vanished on the
 * way to Mains, so the flow could not assemble the one thing it exists to assemble.
 * It still dies with the tab.
 */
export default function SelectableList({ recipes }: { recipes: RecipeSummary[] }) {
  const t = useT();
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>([]);

  /* Read after mount, never during render. sessionStorage does not exist on the
     server, so seeding useState from it makes the two disagree about the first paint
     — and React's recovery is to throw away the server HTML and re-render, which
     flickers the whole list. */
  useEffect(() => {
    setChosen(readBasket());
    return onBasketChange(() => setChosen(readBasket()));
  }, []);

  /* Select mode is not its own state any more: arriving in a second category with a
     selection already in hand has to land you IN select mode, or the basket exists and
     the page pretends it does not. */
  const [selectingHere, setSelectingHere] = useState(false);
  const selecting = selectingHere || chosen.length > 0;

  const toggle = (id: string) => {
    const next = chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id];
    writeBasket(next);
    setChosen(next);
  };

  const chosenHere = recipes.filter((r) => chosen.includes(r.id)).length;

  return (
    <>
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => {
            if (selecting) { clearBasket(); setChosen([]); setSelectingHere(false); }
            else setSelectingHere(true);
          }}
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
          <span className={styles.count}>
            {chosen.length} selected
            {/* The count includes dishes ticked in other categories, which is
                surprising unless the bar says where they are. */}
            {chosenHere < chosen.length && (
              <span className={styles.across}>
                {chosenHere} here · keep going in another category
              </span>
            )}
          </span>
          <button
            type="button"
            className={styles.go}
            onClick={() => {
              const ids = chosen.join(',');
              clearBasket();
              router.push(`/menus/new?dish=${ids}`);
            }}
          >
            {t('book.buildMenu')} <Arrow dir="forward" />
          </button>
        </div>
      )}
    </>
  );
}
