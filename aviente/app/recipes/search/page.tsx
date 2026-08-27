import Link from 'next/link';
import Motif from '@/components/Motif';
import Nav from '@/components/Nav';
import RecipeCard from '@/components/RecipeCard';
import { searchRecipes } from '@/lib/queries';
import { serverT } from '@/lib/lang';
import { count } from '@/lib/i18n';
import styles from '../[category]/category.module.css';
import Arrow from '@/components/Arrow';

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
            <Link href="/recipes" className={styles.back}><Arrow /> {t('book.back')}</Link>
            <p className="eyebrow">{t('search.title')}</p>
            <h1 className={styles.h1} lang="he">{query || '—'}</h1>
            <p className={styles.count}>
              {!query
                ? t('search.prompt')
                : count(t, results.length, 'search.results.one', 'search.results.many')}
            </p>
          </div>
        </header>

        <main className="shell">
          {query && results.length === 0 ? (
            <div className={`card ${styles.empty}`}>
              <p className={styles.emptyEmoji} aria-hidden="true">
                <Motif name="search" size={54} strokeWidth={1.6} />
              </p>
              <p className={styles.emptyTitle}>{t('common.noMatch')}</p>
              <p className={styles.emptyBody}>{t('search.noMatchBody')}</p>
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
