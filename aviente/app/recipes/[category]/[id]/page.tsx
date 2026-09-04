import Link from 'next/link';
import Nav from '@/components/Nav';
import CategoryPlate from '@/components/CategoryPlate';
import ExportPdfButton from '@/components/ExportPdfButton';
import Arrow from '@/components/Arrow';
import RecipePhoto from '@/components/RecipePhoto';
import { notFound } from 'next/navigation';
import Ingredients from '@/components/Ingredients';
import CookMode from '@/components/CookMode';
import RecipeHistory from '@/components/RecipeHistory';
import { CATEGORIES, type CategoryKey } from '@/lib/constants';
import { categoryName } from '@/lib/i18n';
import { currentLang, serverT } from '@/lib/lang';
import { categoryLabel, getRecipe } from '@/lib/queries';
import styles from './recipe.module.css';

type Params = {
  params: Promise<{ category: string; id: string }>;
  searchParams?: Promise<{ movedFrom?: string }>;
};

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  /* The title is the recipe's own, in its own language, so no translator is needed.
     This awaited serverT() and currentLang() and used neither — two extra calls per
     page render, caught by lint rather than by anyone reading it. */
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

/**
 * "8 days ago", in the reader's language.
 *
 * Returned hardcoded English on a Hebrew-first page — at the foot of every recipe —
 * while `time.daysAgo` and its siblings already sat in the dictionary, added for the
 * revisions sheet and then not used here. `t` is passed in because this is a server
 * component's helper and reads the clock, so it cannot be a hook.
 */
function timeAgo(iso: string, t: Awaited<ReturnType<typeof serverT>>): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t('time.justNow');
  if (mins < 60) return t('time.minsAgo', { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? t('time.hourAgo') : t('time.hoursAgo', { n: hours });
  const days = Math.round(hours / 24);
  if (days < 31) return days === 1 ? t('time.dayAgo') : t('time.daysAgo', { n: days });
  const months = Math.round(days / 30);
  return months === 1 ? t('time.monthAgo') : t('time.monthsAgo', { n: months });
}

/* Recipe view (§3.3). */
export default async function RecipePage({ params, searchParams }: Params) {
  const { category, id } = await params;
  const { movedFrom } = (await searchParams) ?? {};
  const [recipe, t, lang] = await Promise.all([getRecipe(id), serverT(), currentLang()]);
  if (!recipe) notFound();

  const cat = categoryLabel(recipe.category);
  /* ?movedFrom= is set by the edit form after refiling a recipe: the reader lands
     on the SAVED recipe, and this banner names the new category and offers the old
     one — the batch-tidy flow that used to be served by landing on the old list.
     Validated against the real category set: it becomes a link. */
  const movedCat = movedFrom && movedFrom !== recipe.category
    && CATEGORIES.some((c) => c.key === movedFrom)
    ? (movedFrom as CategoryKey) : null;
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

  /* The method, rendered once and shown twice: in the page, and inside cooking mode. */
  const method = (
    <>
      <h2 className={styles.h2}>{t('recipe.method')}</h2>
      <ol className={styles.steps}>
        {recipe.steps.map((s) => (
          <li key={s.id} className={styles.step}>
            {/* dir="auto" is the fix for a real, printed bug. `lang="he"` picks the FONT and
                says nothing about bidi, so a paragraph that begins or ends with a
                digit or a Latin word resolved against the page's base direction:
                real examples from \u05D0\u05E1\u05D0\u05D3\u05D5 \u05D1\u05D9\u05D9\u05DF were "\u2026\u05D5\u05E9\u05D5\u05E4\u05DB\u05D9\u05DD \u05D0\u05EA \u05D4\u05E8\u05D5\u05D8\u05D1 \u05DE\u05E2\u05DC ." with
                the full stop stranded at the left, and "\u05E2\u05DD \u05D4\u05D0\u05E1\u05D0\u05D3\u05D5( \u2026 \u05DE\u05D5\u05E9\u05E8\u05D4)" with
                the parentheses reversed. The same text printed the same way, so
                the sheet on the counter was wrong too. Only the text itself knows
                which way it runs \u2014 which is what "auto" asks. */}
            {s.heading && (
              <strong className={styles.stepHead} lang="he" dir="auto">{s.heading}</strong>
            )}
            <span lang="he" dir="auto">{s.body}</span>
          </li>
        ))}
      </ol>
    </>
  );

  return (
    <>
      {/* The navigation was absent from this page entirely: a full-bleed hero, the
          sidebar gone, and the only way out a small arrow floating over a photograph
          whose contrast depends on whatever is behind it. The hero still runs
          full-bleed — Nav is a fixed bottom bar on a phone and a sidebar on desktop,
          so it costs the hero nothing. */}
      <Nav current="/recipes" />
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
           The whole plate is a link to the edit form, which turns the commonest
           state in this book into the one action it is asking for. It carries the
           category name and nothing else: the "PL. IV — PLATS · NO PHOTO YET" line
           belonged to the /brand series sheet, and here it was a catalogue number
           nobody asked for above a sentence stating the obvious. */
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
        {movedCat && (
          <p className={styles.moved} role="status">
            {t('recipe.movedTo', { category: categoryName(cat, lang) })}
            {' · '}
            <Link href={`/recipes/${movedCat}`}>{t('recipe.backToPrevious')}</Link>
          </p>
        )}
        <p className="eyebrow">{categoryName(cat, lang)}</p>
        <h1 className={styles.title} lang="he" dir="auto">{recipe.title}</h1>
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

        {/* What you can DO with this recipe, at the top.
            These were at the very bottom, under the notes and the revision list — so
            "add this to Friday" meant scrolling past every ingredient and step of a
            recipe you had just opened, and on a long one that is a lot of scrolling to
            reach the thing you came for. Above the timing strip, because the actions
            belong to the recipe's identity rather than to its instructions. */}
        <div className={styles.actions}>
          <Link href={`/menus/new?dish=${id}&returnTo=${encodeURIComponent(`/recipes/${recipe.category}/${id}`)}`} className="btn">{t('recipe.addToMenu')}</Link>
          {/* Two actions, because these were one and it was mislabelled: the button
              said "Export PDF" and opened the print PAGE, downloading nothing. */}
          <a href={`/print/recipe/${id}`} className="btn btn--ghost">{t('common.print')}</a>
          {/* Cooking mode: the sheet, held awake, with ticks. Replaced a keep-awake
              button here and an always-on checklist below. The two blocks it shows
              are rendered right here on the server and handed in, so the mode is
              the same recipe, not a second copy of it. */}
          <CookMode
            recipeId={recipe.id}
            title={recipe.title}
            ingredients={
              <Ingredients
                ticks
                recipeId={recipe.id}
                ingredients={recipe.ingredients}
                servings={recipe.servings}
                yieldText={recipe.yield_text}
              />
            }
            method={method}
          />
          <ExportPdfButton path={`/print/recipe/${id}`} name={`aviente-${id.slice(0, 8)}`}
            className="btn btn--ghost" />
        </div>

        {timing.length > 0 && (
          <p className={styles.timing}>{timing.join(' · ')}</p>
        )}

        <Ingredients
          className={styles.ingredientsCol}
          ingredients={recipe.ingredients}
          servings={recipe.servings}
          yieldText={recipe.yield_text}
        />

        {/* Named, not positional. The two-column layout above 900px used to pair
            `.body > section:nth-of-type(1|2)`, so adding any section above the
            ingredients would have silently swapped the columns. */}
        <section className={styles.methodCol}>{method}</section>

        {recipe.serving_suggestions && (
          <section className={styles.serve}>
            <h2 className={styles.h2}>{t('recipe.serve')}</h2>
            {/* Stored as newline-joined text; each line is its own suggestion. */}
            <ul className={styles.serveList}>
              {recipe.serving_suggestions.split('\n').filter(Boolean).map((line: string, i: number) => (
                <li key={i} lang="he" dir="auto">{line}</li>
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
            <blockquote className={styles.story} lang="he" dir="auto">{recipe.story}</blockquote>
          </section>
        )}

        {/* The actions moved to the TOP — see the block under the eyebrow. What is
            left down here is the record of the recipe rather than anything you can do
            to it: earlier versions, and who touched it last. */}
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
              ? t('recipe.editedBy', { name: recipe.updated_by_name, ago: timeAgo(recipe.updated_at, t) })
              : t('recipe.edited', { ago: timeAgo(recipe.updated_at, t) })}
          </span>
          <span className={styles.editedLine}>
            {t('recipe.lastUpdate', { date: shortDate(recipe.updated_at) })}
          </span>
        </p>
      </div>
    </article>
    </>
  );
}
