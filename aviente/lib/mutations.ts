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
  group_label: string | null;
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
  photo_path: string | null;
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
    photo_path: input.photo_path,
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
    .select('id, created_at, editor:family_members(name)')
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data ?? []) as unknown as
    { id: string; created_at: string; editor: { name: string } | null }[];
}

/**
 * Put a recipe back the way a revision found it.
 *
 * The current state is snapshotted FIRST, so restoring is itself undoable —
 * otherwise "look at an old version" becomes a one-way door and nobody dares
 * press it.
 */
export async function restoreRecipeRevision(revisionId: string) {
  const member = await requireMember();
  const db = await supabaseServer();

  const { data: rev } = await db
    .from('recipe_revisions').select('recipe_id, snapshot').eq('id', revisionId).maybeSingle();
  if (!rev) throw new Error('That version is no longer there.');

  const snap = rev.snapshot as Record<string, unknown> & {
    ingredients?: Record<string, unknown>[];
    steps?: Record<string, unknown>[];
  };

  await snapshot(rev.recipe_id, member.id);

  const { ingredients, steps, id, ...fields } = snap;
  void id;
  await db.from('recipes')
    .update({ ...fields, updated_by: member.id, updated_at: new Date().toISOString() })
    .eq('id', rev.recipe_id);

  await db.from('ingredients').delete().eq('recipe_id', rev.recipe_id);
  await db.from('steps').delete().eq('recipe_id', rev.recipe_id);
  if (ingredients?.length) {
    await db.from('ingredients').insert(ingredients.map((i) => {
      const { id: _drop, ...rest } = i as { id?: string };
      void _drop; return rest;
    }));
  }
  if (steps?.length) {
    await db.from('steps').insert(steps.map((s) => {
      const { id: _drop, ...rest } = s as { id?: string };
      void _drop; return rest;
    }));
  }
  revalidatePath('/', 'layout');
}

/**
 * Move a photo from one recipe to another.
 *
 * A move, not a copy: the URL is written to the destination and cleared from the
 * source in the same action, so a photograph is never claimed by two recipes at
 * once. The Storage object itself is untouched — only which recipe points at it
 * changes, which is why this is instant and cannot fail halfway into an upload.
 *
 * Chosen over drag-and-drop deliberately: dragging across a scrolling list on a
 * phone is fiddly and undoable only by dragging back, whereas picking the
 * destination from a list is one tap and reads the same on both devices.
 */
export async function movePhoto(fromRecipeId: string, toRecipeId: string) {
  const member = await requireMember();
  const db = await supabaseServer();

  /* The PATH moves, not a URL. Moving a signed URL between rows moved a link with
     an expiry baked into it, so the photograph would have expired on its new recipe
     at whatever moment it was going to expire on the old one. */
  const { data: source } = await db
    .from('recipes').select('photo_path').eq('id', fromRecipeId).maybeSingle();
  if (!source?.photo_path) throw new Error('That recipe has no photo to move.');

  const { data: target } = await db
    .from('recipes').select('photo_path, title').eq('id', toRecipeId).maybeSingle();
  if (!target) throw new Error('Could not find the recipe to move it to.');
  if (target.photo_path) {
    // Refuse rather than overwrite: silently replacing a photo someone chose is
    // worse than making them clear it first.
    throw new Error(`"${target.title}" already has a photo. Remove that one first.`);
  }

  await snapshot(fromRecipeId, member.id);
  await snapshot(toRecipeId, member.id);

  const { error: setErr } = await db
    .from('recipes')
    .update({ photo_path: source.photo_path, photo_url: null, updated_by: member.id })
    .eq('id', toRecipeId);
  if (setErr) throw new Error(setErr.message);

  const { error: clearErr } = await db
    .from('recipes')
    .update({ photo_path: null, photo_url: null, updated_by: member.id })
    .eq('id', fromRecipeId);
  if (clearErr) throw new Error(clearErr.message);

  revalidatePath('/', 'layout');
}

/** Recipes a photo could be moved to: everything without one of its own. */
export async function recipesWithoutPhoto(excludeId: string) {
  await requireMember();
  const db = await supabaseServer();
  const { data } = await db
    .from('recipes')
    .select('id, title, category')
    .is('deleted_at', null)
    .is('photo_path', null)
    .neq('id', excludeId)
    .order('title');
  return (data ?? []) as { id: string; title: string; category: string }[];
}

/** Per-user theme (§1). Stored on the member, not globally — Papa switching to
 *  burgundy must not repaint Maman's phone. */
export async function setTheme(theme: 'green' | 'burgundy') {
  const member = await requireMember();
  const db = await supabaseServer();
  const { error } = await db
    .from('family_members').update({ theme }).eq('id', member.id);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

/**
 * What the app calls you.
 *
 * `name` is left alone: it is what recipes and menus are attributed to, so editing
 * it would silently rewrite "Savta's recipe". `display_name` is only ever used to
 * greet you, which is why it is the one that is safe to change.
 */
export async function setDisplayName(displayName: string) {
  const member = await requireMember();
  const trimmed = displayName.trim();
  if (!trimmed) throw new Error('A name cannot be blank.');
  if (trimmed.length > 40) throw new Error('That is too long for a greeting.');
  const db = await supabaseServer();
  const { error } = await db
    .from('family_members').update({ display_name: trimmed }).eq('id', member.id);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

/**
 * Which language a NEW menu card starts in, per person.
 *
 * Narrow on purpose: this is not a UI language switch. The interface is English
 * only, and pretending otherwise with a half-translated app would be worse than
 * not offering it. What it does control is the one place the app really is
 * bilingual — the descriptions on a menu card.
 */
export async function setCardLanguage(language: 'en' | 'he') {
  const member = await requireMember();
  const db = await supabaseServer();
  const { error } = await db
    .from('family_members').update({ card_language: language }).eq('id', member.id);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

/**
 * Fill in any menu-card description that is still empty.
 *
 * Replaces a .sql file that could not be pasted reliably: Hebrew interleaved with
 * SQL quotes gets reordered by the editor's bidirectional handling and arrives
 * truncated. Running it through the app means the text is never re-parsed.
 *
 * Only fills BLANKS — anything written by hand is left exactly as it is, so this
 * is safe to press twice.
 */
export async function applySampleDescriptions(): Promise<{ filled: number; skipped: number; missing: string[] }> {
  await requireMember();
  const db = await supabaseServer();
  const { SAMPLE_DESCRIPTIONS } = await import('./sampleDescriptions');

  const { data: rows, error } = await db
    .from('recipes')
    .select('id, title, description_he, description_en')
    .is('deleted_at', null);
  if (error) throw new Error(error.message);

  const byTitle = new Map((rows ?? []).map((r) => [r.title.trim(), r]));
  let filled = 0, skipped = 0;
  const missing: string[] = [];

  for (const s of SAMPLE_DESCRIPTIONS) {
    const row = byTitle.get(s.title.trim());
    if (!row) { missing.push(s.title); continue; }
    if (row.description_he && row.description_en) { skipped++; continue; }

    const { error: upErr } = await db.from('recipes').update({
      description_he: row.description_he ?? s.he,
      description_en: row.description_en ?? s.en,
    }).eq('id', row.id);
    if (upErr) throw new Error(upErr.message);
    filled++;
  }

  revalidatePath('/', 'layout');
  return { filled, skipped, missing };
}
