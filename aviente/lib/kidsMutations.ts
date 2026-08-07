'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer, currentMember } from './supabase/server';
import type { MealKey } from './kids';

/* Writes for the kids' week. No auto-suggest anywhere — §3.8 cut it, so every
 * meal on this page got there because someone chose it. */

async function requireMember() {
  const m = await currentMember();
  if (!m) throw new Error('Not a family member.');
  return m;
}

/** The week row is created lazily: planning nothing should leave nothing behind. */
async function ensureWeek(weekStart: string): Promise<string> {
  const db = await supabaseServer();
  const { data: found } = await db
    .from('kids_week').select('id').eq('week_start', weekStart).maybeSingle();
  if (found) return found.id as string;

  const { data, error } = await db
    .from('kids_week').insert({ week_start: weekStart }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function setMeal(
  weekStart: string, weekday: number, meal: MealKey, recipeId: string,
) {
  await requireMember();
  const db = await supabaseServer();
  const weekId = await ensureWeek(weekStart);

  /* upsert on the natural key: one dish per slot. The unique constraint means a
     second tap replaces rather than duplicating — which is what ↻ swap needs. */
  const { error } = await db
    .from('kids_meals')
    .upsert(
      { week_id: weekId, weekday, meal, recipe_id: recipeId },
      { onConflict: 'week_id,weekday,meal' },
    );
  if (error) throw new Error(error.message);
  revalidatePath('/kids');
}

export async function clearMeal(weekStart: string, weekday: number, meal: MealKey) {
  await requireMember();
  const db = await supabaseServer();
  const { data: week } = await db
    .from('kids_week').select('id').eq('week_start', weekStart).maybeSingle();
  if (!week) return;
  await db.from('kids_meals').delete()
    .eq('week_id', week.id).eq('weekday', weekday).eq('meal', meal);
  revalidatePath('/kids');
}

export async function setChef(mealId: string, memberId: string | null) {
  await requireMember();
  const db = await supabaseServer();
  const { error } = await db
    .from('kids_meals').update({ chef_member_id: memberId }).eq('id', mealId);
  if (error) throw new Error(error.message);
  revalidatePath('/kids');
}

/**
 * FILL THE WEEK — spread the chosen dishes across Mon–Fri in order.
 *
 * Deliberately not clever: it walks the days and meals you asked for and deals
 * the tray out round-robin, so five picks become a week in one tap. Anything
 * already placed is left alone, because overwriting a deliberate choice with an
 * automatic one is the opposite of what §3.8 asks for.
 */
export async function fillWeek(
  weekStart: string,
  recipeIds: string[],
  days: number[],
  meals: MealKey[],
) {
  await requireMember();
  if (!recipeIds.length || !days.length || !meals.length) return;

  const db = await supabaseServer();
  const weekId = await ensureWeek(weekStart);

  const { data: taken } = await db
    .from('kids_meals').select('weekday, meal').eq('week_id', weekId);
  const isTaken = new Set((taken ?? []).map((t) => `${t.weekday}:${t.meal}`));

  const rows: { week_id: string; weekday: number; meal: MealKey; recipe_id: string }[] = [];
  let i = 0;
  for (const weekday of days) {
    for (const meal of meals) {
      if (isTaken.has(`${weekday}:${meal}`)) continue;
      rows.push({ week_id: weekId, weekday, meal, recipe_id: recipeIds[i % recipeIds.length] });
      i++;
    }
  }

  if (rows.length) {
    const { error } = await db.from('kids_meals').insert(rows);
    if (error) throw new Error(error.message);
  }
  revalidatePath('/kids');
}

/** Clear week — with auto-suggest cut, this is all "Redo week" ever meant. */
export async function clearWeek(weekStart: string) {
  await requireMember();
  const db = await supabaseServer();
  const { data: week } = await db
    .from('kids_week').select('id').eq('week_start', weekStart).maybeSingle();
  if (!week) return;
  await db.from('kids_meals').delete().eq('week_id', week.id);
  revalidatePath('/kids');
}
