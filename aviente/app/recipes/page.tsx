import Link from 'next/link';
import Nav from '@/components/Nav';
import FillDescriptions from '@/components/FillDescriptions';
import ThemeSwitch from '@/components/ThemeSwitch';
import { CATEGORIES, categoryCounts } from '@/lib/queries';
import { currentMember } from '@/lib/supabase/server';
import styles from './recipes.module.css';

export const metadata = { title: 'Aviente — Recipes' };

/* /recipes is the index the nav points at: every category with its count, plus
 * search. It exists so "Recipes" in the nav has somewhere honest to go rather
 * than jumping into one arbitrary category. */
export default async function RecipesIndex() {
  const [counts, member] = await Promise.all([categoryCounts(), currentMember()]);

  return (
    <>
      <Nav current="/recipes" />
      <div className={styles.frame}>
        <header className={styles.head}>
          <div className="shell">
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
                    <span className={styles.rowEmoji} aria-hidden="true">{c.emoji}</span>
                    <span className={styles.rowName}>{c.en}</span>
                    <span className={styles.rowCount}>{n || '—'}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {/* The free tier takes no automated backups and these recipes exist
              nowhere else, so the export is a first-class link, not a setting. */}
          <div className={styles.settings}>
            <ThemeSwitch current={(member?.theme as 'green' | 'burgundy') ?? 'green'} />
            <FillDescriptions />
          </div>

          <p className={styles.backup}>
            <a href="/api/backup" download>⤓ Download a backup of everything</a>
          </p>
        </main>
      </div>
    </>
  );
}
