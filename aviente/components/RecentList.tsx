import Link from 'next/link';
import CategoryPlate from './CategoryPlate';
import RecipePhoto from './RecipePhoto';
import type { CategoryKey, RecipeSummary } from '@/lib/constants';
import type { T } from '@/lib/i18n';
import { timeAgo } from '@/lib/dates';
import styles from './RecentList.module.css';

/**
 * "Recently added" — the newest recipes, under the home page's search box.
 *
 * A SERVER component (links only), so `timeAgo(iso, t)` runs here with the request's
 * clock and translator. Three rows, below the four action cards (moved there in
 * v11.6.0: under the search it pushed the cards off the Ultra's first screen). The
 * foot link opens everything, newest first.
 */
export default function RecentList({ recipes, t }: { recipes: RecipeSummary[]; t: T }) {
  if (recipes.length < 2) return null;
  return (
    <section className={styles.wrap} aria-labelledby="recent-title">
      <h2 id="recent-title" className={styles.h2}>{t('home.recent')}</h2>
      <ul className={styles.list}>
        {recipes.map((r) => (
          <li key={r.id}>
            <Link href={`/recipes/${r.category}/${r.id}`} className={styles.row}>
              <span className={styles.thumb} aria-hidden="true">
                {r.photo_url
                  ? <RecipePhoto src={r.photo_url} category={r.category} className={styles.img} />
                  : <CategoryPlate category={r.category as CategoryKey} size="row" />}
              </span>
              <span className={styles.text}>
                <span className={styles.title} lang="he" dir="auto">{r.title}</span>
                <span className={styles.meta}>
                  {r.source_name && <>{t('book.whose', { name: r.source_name })} · </>}
                  {r.created_at && t('recent.added', { ago: timeAgo(r.created_at, t) })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className={styles.all}>
        <Link href="/recipes/recent">{t('home.recentAll')}</Link>
      </p>
    </section>
  );
}
