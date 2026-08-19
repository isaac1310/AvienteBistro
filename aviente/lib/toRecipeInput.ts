import type { RecipeInput } from './mutations';

/**
 * Parser output → the shape the mutations write.
 *
 * `lib/recipeParse.mjs` is plain JavaScript and speaks camelCase; the database
 * columns are snake_case. This mapping is the boundary between them, and it lives in
 * one place because there are now two callers — the import screen and the restore
 * door — and the last time a field was named in one path and not another, backups
 * lost every ingredient group and every photo.
 *
 * Loosely typed in, exact out: a missing field becomes `null` here rather than
 * arriving at Postgres as `undefined`.
 */

type ParsedIngredient = {
  name: string; amount?: number | null; amountMax?: number | null;
  unit?: string | null; note?: string | null; group?: string | null;
};
type ParsedStep = { heading?: string | null; body?: string };

export type ParsedRecipe = {
  title: string; titleEn?: string | null; category: string;
  mealType?: string | null; descriptionHe?: string | null; descriptionEn?: string | null;
  story?: string | null; servingSuggestions?: string | null;
  prepMinutes?: number | null; cookMinutes?: number | null;
  servings?: number | null; yieldText?: string | null;
  source?: string | null; photoPath?: string | null;
  ingredients: ParsedIngredient[]; steps: ParsedStep[];
};

export function toRecipeInput(
  r: ParsedRecipe,
  opts: { category?: string; sourceMemberId?: string | null } = {},
): RecipeInput {
  return {
    title: r.title,
    title_en: r.titleEn ?? null,
    category: (opts.category ?? r.category) as RecipeInput['category'],
    meal_type: (r.mealType ?? null) as RecipeInput['meal_type'],
    description_he: r.descriptionHe ?? null,
    description_en: r.descriptionEn ?? null,
    story: r.story ?? null,
    serving_suggestions: r.servingSuggestions ?? null,
    prep_minutes: r.prepMinutes ?? null,
    cook_minutes: r.cookMinutes ?? null,
    servings: r.servings ?? null,
    yield_text: r.yieldText ?? null,
    /* A per-recipe source in the document wins over any batch-wide choice. Applying
       one source to every recipe destroyed attribution on a restore — the whole book
       came back credited to the same person. */
    source_member_id: opts.sourceMemberId ?? null,
    // A backup carries the Storage path; a fresh AI paste never does.
    photo_path: r.photoPath ?? null,
    ingredients: r.ingredients.map((i) => ({
      name: i.name,
      amount: i.amount ?? null,
      amount_max: i.amountMax ?? null,
      unit: (i.unit ?? null) as RecipeInput['ingredients'][number]['unit'],
      note: i.note ?? null,
      group_label: i.group ?? null,
    })),
    steps: r.steps
      .map((s) => ({ heading: s.heading ?? null, body: s.body ?? '' }))
      .filter((s) => s.body),
  };
}
