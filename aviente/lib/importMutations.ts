'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer, currentMember } from './supabase/server';
import type { RecipeInput } from './mutations';

/* Bulk import (§3.9). Deliberately separate from saveRecipe: an import is one
 * transaction-shaped operation over many recipes, and it must report per row
 * rather than failing the batch on one bad entry. */

export type ImportResult = {
  imported: { title: string; id: string }[];
  skipped: { title: string; why: string }[];
  failed: { title: string; why: string }[];
  batchId: string;
};

export async function importRecipes(
  recipes: RecipeInput[],
  options: { onDuplicate: 'skip' | 'add' } = { onDuplicate: 'skip' },
): Promise<ImportResult> {
  const member = await currentMember();
  if (!member) throw new Error('Not a family member.');
  const db = await supabaseServer();

  const batchId = crypto.randomUUID();
  const result: ImportResult = { imported: [], skipped: [], failed: [], batchId };

  // One lookup for the whole batch rather than one per recipe.
  const { data: existing } = await db
    .from('recipes').select('title').is('deleted_at', null);
  const titles = new Set((existing ?? []).map((r) => r.title.trim()));

  for (const input of recipes) {
    const title = input.title.trim();
    try {
      if (!title) { result.failed.push({ title: '(untitled)', why: 'no name' }); continue; }

      if (titles.has(title) && options.onDuplicate === 'skip') {
        result.skipped.push({ title, why: 'already in the book' });
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

      titles.add(title);
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

/** Undo a whole import in one go. */
export async function undoImport(batchId: string) {
  const member = await currentMember();
  if (!member) throw new Error('Not a family member.');
  const db = await supabaseServer();
  const { error } = await db
    .from('recipes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('import_batch_id', batchId);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}
