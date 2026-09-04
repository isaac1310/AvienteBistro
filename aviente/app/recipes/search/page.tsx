import Link from 'next/link';
import Motif from '@/components/Motif';
import Nav from '@/components/Nav';
import RecipeCard from '@/components/RecipeCard';
import SearchFilters from '@/components/SearchFilters';
import { CATEGORIES } from '@/lib/constants';
import { MAX_MINUTES } from '@/lib/constants';
import { memberNames, searchRecipes } from '@/lib/queries';
import { serverT } from '@/lib/lang';
import { count } from '@/lib/i18n';
import styles from '../[category]/category.module.css';
import own from './search.module.css';
import Arrow from '@/components/Arrow';

export const metadata = { title: 'Aviente — Search' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Search results (§5.1). The design file has no such screen, so it reuses the
 * category layout — same card list, same empty-state treatment.
 *
 * The input is ON this page now (it was only on the home page and the recipes index,
 * so revising a query meant going back), and three filters narrow the result. Every
 * URL value is validated against a closed set before it reaches a query: a category
 * must be a real key, a chef a uuid, a time one of MAX_MINUTES — anything else is
 * silently "no filter", the same posture as the category page's sort. */
export default async function SearchPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; cat?: string; chef?: string; max?: string }> }) {
  const t = await serverT();
  const { q = '', cat, chef, max } = await searchParams;
  const query = q.trim();

  const category = cat && CATEGORIES.some((c) => c.key === cat) ? cat : null;
  const source = chef && UUID.test(chef) ? chef : null;
  const maxN = Number(max);
  const maxMinutes = (MAX_MINUTES as readonly number[]).includes(maxN) ? maxN : null;

  const [results, members] = await Promise.all([
    query ? searchRecipes(query, { category, source, maxMinutes }) : Promise.resolve([]),
    memberNames(),
  ]);

  return (
    <>
      <Nav current="/recipes" />
      <div className={styles.frame}>
        <header className={styles.head}>
          <div className="shell">
            <Link href="/recipes" className={styles.back}><Arrow /> {t('book.back')}</Link>
            <p className="eyebrow">{t('search.title')}</p>
            {/* An empty search shows the label below, not a dash as a heading. */}
            <h1 className={styles.h1} lang="he" dir="auto">{query || t('search.title')}</h1>

            {/* The field, with a real button: the home page's field relied on the
                keyboard's Enter, which is fine there and not here, where the job is
                to revise. Filters travel as hidden inputs so re-searching keeps them. */}
            <form action="/recipes/search" className={own.form} role="search">
              <input
                type="search" name="q" defaultValue={query} className={own.field}
                placeholder={t('home.search')} aria-label={t('home.search.label')}
                lang="he" dir="auto"
              />
              {category && <input type="hidden" name="cat" value={category} />}
              {source && <input type="hidden" name="chef" value={source} />}
              {maxMinutes && <input type="hidden" name="max" value={maxMinutes} />}
              <button type="submit" className="btn">{t('search.go')}</button>
            </form>

            <SearchFilters members={members} category={category} chef={source} max={maxMinutes} />

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
