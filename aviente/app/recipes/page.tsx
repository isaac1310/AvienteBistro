import Link from 'next/link';
import BackLink from '@/components/BackLink';
import CategoryPlate from '@/components/CategoryPlate';
import Nav from '@/components/Nav';
import PageHeader from '@/components/PageHeader';
import PageTitle from '@/components/PageTitle';
import FillDescriptions from '@/components/FillDescriptions';
import type { CategoryKey } from '@/lib/constants';
import { categoryName } from '@/lib/i18n';
import { currentLang, serverT } from '@/lib/lang';
import { CATEGORIES, categoryCounts } from '@/lib/queries';
import styles from './recipes.module.css';

export const metadata = { title: 'Aviente — Recipes' };

/* /recipes is the index the nav points at: every category with its count, plus
 * search. It exists so "Recipes" in the nav has somewhere honest to go rather
 * than jumping into one arbitrary category. */
export default async function RecipesIndex() {
  const [counts, t, lang] = await Promise.all([categoryCounts(), serverT(), currentLang()]);

  return (
    <>
      <Nav current="/recipes" />
      <div className={styles.frame}>
        {/* The back link sits above the band, not inside the panel: the panel is a
            title card and a navigation control in it reads as part of the name. */}
        <div className={`shell ${styles.backRow}`}>
          <BackLink href="/" label={t('nav.home')} />
        </div>

        <PageHeader>
          <PageTitle eyebrow={t('book.eyebrow')}>{t('book.title')}</PageTitle>
        </PageHeader>

        <main className="shell">
          {/* Search under the band rather than in the panel — it is the page's first
              action, not part of its title. */}
          <form action="/recipes/search" className={styles.search} role="search">
            <input
              type="search" name="q" className={styles.searchField}
              placeholder={t('home.search')}
              aria-label={t('home.search.label')}
            />
          </form>

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
                    <span className={styles.rowName}>{categoryName(c, lang)}</span>
                    {/* "0", not an em dash. A dash in a count column reads as an
                        error or a missing value; zero is the actual answer, and it is
                        the number that tells you this category is worth filling. */}
                    <span className={styles.rowCount}>{n}</span>
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
