'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CategoryPlate from './CategoryPlate';
import { CATEGORIES, type CategoryKey } from '@/lib/constants';
import { categoryName } from '@/lib/i18n';
import { useLang, useT } from './LangProvider';
import styles from './CategoryChips.module.css';

/**
 * Every category, from inside one of them.
 *
 * There was no way to reach another category from a category page: the nav bar goes
 * to the four section roots, so getting from Mains to Soups meant going up to the
 * index and back down. Two taps and a page load to move sideways in a book.
 *
 * A chip row rather than prev/next arrows or a dropdown: with ten categories, arrows
 * make the far end five taps away, and a dropdown hides the destinations behind a tap
 * when the whole point is that they are visible.
 *
 * The current category is a `<span>`, not a link — a link to the page you are on is a
 * dead control that looks live.
 */
export default function CategoryChips({ current }: { current: string }) {
  const t = useT();
  const lang = useLang();
  const params = useSearchParams();

  /* The chosen sort travels with you. Without this, switching category silently reset
     the list to by-name while the control still said "recently added" — the sort
     looking broken when it was only forgotten. `undo` is deliberately dropped: it
     belongs to the delete that just happened here, not to wherever you go next. */
  const keep = new URLSearchParams();
  const sort = params.get('sort');
  if (sort) keep.set('sort', sort);
  const query = keep.toString() ? `?${keep}` : '';

  return (
    /* A LIST, so a screen reader says how many there are and where you are in them,
       and `aria-label` because "10 items" alone does not say what they are. */
    <nav className={styles.wrap} aria-label={t('book.categories')}>
      <ul className={styles.row}>
        {CATEGORIES.map((c) => {
          const here = c.key === current;
          const inner = (
            <>
              <CategoryPlate category={c.key as CategoryKey} size="chip" />
              <span className={styles.name}>{categoryName(c, lang)}</span>
            </>
          );
          return (
            <li key={c.key}>
              {here ? (
                <span className={`${styles.chip} ${styles.on}`} aria-current="page">
                  {inner}
                </span>
              ) : (
                <Link href={`/recipes/${c.key}${query}`} className={styles.chip}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
