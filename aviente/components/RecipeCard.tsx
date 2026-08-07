import Link from 'next/link';
import { categoryLabel, type RecipeSummary } from '@/lib/constants';
import styles from './RecipeCard.module.css';

/* One recipe in a list. The attribution line reads "Savta's · serves 8", falling
 * back to the yield text when there is no portion count — the ginger concentrate
 * would otherwise read "serves null". */
export default function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  const cat = categoryLabel(recipe.category);
  const portion = recipe.servings
    ? `serves ${recipe.servings}`
    : recipe.yield_text ?? null;
  const attribution = [recipe.source_name && `${recipe.source_name}'s`, portion]
    .filter(Boolean).join(' · ');

  return (
    <Link href={`/recipes/${recipe.category}/${recipe.id}`} className={`card ${styles.card}`}>
      {recipe.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs
        <img src={recipe.photo_url} alt="" className={styles.thumb} loading="lazy" />
      ) : (
        /* Blueprint fallback: striped ground with the category emoji, so a
           photo-less cookbook still looks deliberate rather than broken. */
        <span className={styles.blueprint} aria-hidden="true">
          <span className={styles.blueprintEmoji}>{cat.emoji}</span>
        </span>
      )}
      <span className={styles.body}>
        <span className={styles.title} lang="he">{recipe.title}</span>
        {recipe.title_en && <span className={styles.titleEn}>{recipe.title_en}</span>}
        {attribution && <span className={styles.meta}>{attribution}</span>}
      </span>
    </Link>
  );
}
