import { notFound } from 'next/navigation';
import { getRecipe } from '@/lib/queries';
import { scaleAmount } from '@/lib/scale';
import PrintExit from '@/components/PrintExit';
import { serverT } from '@/lib/lang';
import styles from './printrecipe.module.css';

export const metadata = { title: 'Aviente — Recipe', robots: { index: false } };

/* The recipe print sheet (§4). Referenced by the EXPORT PDF button on every
 * recipe, which until now pointed at a route that did not exist.
 *
 * Deliberately plain: one column, no photo, generous leading. This is the sheet
 * you prop against the flour bag, so legibility beats decoration. */
export default async function PrintRecipe({ params }: { params: Promise<{ id: string }> }) {
  const t = await serverT();
  const { id } = await params;
  const recipe = await getRecipe(id).catch(() => null);
  if (!recipe) notFound();

  const timing = [
    recipe.prep_minutes && `PREP ${recipe.prep_minutes} min`,
    recipe.cook_minutes && `COOK ${recipe.cook_minutes} min`,
    recipe.servings ? `${recipe.servings} SERVINGS` : recipe.yield_text,
  ].filter(Boolean) as string[];

  return (
    <main className={styles.sheet}>
      {/* A way back. Only the kids sheet had one, so opening this from the installed
          PWA — which has no browser Back — replaced the app with a dead end. Hidden
          by @media print, so it costs the paper nothing. */}
      <PrintExit href={`/recipes/${recipe.category}/${recipe.id}`}
        label={t('print.backToRecipe')} />
      <header className={styles.head}>
        <p className={styles.eyebrow}>Aviente · The Family Recipe Book</p>
        <h1 className={styles.title} lang="he">{recipe.title}</h1>
        {recipe.title_en && <p className={styles.titleEn}>{recipe.title_en}</p>}
        {recipe.source_name && (
          <p className={styles.credit}>— from the kitchen of {recipe.source_name} —</p>
        )}
        {timing.length > 0 && <p className={styles.timing}>{timing.join(' · ')}</p>}
      </header>

      <section className={styles.cols}>
        <div>
          <h2 className={styles.h2}>{t('recipe.ingredients')}</h2>
          <ul className={styles.ingredients}>
            {recipe.ingredients.map((ing, i) => {
              const amount = scaleAmount(ing, 1);
              const newGroup = ing.group_label && ing.group_label !== recipe.ingredients[i - 1]?.group_label;
              return (
                <li key={ing.id}>
                  {newGroup && <span className={styles.group} lang="he">{ing.group_label}</span>}
                  <span className={styles.amount}>{amount ? amount.text : ''}</span>
                  <span lang="he">{ing.name}</span>
                  {ing.note && <em className={styles.note} lang="he"> · {ing.note}</em>}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h2 className={styles.h2}>{t('recipe.method')}</h2>
          <ol className={styles.steps}>
            {recipe.steps.map((s) => (
              <li key={s.id}>
                {s.heading && <strong lang="he">{s.heading}. </strong>}
                <span lang="he">{s.body}</span>
              </li>
            ))}
          </ol>

          {recipe.story && (
            <p className={styles.story} lang="he">{recipe.story}</p>
          )}
        </div>
      </section>
    </main>
  );
}
