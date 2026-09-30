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
/* Optional headings (sub-shelves, migration 0023). Given `groups`, the list splits
   under one heading per group that has recipes, in the order given, with anything
   unplaced last under `unsortedLabel`. The order WITHIN a heading is the page's sort,
   so sorting by "recent" still works — it just sorts each shelf. */
type Group = { key: string; label: string };

export default function SelectableList({
  recipes, groups, unsortedLabel,
}: { recipes: RecipeSummary[]; groups?: Group[]; unsortedLabel?: string }) {
  const t = useT();
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>([]);

  /* Read after mount, never during render. sessionStorage does not exist on the
     server, so seeding useState from it makes the two disagree about the first paint
     — and React's recovery is to throw away the server HTML and re-render, which
     flickers the whole list. */
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       Deliberate: sessionStorage does not exist on the server, so seeding
       useState from it makes the two disagree and React discards the server HTML. The rule flags the cascading render; here it is one
       extra paint on mount, which is the price of not mismatching the
       server HTML. Restructure this and the reason above goes with it. */
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

  const sections: { key: string; label: string | null; items: RecipeSummary[] }[] = (() => {
    if (!groups?.length || !recipes.some((r) => r.subgroup)) {
      return [{ key: 'all', label: null, items: recipes }];
    }
    const known = new Set(groups.map((g) => g.key));
    const out = groups
      .map((g) => ({ key: g.key, label: g.label, items: recipes.filter((r) => r.subgroup === g.key) }))
      .filter((g) => g.items.length > 0);
    const rest = recipes.filter((r) => !r.subgroup || !known.has(r.subgroup));
    if (rest.length) out.push({ key: '_unsorted', label: unsortedLabel ?? '—', items: rest });
    return out;
  })();

  const renderItems = (items: RecipeSummary[]) => (
    items.map((r) => (
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
                {r.source_name ? t('book.whose', { name: r.source_name }) : ''}
                {r.servings ? ` · ${t('book.serves', { n: r.servings })}` : ''}
              </span>
            </span>
          </label>
        ) : (
          <RecipeCard recipe={r} />
        )}
      </li>
    ))
  );

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
          {selecting ? t('book.cancel') : t('book.select')}
        </button>
      </div>

      {sections.map((sec) => (
        <section key={sec.key} className={styles.section} aria-label={sec.label ?? undefined}>
          {sec.label && (
            <h2 className={styles.shelf}>
              {sec.label} <span className={styles.shelfCount}>{sec.items.length}</span>
            </h2>
          )}
          <ul className={styles.list}>
            {renderItems(sec.items)}
          </ul>
        </section>
      ))}

      {/* Sticky footer, so the count and the way forward stay reachable without
          scrolling back up a long list. */}
      {selecting && chosen.length > 0 && (
        <div className={styles.sticky}>
          <span className={styles.count}>
            {t('book.selected', { n: chosen.length })}
            {/* The count includes dishes ticked in other categories, which is
                surprising unless the bar says where they are. */}
            {chosenHere < chosen.length && (
              <span className={styles.across}>
                {t('book.here', { n: chosenHere })}
              </span>
            )}
          </span>
          <button
            type="button"
            className={styles.go}
            onClick={() => {
              const ids = chosen.join(',');
              clearBasket();
              /* Cancelling the builder should land back here, not on /menus —
                 abandoning "build a menu from this category" belongs where it began. */
              router.push(`/menus/new?dish=${ids}&returnTo=${encodeURIComponent(window.location.pathname)}`);
            }}
          >
            {t('book.buildMenu')} <Arrow dir="forward" />
          </button>
        </div>
      )}
    </>
  );
}
