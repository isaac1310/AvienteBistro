import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CategoryChips from '@/components/CategoryChips';
import CategoryPlate from '@/components/CategoryPlate';
import Nav from '@/components/Nav';
import PageHeader from '@/components/PageHeader';
import PageTitle from '@/components/PageTitle';
import { categoryName } from '@/lib/i18n';
import { currentLang, serverT } from '@/lib/lang';
import type { CategoryKey } from '@/lib/constants';
import SelectableList from '@/components/SelectableList';
import UndoToast from '@/components/UndoToast';
import SortSelect from '@/components/SortSelect';
import { CATEGORIES, categoryLabel, isSortKey, recipesInCategory } from '@/lib/queries';
import styles from './category.module.css';
import Arrow from '@/components/Arrow';

type Params = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export async function generateMetadata({ params }: Params) {
  const { category } = await params;
  return { title: `Aviente — ${categoryLabel(category).en}` };
}

/* Category browse (§3.2). */
export default async function CategoryPage({ params, searchParams }: Params) {
  const { category } = await params;
  const { sort } = await searchParams;
  // An unknown slug is a 404, not an empty list — otherwise a typo looks like an
  // empty category and sends someone hunting for missing recipes.
  if (!CATEGORIES.some((c) => c.key === category)) notFound();

  const cat = categoryLabel(category);
  const [t, lang] = await Promise.all([serverT(), currentLang()]);
  /* An unrecognised ?sort= falls back to the default rather than erroring. A stale
     bookmark is not worth a 500, and the guard is also what keeps a hand-typed value
     out of an .order() call. */
  const order = isSortKey(sort) ? sort : 'title';
  const recipes = await recipesInCategory(category, order);

  return (
    <>
      <Nav current="/recipes" />
      <Suspense fallback={null}><UndoToast /></Suspense>
      <div className={styles.frame}>
        <div className={`shell ${styles.backRow}`}>
          <Link href="/recipes" className={styles.back}><Arrow /> {t('book.back')}</Link>
        </div>

        <PageHeader>
          {/* The category's own plate above its name, inside the title panel — it is
              part of what the page is called. */}
          <span className={styles.headPlate}>
            <CategoryPlate category={category as CategoryKey} size="row" />
          </span>
          {/* The eyebrow carries the OTHER language's name: the title already says it
              in the reader's own, and in a bilingual house the second name is
              genuinely useful rather than decorative. */}
          <PageTitle eyebrow={lang === 'he' ? cat.en : cat.he}>
            {categoryName(cat, lang)}
          </PageTitle>
        </PageHeader>

        {/* Sideways in the book. Below the header so the page still announces itself
            first, and above the count so the chips are the first thing the thumb
            reaches when scrolling up from the list. */}
        <div className={`shell ${styles.chipRow}`}>
          <CategoryChips current={category} />
        </div>

        <div className={`shell ${styles.countRow}`}>
          <p className={styles.count}>
              {recipes.length === 0
                ? t('book.noRecipes')
                : recipes.length === 1
                  ? t('book.count.one')
                  : t('book.count.many', { n: recipes.length })}
            </p>
          {/* Only when there is something to order. One recipe sorted three ways is
              one recipe, and the control would be furniture. */}
          {recipes.length > 1 && <SortSelect value={order} />}
        </div>

        <main className="shell">
          {recipes.length === 0 ? (
            /* Empty state, drawn deliberately (§1). Four of nine categories are
               empty at launch, so this is a screen people will actually see. */
            <div className={`card ${styles.empty}`}>
              {/* No caption here. The hero caption ends "NO PHOTO YET", which is true
                  of a recipe without a photograph and nonsense about a category with
                  no recipes at all — it read as though the app had lost a picture. */}
              <CategoryPlate category={category as CategoryKey} size="row" />
              <p className={styles.emptyTitle}>{t('book.empty')}</p>
              <p className={styles.emptyBody}>
                {t('book.emptyBody', { category: categoryName(cat, lang) })}
              </p>
              <Link href="/add" className="btn">{t('book.add')}</Link>
            </div>
          ) : (
            <SelectableList recipes={recipes} />
          )}
        </main>
      </div>
    </>
  );
}
