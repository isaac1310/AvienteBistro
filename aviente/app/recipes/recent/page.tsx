import Link from 'next/link';
import Arrow from '@/components/Arrow';
import Nav from '@/components/Nav';
import RecipeCard from '@/components/RecipeCard';
import { count } from '@/lib/i18n';
import { serverT } from '@/lib/lang';
import { recentRecipes } from '@/lib/queries';
import styles from '../[category]/category.module.css';

export const metadata = { title: 'Aviente — Recently added' };

/* Every recipe, newest first, across categories — the "all" behind the home page's
 * five. Static segment, so it wins over /recipes/[category]; no category is named
 * "recent". Reuses the category layout like the search page does. */
export default async function RecentPage() {
  const [recipes, t] = await Promise.all([recentRecipes(500), serverT()]);
  return (
    <>
      <Nav current="/recipes" />
      <div className={styles.frame}>
        <header className={styles.head}>
          <div className="shell">
            <Link href="/" className={styles.back}><Arrow /> {t('nav.home')}</Link>
            <p className="eyebrow">{t('book.eyebrow')}</p>
            <h1 className={styles.h1}>{t('recent.title')}</h1>
            <p className={styles.count}>
              {count(t, recipes.length, 'book.count.one', 'book.count.many')}
            </p>
          </div>
        </header>
        <main className="shell">
          <ul className={styles.list}>
            {recipes.map((r) => <li key={r.id}><RecipeCard recipe={r} /></li>)}
          </ul>
        </main>
      </div>
    </>
  );
}
