import Link from 'next/link';
import Nav from '@/components/Nav';
import RecipeCard from '@/components/RecipeCard';
import { searchRecipes } from '@/lib/queries';
import { serverT } from '@/lib/lang';
import styles from '../[category]/category.module.css';

export const metadata = { title: 'Aviente — Search' };

/* Search results (§5.1). The design file has no such screen, so it reuses the
 * category layout — same card list, same empty-state treatment. */
export default async function SearchPage({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const t = await serverT();
  const { q = '' } = await searchParams;
  const query = q.trim();
  const results = query ? await searchRecipes(query) : [];

  return (
    <>
      <Nav current="/recipes" />
      <div className={styles.frame}>
        <header className={styles.head}>
          <div className="shell">
            <Link href="/recipes" className={styles.back}>← The Book</Link>
            <p className="eyebrow">{t('search.title')}</p>
            <h1 className={styles.h1} lang="he">{query || '—'}</h1>
            <p className={styles.count}>
              {!query ? 'type something to search'
                : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
            </p>
          </div>
        </header>

        <main className="shell">
          {query && results.length === 0 ? (
            <div className={`card ${styles.empty}`}>
              <p className={styles.emptyEmoji} aria-hidden="true">🔍</p>
              <p className={styles.emptyTitle}>{t('common.noMatch')}</p>
              <p className={styles.emptyBody}>
                Search covers dish names and ingredients, in Hebrew or English —
                not the written steps. Try a single ingredient, like תבלין or flour.
              </p>
              <Link href="/recipes" className="btn btn--ghost">{t('common.browse')}</Link>
            </div>
          ) : (
            <ul className={styles.list}>
              {results.map((r) => (
                <li key={r.id}><RecipeCard recipe={r} /></li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </>
  );
}
