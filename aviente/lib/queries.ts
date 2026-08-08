import { attachPhotoUrl, attachPhotoUrls } from './photos';
import { supabaseServer } from './supabase/server';

/* Every read the app does, in one place.
 *
 * Two rules hold throughout:
 *   — `deleted_at is null` on every recipe query. Soft delete is only a delete if
 *     nothing forgets to filter it.
 *   — Order child rows by `position`, never by insertion. Ingredient and step order
 *     is meaning, not presentation.
 */

/* Types and category constants live in ./constants so client components can
   import them without pulling next/headers into the browser bundle. */
export * from './constants';
import type { Ingredient, Recipe, RecipeSummary, Step } from './constants';
import { CATEGORIES } from './constants';

/** Counts per category, for the homepage grid. Categories with none still appear. */
export async function categoryCounts(): Promise<Record<string, number>> {
  const db = await supabaseServer();
  const { data, error } = await db
    .from('recipes')
    .select('category')
    .is('deleted_at', null);

  if (error) throw new Error(`categoryCounts: ${error.message}`);

  const counts: Record<string, number> = {};
  for (const c of CATEGORIES) counts[c.key] = 0;
  for (const row of data ?? []) counts[row.category] = (counts[row.category] ?? 0) + 1;
  return counts;
}

/* The source member is a join; Supabase returns it as a nested object, so it is
   flattened here rather than leaking the shape into every component. */
const SUMMARY_COLUMNS =
  'id, title, title_en, category, photo_url, photo_path, servings, yield_text, ' +
  'prep_minutes, cook_minutes, source:family_members!recipes_source_member_id_fkey(name)';

type SummaryRow = Omit<RecipeSummary, 'source_name'> & { source: { name: string } | null };

const flatten = (r: SummaryRow): RecipeSummary => {
  const { source, ...rest } = r;
  return { ...rest, source_name: source?.name ?? null };
};

export async function recipesInCategory(category: string): Promise<RecipeSummary[]> {
  const db = await supabaseServer();
  const { data, error } = await db
    .from('recipes')
    .select(SUMMARY_COLUMNS)
    .eq('category', category)
    .is('deleted_at', null)
    .order('title');

  if (error) throw new Error(`recipesInCategory: ${error.message}`);
  /* Sign the stored paths for this request. See lib/photos.ts — the alternative was
     a one-year signed URL frozen into the row at upload time. */
  return attachPhotoUrls(db, (data as unknown as SummaryRow[]).map(flatten));
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const db = await supabaseServer();
  const { data, error } = await db
    .from('recipes')
    .select(
      `${SUMMARY_COLUMNS}, source_member_id, meal_type,
       description_en, description_he, story, serving_suggestions,
       updated_at,
       editor:family_members!recipes_updated_by_fkey(name),
       ingredients(id, position, name, amount, amount_max, unit, note, group_label),
       steps(id, position, heading, body)`,
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`getRecipe: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as SummaryRow & {
    source_member_id: string | null; meal_type: string | null;
    description_en: string | null; description_he: string | null;
    story: string | null; serving_suggestions: string | null;
    updated_at: string; editor: { name: string } | null;
    ingredients: Ingredient[]; steps: Step[];
  };

  return attachPhotoUrl(db, {
    ...flatten(row),
    source_member_id: row.source_member_id,
    meal_type: row.meal_type,
    description_en: row.description_en,
    description_he: row.description_he,
    story: row.story,
    serving_suggestions: row.serving_suggestions,
    updated_at: row.updated_at,
    updated_by_name: row.editor?.name ?? null,
    // Sort here rather than in the query: PostgREST cannot order embedded rows
    // reliably across versions, and getting this wrong scrambles a recipe.
    ingredients: [...(row.ingredients ?? [])].sort((a, b) => a.position - b.position),
    steps: [...(row.steps ?? [])].sort((a, b) => a.position - b.position),
  });
}

/** Trigram search over title, title_en, ingredient names and both descriptions. */
export async function searchRecipes(query: string): Promise<RecipeSummary[]> {
  const q = query.trim();
  if (!q) return [];
  const db = await supabaseServer();
  const { data, error } = await db
    .from('recipes')
    .select(SUMMARY_COLUMNS)
    .is('deleted_at', null)
    .ilike('search_text', `%${q}%`)
    .order('title')
    .limit(50);

  if (error) throw new Error(`searchRecipes: ${error.message}`);
  return attachPhotoUrls(db, (data as unknown as SummaryRow[]).map(flatten));
}
