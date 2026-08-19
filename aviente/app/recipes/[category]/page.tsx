import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CategoryPlate from '@/components/CategoryPlate';
import Nav from '@/components/Nav';
import { categoryName } from '@/lib/i18n';
import { currentLang, serverT } from '@/lib/lang';
import type { CategoryKey } from '@/lib/constants';
import SelectableList from '@/components/SelectableList';
import UndoToast from '@/components/UndoToast';
import { CATEGORIES, categoryLabel, recipesInCategory } from '@/lib/queries';
import styles from './category.module.css';

type Params = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Params) {
  const { category } = await params;
  return { title: `Aviente — ${categoryLabel(category).en}` };
}

/* Category browse (§3.2). */
export default async function CategoryPage({ params }: Params) {
  const { category } = await params;
  // An unknown slug is a 404, not an empty list — otherwise a typo looks like an
  // empty category and sends someone hunting for missing recipes.
  if (!CATEGORIES.some((c) => c.key === category)) notFound();

  const cat = categoryLabel(category);
  const [t, lang] = await Promise.all([serverT(), currentLang()]);
  const recipes = await recipesInCategory(category);

  return (
    <>
      <Nav current="/recipes" />
      <Suspense fallback={null}><UndoToast /></Suspense>
      <div className={styles.frame}>
        <header className={styles.head}>
          <div className="shell">
            <Link href="/recipes" className={styles.back}>{t('book.back')}</Link>
            {/* The category's own plate above its name. This was the category emoji —
                the last of them in the recipe pages, sitting directly above a list of
                cards that all use the drawn plates, so one header contradicted every
                row under it. */}
            <span className={styles.headPlate}>
              <CategoryPlate category={category as CategoryKey} size="row" />
            </span>
            {/* The Hebrew name, not the URL key. This printed `{category}` — the
                slug — which read "ENTREES" above a heading that says "Starters".
                It matched only by luck on the categories whose key and label are the
                same word. The Hebrew name is the one thing the eyebrow can say that
                the h1 does not. */}
            {/* The OTHER language's name, as a subtitle: the h1 already says it in
                the reader's own. In Hebrew that is the English name, and vice versa —
                which is genuinely useful in a bilingual household. */}
            <p className="eyebrow" lang={lang === 'he' ? 'en' : 'he'}>
              {lang === 'he' ? cat.en : cat.he}
            </p>
            <h1 className={styles.h1}>{categoryName(cat, lang)}</h1>
            <p className={styles.count}>
              {recipes.length === 0
                ? 'no recipes yet'
                : `${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'}`}
            </p>
          </div>
        </header>

        <main className="shell">
          {recipes.length === 0 ? (
            /* Empty state, drawn deliberately (§1). Four of nine categories are
               empty at launch, so this is a screen people will actually see. */
            <div className={`card ${styles.empty}`}>
              {/* No caption here. The hero caption ends "NO PHOTO YET", which is true
                  of a recipe without a photograph and nonsense about a category with
                  no recipes at all — it read as though the app had lost a picture. */}
              <CategoryPlate category={category as CategoryKey} size="row" />
              <p className={styles.emptyTitle}>Nothing here yet</p>
              <p className={styles.emptyBody}>
                No {cat.en.toLowerCase()} in the book yet. Add the first one, or paste
                a recipe from a photo on the import screen.
              </p>
              <Link href="/add" className="btn">＋ Add a recipe</Link>
            </div>
          ) : (
            <SelectableList recipes={recipes} />
          )}
        </main>
      </div>
    </>
  );
}
