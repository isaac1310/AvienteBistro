import Link from 'next/link';
import BackLink from '@/components/BackLink';
import CategoryPlate from '@/components/CategoryPlate';
import Nav from '@/components/Nav';
import FillDescriptions from '@/components/FillDescriptions';
import type { CategoryKey } from '@/lib/constants';
import { CATEGORIES, categoryCounts } from '@/lib/queries';
import styles from './recipes.module.css';

export const metadata = { title: 'Aviente — Recipes' };

/* /recipes is the index the nav points at: every category with its count, plus
 * search. It exists so "Recipes" in the nav has somewhere honest to go rather
 * than jumping into one arbitrary category. */
export default async function RecipesIndex() {
  const counts = await categoryCounts();

  return (
    <>
      <Nav current="/recipes" />
      <div className={styles.frame}>
        <header className={styles.head}>
          <div className="shell">
            <BackLink href="/" label="Home" />
            <p className="eyebrow">The Book</p>
            <h1 className={styles.h1}>Recipes</h1>
            <form action="/recipes/search" className={styles.search} role="search">
              <input
                type="search" name="q" className={styles.searchField}
                placeholder="Search a dish or an ingredient…"
                aria-label="Search recipes"
              />
            </form>
          </div>
        </header>

        <main className="shell">
          <ul className={styles.list}>
            {CATEGORIES.map((c) => {
              const n = counts[c.key] ?? 0;
              return (
                <li key={c.key}>
                  <Link href={`/recipes/${c.key}`} className={`card ${styles.row}`}>
                    {/* The category's own plate, at row size. This was the category
                        emoji — the last emoji left in the app after the icons and the
                        blueprints, and the one place where the two vocabularies sat
                        in the same list. */}
                    <CategoryPlate category={c.key as CategoryKey} size="row" />
                    <span className={styles.rowName}>{c.en}</span>
                    <span className={styles.rowCount}>{n || '—'}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {/* Colour moved to the homepage's Settings block — a colour picker filed
              under "Recipes" is something you find once, by accident. This is the
              one maintenance job that genuinely belongs beside the recipe list. */}
          <div className={styles.settings}>
            <FillDescriptions />
          </div>
        </main>
      </div>
    </>
  );
}
