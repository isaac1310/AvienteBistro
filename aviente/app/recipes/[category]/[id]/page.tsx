import Link from 'next/link';
import CategoryPlate from '@/components/CategoryPlate';
import { notFound } from 'next/navigation';
import Ingredients from '@/components/Ingredients';
import RecipeHistory from '@/components/RecipeHistory';
import type { CategoryKey } from '@/lib/constants';
import { categoryLabel, getRecipe } from '@/lib/queries';
import styles from './recipe.module.css';

type Params = { params: Promise<{ category: string; id: string }> };

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  return { title: recipe ? `Aviente — ${recipe.title}` : 'Aviente' };
}

/** "3 days ago" without pulling in a date library for one string. */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
}

/* Recipe view (§3.3). */
export default async function RecipePage({ params }: Params) {
  const { category, id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const cat = categoryLabel(recipe.category);
  const attribution = recipe.source_name ? `${recipe.source_name}'s recipe` : null;

  /* Timing strip: every real recipe has these, and any null part is omitted
     rather than printed as "0 min". */
  const timing = [
    recipe.prep_minutes && `PREP ${recipe.prep_minutes} min`,
    recipe.cook_minutes && `COOK ${recipe.cook_minutes} min`,
    recipe.servings
      ? `${recipe.servings} ${recipe.servings === 1 ? 'SERVING' : 'SERVINGS'}`
      : null,
  ].filter(Boolean) as string[];

  return (
    <article className={styles.page}>
      {recipe.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs
        <img src={recipe.photo_url} alt="" className={styles.hero} />
      ) : (
        /* The blueprint plate for this category, at hero size, with its caption.
           This slot still had the old emoji-on-a-tinted-block placeholder: the new
           plates reached the list cards and stopped there, so the one screen with
           room for the drawing was the one screen not showing it.
           The caption ends "NO PHOTO YET" and the whole plate is a link to the edit
           form, which turns the commonest state in this book into the one action it
           is asking for. */
        <Link href={`/recipes/${category}/${id}/edit`} className={styles.heroPlate}>
          <CategoryPlate category={recipe.category as CategoryKey} size="hero"
            caption={cat.en} />
        </Link>
      )}

      <div className={styles.overlay}>
        <Link href={`/recipes/${category}`} className={styles.chip}>←</Link>
        <Link href={`/recipes/${category}/${id}/edit`} className={styles.chip}>Edit</Link>
      </div>

      <div className={`shell ${styles.body}`}>
        <p className="eyebrow">{cat.en}</p>
        <h1 className={styles.title} lang="he">{recipe.title}</h1>
        {recipe.title_en && <p className={styles.titleEn}>{recipe.title_en}</p>}
        {attribution && <p className={styles.attribution}>{attribution}</p>}

        {timing.length > 0 && (
          <p className={styles.timing}>{timing.join(' · ')}</p>
        )}

        {recipe.story && (
          <blockquote className={styles.story} lang="he">{recipe.story}</blockquote>
        )}

        <Ingredients
          ingredients={recipe.ingredients}
          servings={recipe.servings}
          yieldText={recipe.yield_text}
        />

        <section>
          <h2 className={styles.h2}>Method</h2>
          <ol className={styles.steps}>
            {recipe.steps.map((s) => (
              <li key={s.id} className={styles.step}>
                {s.heading && <strong className={styles.stepHead} lang="he">{s.heading}</strong>}
                <span lang="he">{s.body}</span>
              </li>
            ))}
          </ol>
        </section>

        {recipe.serving_suggestions && (
          <section className={styles.serve}>
            <h2 className={styles.h2}>To Serve</h2>
            {/* Stored as newline-joined text; each line is its own suggestion. */}
            <ul className={styles.serveList}>
              {recipe.serving_suggestions.split('\n').filter(Boolean).map((line: string, i: number) => (
                <li key={i} lang="he">{line}</li>
              ))}
            </ul>
          </section>
        )}

        <div className={styles.actions}>
          <Link href={`/menus/new?dish=${id}`} className="btn">Add to menu</Link>
          <a href={`/print/recipe/${id}`} className="btn btn--ghost">Export PDF</a>
        </div>

        <div className={styles.history}>
          <RecipeHistory recipeId={id} />
        </div>

        <p className={styles.edited}>
          {recipe.updated_by_name
            ? `last edited by ${recipe.updated_by_name} · ${timeAgo(recipe.updated_at)}`
            : `added ${timeAgo(recipe.updated_at)}`}
        </p>
      </div>
    </article>
  );
}
