import Link from 'next/link';
import Nav from '@/components/Nav';
import { CATEGORIES, categoryCounts } from '@/lib/queries';
import styles from './recipes.module.css';

export const metadata = { title: 'Aviente — Recettes' };

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
            <p className="eyebrow">Le Livre</p>
            <h1 className={styles.h1}>Recettes</h1>
            <form action="/recipes/search" className={styles.search} role="search">
              <input
                type="search" name="q" className={styles.searchField}
                placeholder="Chercher un plat, un ingrédient…"
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
                    <span className={styles.rowEmoji} aria-hidden="true">{c.emoji}</span>
                    <span className={styles.rowName}>{c.fr}</span>
                    <span className={styles.rowCount}>{n || '—'}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {/* The free tier takes no automated backups and these recipes exist
              nowhere else, so the export is a first-class link, not a setting. */}
          <p className={styles.backup}>
            <a href="/api/backup" download>⤓ Download a backup of everything</a>
          </p>
        </main>
      </div>
    </>
  );
}
