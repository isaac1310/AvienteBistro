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

/**
 * Add a dish to a slot, or replace one.
 *
 * `setMeal` used to upsert on (week, weekday, meal) — one dish per slot, and the
 * unique constraint was what made a second tap replace rather than duplicate. With
 * that constraint gone the same call would have quietly inserted a SECOND dish every
 * time somebody pressed swap, because the empty-slot add and the swap were the same
 * code path. Hence `replaceId`, threaded through to the function.
 *
 * The numbering happens in Postgres (kids_add), not here. `position = max + 1`
 * computed in this file races two simultaneous adds to the same number, and nothing
 * here was ever going to repair positions after a delete or a cross-slot move.
 */
export async function addMeal(
  weekStart: string, weekday: number, meal: MealKey,
  dish: { recipeId: string; freeText?: null } | { recipeId?: null; freeText: string },
  opts: { replaceId?: string | null; chefMemberId?: string | null } = {},
): Promise<string> {
  await requireMember();
  const db = await supabaseServer();
  const weekId = await ensureWeek(weekStart);

  /* Trimmed here as well as in the constraint. The database refuses whitespace-only
     free text with a 23514, which is correct and unreadable — better to send null and
     let the XOR constraint be the backstop rather than the error message. */
  const freeText = 'freeText' in dish ? (dish.freeText ?? '').trim() || null : null;
  const recipeId = dish.recipeId ?? null;
  if (!recipeId && !freeText) throw new Error('A dish needs a recipe or some text.');

  const { data, error } = await db.rpc('kids_add', {
    p_week_id: weekId,
    p_weekday: weekday,
    p_meal: meal,
    p_recipe_id: recipeId,
    p_free_text: freeText,
    p_chef_member_id: opts.chefMemberId ?? null,
    p_replace_id: opts.replaceId ?? null,
  });
  if (error) throw new Error(`addMeal: ${error.message}`);
  revalidatePath('/kids');
  return data as string;
}

/** One dish, by id. Was clearMeal(week, day, meal), which now means the whole slot. */
export async function removeMeal(id: string) {
  await requireMember();
  const db = await supabaseServer();
  const { error } = await db.rpc('kids_remove', { p_id: id });
  if (error) throw new Error(`removeMeal: ${error.message}`);
  revalidatePath('/kids');
}

/** Move one dish to another slot, or to another place within its own. */
export async function moveMeal(
  id: string, weekday: number, meal: MealKey, position: number | null = null,
) {
  await requireMember();
  const db = await supabaseServer();
  const { error } = await db.rpc('kids_move', {
    p_id: id, p_weekday: weekday, p_meal: meal, p_position: position,
  });
  if (error) throw new Error(`moveMeal: ${error.message}`);
  revalidatePath('/kids');
}

/** Every dish in one slot. Kept, because turning a day off needs a bulk clear. */
export async function clearMeal(weekStart: string, weekday: number, meal: MealKey) {
  await requireMember();
  const db = await supabaseServer();
  /* The lookup is checked too. Unchecked, a failed READ leaves `week` undefined and
     the early return below reports success — the same silent failure one line up. */
  const { data: week, error: findErr } = await db
    .from('kids_week').select('id').eq('week_start', weekStart).maybeSingle();
  if (findErr) throw new Error(`clearMeal: ${findErr.message}`);
  if (!week) return;
  /* The result was discarded here, so a refused delete was indistinguishable from a
     successful one — which is why "clear" appeared to do nothing and looked like a UI
     problem. RLS, a network failure and success all returned the same undefined. */
  const { error } = await db.from('kids_meals').delete()
    .eq('week_id', week.id).eq('weekday', weekday).eq('meal', meal);
  if (error) throw new Error(`clearMeal: ${error.message}`);
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

  /* `position: 0` explicitly. Filling only ever touches EMPTY slots, so zero is
     always right — but the column has a default and relying on a default to be
     correct is how the one invariant these functions exist to hold gets broken by
     the one write that does not go through them. */
  const rows: {
    week_id: string; weekday: number; meal: MealKey; recipe_id: string; position: number;
  }[] = [];
  let i = 0;
  for (const weekday of days) {
    for (const meal of meals) {
      if (isTaken.has(`${weekday}:${meal}`)) continue;
      rows.push({
        week_id: weekId, weekday, meal,
        recipe_id: recipeIds[i % recipeIds.length], position: 0,
      });
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
  const { data: week, error: findErr } = await db
    .from('kids_week').select('id').eq('week_start', weekStart).maybeSingle();
  if (findErr) throw new Error(`clearWeek: ${findErr.message}`);
  if (!week) return;
  const { error } = await db.from('kids_meals').delete().eq('week_id', week.id);
  if (error) throw new Error(`clearWeek: ${error.message}`);
  revalidatePath('/kids');
}
