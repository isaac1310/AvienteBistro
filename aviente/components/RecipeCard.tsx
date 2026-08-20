import Link from 'next/link';
import CategoryPlate from './CategoryPlate';
import RecipeCardActions from './RecipeCardActions';
import RecipePhoto from './RecipePhoto';
import { type CategoryKey, type RecipeSummary } from '@/lib/constants';
import styles from './RecipeCard.module.css';

/**
 * One recipe in a list.
 *
 * The whole card used to be a single `<Link>`, which is why the edit and delete
 * actions could not simply be added to it: a `<button>` inside an `<a>` is invalid
 * HTML, and browsers resolve it by navigating instead of acting — the delete would
 * have opened the recipe. So the card is a container now, the plate and the title
 * carry the link, and the actions sit outside it as siblings.
 *
 * The cost of that change is honest and worth stating: the dead space between the
 * title and the actions is no longer clickable. The link still covers the plate and
 * the whole text block, which is the entire left-to-right run of anything readable.
 *
 * The attribution line reads "Savta's · serves 8", falling back to the yield text
 * when there is no portion count — the ginger concentrate would otherwise read
 * "serves null".
 */
export default function RecipeCard({
  recipe, actions = true,
}: {
  recipe: RecipeSummary;
  /** Off in select mode, where the card is a checkbox and editing is not the job. */
  actions?: boolean;
}) {
  const portion = recipe.servings
    ? `serves ${recipe.servings}`
    : recipe.yield_text ?? null;
  const attribution = [recipe.source_name && `${recipe.source_name}'s`, portion]
    .filter(Boolean).join(' · ');
  const href = `/recipes/${recipe.category}/${recipe.id}`;

  return (
    <div className={`card ${styles.card}`}>
      <Link href={href} className={styles.link}>
        {recipe.photo_url ? (
          <RecipePhoto src={recipe.photo_url} category={recipe.category}
            className={styles.thumb} />
        ) : (
          /* Most of the book has no photograph, so this is the ordinary case, not a
             fallback — an engraved plate per category rather than an emoji. */
          <CategoryPlate category={recipe.category as CategoryKey} />
        )}
        <span className={styles.body}>
          <span className={styles.title} lang="he">{recipe.title}</span>
          {recipe.title_en && <span className={styles.titleEn}>{recipe.title_en}</span>}
          {attribution && <span className={styles.meta}>{attribution}</span>}
        </span>
      </Link>

      {actions && (
        <RecipeCardActions id={recipe.id} category={recipe.category} title={recipe.title} />
      )}
    </div>
  );
}
