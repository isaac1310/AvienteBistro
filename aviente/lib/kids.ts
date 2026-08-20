import { supabaseServer } from './supabase/server';

/* The kids' week (§3.8).
 *
 * Weekdays are 0–6, Sunday to Saturday (migration 10 — an Israeli school week, and
 * the comment here still said Monday to Friday long after). `week_start` is always a
 * Sunday; the schema enforces it and this module is the only thing that computes one.
 *
 * A slot holds SEVERAL dishes since migration 17, and a dish may have free text
 * instead of a recipe. */

/* Pure values and date helpers live in ./constants so the client planner can use
   them; this module keeps only the queries. */
export * from './constants';
import type { KidsMeal, MealKey } from './constants';

export async function getKidsWeek(weekStart: string) {
  const db = await supabaseServer();

  const { data: week } = await db
    .from('kids_week').select('id').eq('week_start', weekStart).maybeSingle();

  if (!week) return { weekId: null, meals: [] as KidsMeal[] };

  const { data, error } = await db
    .from('kids_meals')
    /* display_name as well as name: the app greets by display_name ("Papa"), and the
       chef select showed "Chef Itzik" — the same person under two names on two
       screens. */
    .select(`id, weekday, meal, recipe_id, free_text, position, chef_member_id,
             recipe:recipes(id, title, title_en),
             chef:family_members(name, display_name)`)
    .eq('week_id', week.id)
    /* Ordered HERE, so every caller agrees. The planner and the fridge sheet are
       different components reading the same week, and position only means anything if
       they read it the same way. `id` breaks ties: positions are not unique within a
       slot by design, so a transient tie must not shuffle between renders. */
    .order('weekday').order('meal').order('position').order('id');

  /* Checked rather than discarded. A failed read used to return an empty week, which
     is indistinguishable from a week nobody has planned — the same class of silence
     that hid the clear-week bug for a release. */
  if (error) throw new Error(`getKidsWeek: ${error.message}`);

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
