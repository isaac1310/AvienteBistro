'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer, currentMember } from './supabase/server';
import type { Unit } from './constants';

/* Every write the app does. Server Actions, so the anon key never has to be
 * trusted with anything and RLS still decides what is allowed.
 *
 * Two invariants:
 *   — a revision snapshot is written BEFORE the update, every save, no exception;
 *   — delete is soft. Nothing here ever issues a DELETE on a recipe.
 */

export type IngredientInput = {
  name: string;
  amount: number | null;
  amount_max: number | null;
  unit: Unit | null;
  note: string | null;
};

export type StepInput = { heading: string | null; body: string };

export type RecipeInput = {
  id?: string;
  title: string;
  title_en: string | null;
  category: string;
  meal_type: string | null;
  description_he: string | null;
  description_en: string | null;
  story: string | null;
  serving_suggestions: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  yield_text: string | null;
  source_member_id: string | null;
  photo_url: string | null;
  ingredients: IngredientInput[];
  steps: StepInput[];
};

async function requireMember() {
  const member = await currentMember();
  // Belt and braces: RLS would refuse anyway, but failing here gives a real
  // message instead of an opaque empty result.
  if (!member) throw new Error('Not a family member — nothing was saved.');
  return member;
}

/** Snapshot the recipe as it is right now, before anything overwrites it. */
async function snapshot(recipeId: string, memberId: string) {
  const db = await supabaseServer();
  const { data } = await db
    .from('recipes')
    .select('*, ingredients(*), steps(*)')
    .eq('id', recipeId)
    .maybeSingle();
  if (!data) return;
  await db.from('recipe_revisions').insert({
    recipe_id: recipeId, snapshot: data, edited_by: memberId,
  });
}

export async function saveRecipe(input: RecipeInput): Promise<string> {
  const member = await requireMember();
  const db = await supabaseServer();

  const fields = {
    title: input.title.trim(),
    title_en: input.title_en?.trim() || null,
    category: input.category,
    // meal_type belongs to kids recipes only; the DB check constraint enforces
    // this too, but sending it would just produce a confusing error.
    meal_type: input.category === 'kids' ? input.meal_type : null,
    description_he: input.description_he?.trim() || null,
    description_en: input.description_en?.trim() || null,
    story: input.story?.trim() || null,
    serving_suggestions: input.serving_suggestions?.trim() || null,
    prep_minutes: input.prep_minutes,
    cook_minutes: input.cook_minutes,
    // servings XOR yield_text — the schema rejects both or neither.
    servings: input.servings ?? null,
    yield_text: input.servings ? null : (input.yield_text?.trim() || '—'),
    source_member_id: input.source_member_id,
    photo_url: input.photo_url,
    updated_by: member.id,
    updated_at: new Date().toISOString(),
  };

  let recipeId = input.id;

  if (recipeId) {
    await snapshot(recipeId, member.id);
    const { error } = await db.from('recipes').update(fields).eq('id', recipeId);
    if (error) throw new Error(error.message);
    // Children are replaced wholesale: positions and deletions make an
    // incremental diff far more error-prone than a rewrite of eight rows.
    await db.from('ingredients').delete().eq('recipe_id', recipeId);
    await db.from('steps').delete().eq('recipe_id', recipeId);
  } else {
    const { data, error } = await db.from('recipes').insert(fields).select('id').single();
    if (error) throw new Error(error.message);
    recipeId = data.id as string;
  }

  if (input.ingredients.length) {
    const { error } = await db.from('ingredients').insert(
      input.ingredients.map((i, position) => ({ ...i, recipe_id: recipeId, position })),
    );
    if (error) throw new Error(error.message);
  }
  if (input.steps.length) {
    const { error } = await db.from('steps').insert(
      input.steps.map((s, position) => ({ ...s, recipe_id: recipeId, position })),
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath('/', 'layout');
  return recipeId!;
}

/** Soft delete. The row stays; every query filters it. Undo is a null update. */
export async function softDeleteRecipe(id: string) {
  const member = await requireMember();
  const db = await supabaseServer();
  await snapshot(id, member.id);
  const { error } = await db
    .from('recipes')
    .update({ deleted_at: new Date().toISOString(), updated_by: member.id })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

export async function restoreRecipe(id: string) {
  await requireMember();
  const db = await supabaseServer();
  const { error } = await db.from('recipes').update({ deleted_at: null }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

export async function deleteAndGoBack(id: string, category: string) {
  await softDeleteRecipe(id);
  redirect(`/recipes/${category}?undo=${id}`);
}

/** Revisions for the ⟲ list, newest first. */
export async function listRevisions(recipeId: string) {
  await requireMember();
  const db = await supabaseServer();
  const { data } = await db
    .from('recipe_revisions')
    .select('id, created_at, edited_by, family_members(name)')
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: false })
    .limit(20);
  return data ?? [];
}
