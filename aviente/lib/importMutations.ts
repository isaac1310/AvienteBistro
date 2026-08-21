'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer, currentMember } from './supabase/server';
import type { RecipeInput } from './mutations';

/* Bulk import (§3.9). Deliberately separate from saveRecipe: an import is one
 * transaction-shaped operation over many recipes, and it must report per row
 * rather than failing the batch on one bad entry. */

/** A row the report can LINK to. The category is part of a recipe's URL, so a report
 *  that carries only title and id can name what it did and not offer to show it. */
export type ImportedRow = { title: string; id: string; category: string };

export type ImportResult = {
  imported: ImportedRow[];
  replaced: ImportedRow[];
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
  return runImport(member, recipes, options);
}

/**
 * Restore a whole backup — the admin's bulk door, distinct from /import.
 *
 * Same engine as importRecipes, different meaning: an import ADDS to the book (and
 * Skip is its default), a restore REPLACES the book with a file. Moran pasting a
 * recipe and Itzik overwriting all forty-one are not the same act, so they are not
 * the same action — this one forces Replace and refuses anyone but the admin,
 * server-side, because the page being hard to find is a curtain, not a gate.
 */
export async function restoreBackup(recipes: RecipeInput[]): Promise<ImportResult> {
  const member = await currentMember();
  if (!member) throw new Error('Not a family member.');
  if (member.role !== 'admin') throw new Error('Restoring a backup is the admin\u2019s job.');
  return runImport(member, recipes, { onDuplicate: 'replace' });
}

/**
 * A revision of a recipe about to be REPLACED by an import.
 *
 * A copy of `snapshot()` in lib/mutations.ts rather than an import of it, for one
 * reason: that one is inside a `'use server'` module where every export becomes a
 * server ACTION, and a helper is not an action. Keeping the shape identical matters
 * more than the duplication — the ⟲ restore reads whatever is in `snapshot`, so the
 * two must agree about what a recipe is.
 */
async function snapshotForImport(
  db: Awaited<ReturnType<typeof supabaseServer>>, recipeId: string, memberId: string,
) {
  const { data } = await db
    .from('recipes')
    .select('*, ingredients(*), steps(*)')
    .eq('id', recipeId)
    .maybeSingle();
  if (!data) return;
  const { error } = await db.from('recipe_revisions').insert({
    recipe_id: recipeId, snapshot: data, edited_by: memberId,
  });
  /* Loud, because the whole point of the snapshot is the delete that follows it. */
  if (error) throw new Error(`snapshot before replace failed: ${error.message}`);
}

async function runImport(
  member: NonNullable<Awaited<ReturnType<typeof currentMember>>>,
  recipes: RecipeInput[],
  options: { onDuplicate: OnDuplicate },
): Promise<ImportResult> {
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

        /* SNAPSHOT BEFORE DELETING. Replace tears down a real recipe's ingredients
           and steps and builds them again from a pasted document; if the rebuild
           fails halfway, what was there is gone. The edit form has snapshotted since
           the beginning and this path never did — the one place in the app where a
           partial failure was unrecoverable. Cheap insurance: the revision list
           already exists and the ⟲ restore already works. */
        await snapshotForImport(db, existingId, member.id);

        /* Every result read, and each failure recorded against THIS recipe. All four
           of these were discarded, so a recipe could be reported "replaced" with its
           ingredients deleted and nothing put back — the worst outcome the importer
           can produce, announced as success. */
        const delIng = await db.from('ingredients').delete().eq('recipe_id', existingId);
        if (delIng.error) {
          result.failed.push({ title, why: `clearing ingredients: ${delIng.error.message}` });
          continue;
        }
        const delSteps = await db.from('steps').delete().eq('recipe_id', existingId);
        if (delSteps.error) {
          result.failed.push({ title, why: `clearing steps: ${delSteps.error.message}` });
          continue;
        }
        if (input.ingredients.length) {
          const { error } = await db.from('ingredients').insert(
            input.ingredients.map((i, position) => ({ ...i, recipe_id: existingId, position })),
          );
          if (error) {
            result.failed.push({
              title,
              why: `ingredients not written — the previous version is under ⟲: ${error.message}`,
            });
            continue;
          }
        }
        if (input.steps.length) {
          const { error } = await db.from('steps').insert(
            input.steps.map((st, position) => ({ ...st, recipe_id: existingId, position })),
          );
          if (error) {
            result.failed.push({
              title,
              why: `steps not written — the previous version is under ⟲: ${error.message}`,
            });
            continue;
          }
        }
        result.replaced.push({ title, id: existingId, category: input.category });
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

      /* Checked, like the replace path above. A new recipe whose ingredients failed
         to insert is a TITLE with nothing under it, and it was being reported as
         imported — so the report said 21 added and the book held 21 empty shells. */
      if (input.ingredients.length) {
        const { error } = await db.from('ingredients').insert(
          input.ingredients.map((i, position) => ({ ...i, recipe_id: data.id, position })),
        );
        if (error) {
          result.failed.push({ title, why: `ingredients: ${error.message}` });
          continue;
        }
      }
      if (input.steps.length) {
        const { error } = await db.from('steps').insert(
          input.steps.map((s, position) => ({ ...s, recipe_id: data.id, position })),
        );
        if (error) {
          result.failed.push({ title, why: `steps: ${error.message}` });
          continue;
        }
      }

      byTitle.set(title, data.id as string);
      result.imported.push({ title, id: data.id as string, category: input.category });
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
