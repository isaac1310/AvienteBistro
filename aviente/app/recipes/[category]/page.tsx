import Link from 'next/link';
import { notFound } from 'next/navigation';
import Nav from '@/components/Nav';
import RecipeCard from '@/components/RecipeCard';
import { CATEGORIES, categoryLabel, recipesInCategory } from '@/lib/queries';
import styles from './category.module.css';

type Params = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Params) {
  const { category } = await params;
  return { title: `Aviente — ${categoryLabel(category).fr}` };
}

/* Category browse (§3.2). */
export default async function CategoryPage({ params }: Params) {
  const { category } = await params;
  // An unknown slug is a 404, not an empty list — otherwise a typo looks like an
  // empty category and sends someone hunting for missing recipes.
  if (!CATEGORIES.some((c) => c.key === category)) notFound();

  const cat = categoryLabel(category);
  const recipes = await recipesInCategory(category);

  return (
    <>
      <Nav current="/recipes" />
      <div className={styles.frame}>
        <header className={styles.head}>
          <div className="shell">
            <Link href="/recipes" className={styles.back}>← Le Livre</Link>
            <p className="eyebrow">{cat.emoji} {category}</p>
            <h1 className={styles.h1}>{cat.fr}</h1>
            <p className={styles.count}>
              {recipes.length === 0
                ? 'aucune recette'
                : `${recipes.length} ${recipes.length === 1 ? 'recette' : 'recettes'}`}
            </p>
          </div>
        </header>

        <main className="shell">
          {recipes.length === 0 ? (
            /* Empty state, drawn deliberately (§1). Four of nine categories are
               empty at launch, so this is a screen people will actually see. */
            <div className={`card ${styles.empty}`}>
              <p className={styles.emptyEmoji} aria-hidden="true">{cat.emoji}</p>
              <p className={styles.emptyTitle}>Rien encore ici</p>
              <p className={styles.emptyBody}>
                No {cat.fr.toLowerCase()} in the book yet. Add the first one, or paste
                a recipe from a photo on the import screen.
              </p>
              <Link href="/add" className="btn">＋ Add a recipe</Link>
            </div>
          ) : (
            <ul className={styles.list}>
              {recipes.map((r) => (
                <li key={r.id}><RecipeCard recipe={r} /></li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </>
  );
}
