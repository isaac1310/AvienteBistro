import Link from 'next/link';
import CategoryPlate from '@/components/CategoryPlate';
import ExportPdfButton from '@/components/ExportPdfButton';
import Arrow from '@/components/Arrow';
import RecipePhoto from '@/components/RecipePhoto';
import { notFound } from 'next/navigation';
import Ingredients from '@/components/Ingredients';
import RecipeHistory from '@/components/RecipeHistory';
import type { CategoryKey } from '@/lib/constants';
import { categoryName } from '@/lib/i18n';
import { currentLang, serverT } from '@/lib/lang';
import { categoryLabel, getRecipe } from '@/lib/queries';
import styles from './recipe.module.css';

type Params = { params: Promise<{ category: string; id: string }> };

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const [recipe, t, lang] = await Promise.all([getRecipe(id), serverT(), currentLang()]);
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
  const [recipe, t, lang] = await Promise.all([getRecipe(id), serverT(), currentLang()]);
  if (!recipe) notFound();

  const cat = categoryLabel(recipe.category);
  const attribution = recipe.source_name
    ? t('recipe.attribution', { name: recipe.source_name })
    : null;

  /* Timing strip: every real recipe has these, and any null part is omitted
     rather than printed as "0 min". */
  const timing = [
    recipe.prep_minutes && t('recipe.prep', { n: recipe.prep_minutes }),
    recipe.cook_minutes && t('recipe.cook', { n: recipe.cook_minutes }),
    recipe.servings
      ? (recipe.servings === 1 ? t('recipe.serving') : t('recipe.servings', { n: recipe.servings }))
      : null,
  ].filter(Boolean) as string[];

  /* Is this a Hebrew recipe? Decided from the title, which is the one field every
     recipe has and the one that is always written in the recipe's own language. */
  const hebrew = /[\u0590-\u05FF]/.test(recipe.title);

  return (
    <article className={styles.page}>
      {recipe.photo_url ? (
        /* Falls back to the plate if the object is missing — see RecipePhoto. One
           recipe in the book has a photo_path pointing at nothing, and the hero is
           where a broken-image icon is largest. */
        <RecipePhoto src={recipe.photo_url} category={recipe.category}
          className={styles.hero} heroPlate />
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
            caption={categoryName(cat, lang)} />
        </Link>
      )}

      <div className={styles.overlay}>
        {/* The overlay chip. Was a bare ←, which points the wrong way in Hebrew. */}
        <Link href={`/recipes/${category}`} className={styles.chip}
          aria-label={t('book.back')}><Arrow /></Link>
        <Link href={`/recipes/${category}/${id}/edit`} className={styles.chip}>{t('recipe.edit')}</Link>
      </div>

      {/* RTL for the whole recipe, not per element.
          Every Hebrew string carried its own lang="he", so the words flipped but the
          PAGE did not: headings stayed hard against the left margin while the text
          under them ran right-to-left, and the ingredient columns read backwards. A
          Hebrew recipe is a right-to-left document; the English chrome around it is
          not, which is why this starts here and not on <html>. */}
      <div className={`shell ${styles.body}`} dir={hebrew ? 'rtl' : 'ltr'}
           lang={hebrew ? 'he' : 'en'}>
        <p className="eyebrow">{categoryName(cat, lang)}</p>
        <h1 className={styles.title} lang="he">{recipe.title}</h1>
        {recipe.title_en && <p className={styles.titleEn}>{recipe.title_en}</p>}
        {/* Whose recipe it is, and how long it has been ours — one block, because
            they answer the same question. Per the design: "Savta Rina's recipe" then
            "in the family since 12/04/89".
            The wording is "in the family", not "in the book": the date is about the
            dish belonging to these people, and the book is only where it is written
            down. */}
        {(attribution || recipe.created_at) && (
          <p className={styles.attribution}>
            {attribution && <span className={styles.attributionLine}>{attribution}</span>}
            {recipe.created_at && (
              <span className={styles.attributionLine}>
                {t('recipe.since', { date: shortDate(recipe.created_at) })}
              </span>
            )}
          </p>
        )}

        {timing.length > 0 && (
          <p className={styles.timing}>{timing.join(' · ')}</p>
        )}

        <Ingredients
          ingredients={recipe.ingredients}
          servings={recipe.servings}
          yieldText={recipe.yield_text}
        />

        <section>
          <h2 className={styles.h2}>{t('recipe.method')}</h2>
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
            <h2 className={styles.h2}>{t('recipe.serve')}</h2>
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
            <h2 className={styles.h2}>{t('recipe.notes')}</h2>
            <blockquote className={styles.story} lang="he">{recipe.story}</blockquote>
          </section>
        )}

        <div className={styles.actions}>
          <Link href={`/menus/new?dish=${id}`} className="btn">{t('recipe.addToMenu')}</Link>
          {/* Two actions, because these were one and it was mislabelled: the button
              said "Export PDF" and opened the print PAGE, downloading nothing. */}
          <a href={`/print/recipe/${id}`} className="btn btn--ghost">{t('common.print')}</a>
          <ExportPdfButton path={`/print/recipe/${id}`} name={`aviente-${id.slice(0, 8)}`}
            className="btn btn--ghost" />
        </div>

        <div className={styles.history}>
          <RecipeHistory recipeId={id} />
        </div>

        {/* Who touched it last, then when — exactly. Two lines, per the design.
            "3 days ago" is what you read at a glance; the dd/mm/yy underneath is what
            settles which of two versions of Savta's recipe came first, and a relative
            date alone can never answer that. */}
        <p className={styles.edited}>
          <span className={styles.editedLine}>
            {recipe.updated_by_name
              ? t('recipe.editedBy', { name: recipe.updated_by_name, ago: timeAgo(recipe.updated_at) })
              : t('recipe.edited', { ago: timeAgo(recipe.updated_at) })}
          </span>
          <span className={styles.editedLine}>
            {t('recipe.lastUpdate', { date: shortDate(recipe.updated_at) })}
          </span>
        </p>
      </div>
    </article>
  );
}
