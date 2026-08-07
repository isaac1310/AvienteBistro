import { supabaseServer } from './supabase/server';

/* The kids' week (§3.8).
 *
 * Weekdays are 1–5, Monday to Friday, because there are five animals and five
 * days. `week_start` is always a Monday — the schema enforces it, and this module
 * is the only thing that computes one. */

/* Pure values and date helpers live in ./constants so the client planner can use
   them; this module keeps only the queries. */
export * from './constants';
import type { KidsMeal, MealKey } from './constants';

export async function getKidsWeek(weekStart: string) {
  const db = await supabaseServer();

  const { data: week } = await db
    .from('kids_week').select('id').eq('week_start', weekStart).maybeSingle();

  if (!week) return { weekId: null, meals: [] as KidsMeal[] };

  const { data } = await db
    .from('kids_meals')
    .select(`id, weekday, meal, recipe_id, chef_member_id,
             recipe:recipes(id, title, title_en),
             chef:family_members(name)`)
    .eq('week_id', week.id);

  return { weekId: week.id as string, meals: (data ?? []) as unknown as KidsMeal[] };
}

/** Recipes eligible for the kids' table, grouped by the meal they suit. */
export async function kidsRecipes() {
  const db = await supabaseServer();
  const { data } = await db
    .from('recipes')
    .select('id, title, title_en, meal_type')
    .eq('category', 'kids')
    .is('deleted_at', null)
    .order('title');
  return (data ?? []) as { id: string; title: string; title_en: string | null; meal_type: MealKey | null }[];
}
