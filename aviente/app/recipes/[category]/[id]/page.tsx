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
/**
 * dd/mm/yy — the format Itzik asked for, and the one that is unambiguous here.
 *
 * Not toLocaleDateString: that follows the SERVER's locale, which on Vercel is
 * en-US, so a recipe added on the fourth of August would print 8/4 and read as the
 * eighth of April to everyone who will ever use this app. Built by hand from the
 * parts so the order cannot drift with a deploy region.
 */
function shortDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${p(d.getFullYear() % 100)}`;
}

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

  /* Is this a Hebrew recipe? Decided from the title, which is the one field every
     recipe has and the one that is always written in the recipe's own language. */
  const hebrew = /[\u0590-\u05FF]/.test(recipe.title);

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

      {/* RTL for the whole recipe, not per element.
          Every Hebrew string carried its own lang="he", so the words flipped but the
          PAGE did not: headings stayed hard against the left margin while the text
          under them ran right-to-left, and the ingredient columns read backwards. A
          Hebrew recipe is a right-to-left document; the English chrome around it is
          not, which is why this starts here and not on <html>. */}
      <div className={`shell ${styles.body}`} dir={hebrew ? 'rtl' : 'ltr'}
           lang={hebrew ? 'he' : 'en'}>
        <p className="eyebrow">{cat.en}</p>
        <h1 className={styles.title} lang="he">{recipe.title}</h1>
        {recipe.title_en && <p className={styles.titleEn}>{recipe.title_en}</p>}
        {attribution && <p className={styles.attribution}>{attribution}</p>}

        {timing.length > 0 && (
          <p className={styles.timing}>{timing.join(' · ')}</p>
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

        {/* Notes last. This sat between the timing line and the ingredients, which
            put a paragraph of reminiscence between someone and the thing they opened
            the page to read. A note is what you read AFTER cooking it, or once. */}
        {recipe.story && (
          <section className={styles.notes}>
            <h2 className={styles.h2}>Notes</h2>
            <blockquote className={styles.story} lang="he">{recipe.story}</blockquote>
          </section>
        )}

        <div className={styles.actions}>
          <Link href={`/menus/new?dish=${id}`} className="btn">Add to menu</Link>
          <a href={`/print/recipe/${id}`} className="btn btn--ghost">Export PDF</a>
        </div>

        <div className={styles.history}>
          <RecipeHistory recipeId={id} />
        </div>

        {/* Two facts, both wanted: when it joined the book, and when it last
            changed. The exact date sits beside the relative one — "3 days ago" is
            what you read at a glance, dd/mm/yy is what you need when the question is
            which of two versions of Savta's recipe came first. */}
        <p className={styles.edited}>
          {recipe.created_at && (
            <span className={styles.editedLine}>
              in the book since {shortDate(recipe.created_at)}
            </span>
          )}
          <span className={styles.editedLine}>
            {recipe.updated_by_name
              ? `last edited by ${recipe.updated_by_name} · ${shortDate(recipe.updated_at)}`
              : `last edited ${shortDate(recipe.updated_at)}`}
            {' · '}{timeAgo(recipe.updated_at)}
          </span>
        </p>
      </div>
    </article>
  );
}
