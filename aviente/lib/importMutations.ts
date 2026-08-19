'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer, currentMember } from './supabase/server';
import type { RecipeInput } from './mutations';

/* Bulk import (§3.9). Deliberately separate from saveRecipe: an import is one
 * transaction-shaped operation over many recipes, and it must report per row
 * rather than failing the batch on one bad entry. */

export type ImportResult = {
  imported: { title: string; id: string }[];
  replaced: { title: string; id: string }[];
  skipped: { title: string; why: string }[];
  failed: { title: string; why: string }[];
  batchId: string;
};

export type OnDuplicate = 'skip' | 'replace' | 'add';

export async function importRecipes(
  recipes: RecipeInput[],
  options: { onDuplicate: OnDuplicate } = { onDuplicate: 'skip' },
): Promise<ImportResult> {
  const member = await currentMember();
  if (!member) throw new Error('Not a family member.');
  const db = await supabaseServer();

  const batchId = crypto.randomUUID();
  const result: ImportResult = { imported: [], replaced: [], skipped: [], failed: [], batchId };

  // One lookup for the whole batch rather than one per recipe.
  const { data: existing } = await db
    .from('recipes').select('id, title').is('deleted_at', null);
  const byTitle = new Map((existing ?? []).map((r) => [r.title.trim(), r.id as string]));

  for (const input of recipes) {
    const title = input.title.trim();
    try {
      if (!title) { result.failed.push({ title: '(untitled)', why: 'no name' }); continue; }

      const existingId = byTitle.get(title);

      if (existingId && options.onDuplicate === 'skip') {
        result.skipped.push({ title, why: 'already in the book' });
        continue;
      }

      /* Replace IN PLACE rather than delete-and-insert. The id is what menu
         snapshots, the kids' week and any share link point at — recreating the row
         would quietly orphan all of them. A revision is written first, so a
         replace is as undoable as any other save. */
      if (existingId && options.onDuplicate === 'replace') {
        await snapshotForReplace(existingId, member.id);

        const { error: upErr } = await db.from('recipes').update({
          title,
          title_en: input.title_en,
          category: input.category,
          meal_type: input.category === 'kids' ? input.meal_type : null,
          description_he: input.description_he,
          description_en: input.description_en,
          story: input.story,
          serving_suggestions: input.serving_suggestions,
          prep_minutes: input.prep_minutes,
          cook_minutes: input.cook_minutes,
          servings: input.servings,
          yield_text: input.servings ? null : (input.yield_text || '—'),
          /* Only written when the import actually names someone.
             An import document usually has no attribution — the markdown converter
             emits none — so passing it straight through erased "Savta's" from every
             recipe a re-import touched. Replace exists to fix ingredients and steps;
             silently dropping who the recipe came from is not part of that deal.
             (The edit form had the same bug, for the same reason.) */
          ...(input.source_member_id ? { source_member_id: input.source_member_id } : {}),
          /* Same rule as attribution: written only when the document names one.
             An AI-pasted recipe has no photo, and Replace exists to correct
             ingredients and steps — it must not strip the photograph off a recipe
             because the paste happened not to mention it. */
          ...(input.photo_path ? { photo_path: input.photo_path } : {}),
          updated_by: member.id,
          updated_at: new Date().toISOString(),
          import_batch_id: batchId,
        }).eq('id', existingId);
        if (upErr) { result.failed.push({ title, why: upErr.message }); continue; }

        await db.from('ingredients').delete().eq('recipe_id', existingId);
        await db.from('steps').delete().eq('recipe_id', existingId);
        if (input.ingredients.length) {
          await db.from('ingredients').insert(
            input.ingredients.map((i, position) => ({ ...i, recipe_id: existingId, position })),
          );
        }
        if (input.steps.length) {
          await db.from('steps').insert(
            input.steps.map((st, position) => ({ ...st, recipe_id: existingId, position })),
          );
        }
        result.replaced.push({ title, id: existingId });
        continue;
      }

      const { data, error } = await db.from('recipes').insert({
        title,
        title_en: input.title_en,
        category: input.category,
        meal_type: input.category === 'kids' ? input.meal_type : null,
        description_he: input.description_he,
        description_en: input.description_en,
        story: input.story,
        serving_suggestions: input.serving_suggestions,
        prep_minutes: input.prep_minutes,
        cook_minutes: input.cook_minutes,
        servings: input.servings,
        // The schema demands one or the other; an em dash is honest about a
        // recipe whose source said nothing.
        yield_text: input.servings ? null : (input.yield_text || '—'),
        source_member_id: input.source_member_id,
        // A restored backup carries the Storage path; a fresh paste carries null.
        photo_path: input.photo_path ?? null,
        updated_by: member.id,
        import_batch_id: batchId,
      }).select('id').single();

      if (error) { result.failed.push({ title, why: error.message }); continue; }

      if (input.ingredients.length) {
        await db.from('ingredients').insert(
          input.ingredients.map((i, position) => ({ ...i, recipe_id: data.id, position })),
        );
      }
      if (input.steps.length) {
        await db.from('steps').insert(
          input.steps.map((s, position) => ({ ...s, recipe_id: data.id, position })),
        );
      }

      byTitle.set(title, data.id as string);
      result.imported.push({ title, id: data.id as string });
    } catch (e) {
      // One bad row must never abort the batch — that is the difference between
      // importing 47 of 50 and importing none.
      result.failed.push({ title, why: e instanceof Error ? e.message : 'failed' });
    }
  }

  revalidatePath('/', 'layout');
  return result;
}

/* A replace overwrites a recipe that already existed, so snapshot it first —
   otherwise re-importing would be the one write in the app with no way back. */
async function snapshotForReplace(recipeId: string, memberId: string) {
  const db = await supabaseServer();
  const { data } = await db
    .from('recipes').select('*, ingredients(*), steps(*)').eq('id', recipeId).maybeSingle();
  if (!data) return;
  await db.from('recipe_revisions').insert({
    recipe_id: recipeId, snapshot: data, edited_by: memberId,
  });
}

/**
 * Undo an import — but only the recipes it CREATED.
 *
 * Takes explicit ids rather than the batch id. A replaced recipe carries the same
 * import_batch_id as a new one, so undoing by batch would soft-delete a recipe
 * that existed long before the import and that someone may have edited by hand.
 * Its previous version is in recipe_revisions instead, reachable from
 * ⟲ Earlier versions on the recipe itself.
 */
export async function undoImport(createdIds: string[]) {
  const member = await currentMember();
  if (!member) throw new Error('Not a family member.');
  if (!createdIds.length) return;
  const db = await supabaseServer();
  const { error } = await db
    .from('recipes')
    .update({ deleted_at: new Date().toISOString(), updated_by: member.id })
    .in('id', createdIds);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}
