'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer, currentMember } from './supabase/server';
import type { CourseKey } from './menus';

/* Menu writes. The snapshot rule from §2 lives here: a menu is an archive, so
 * every item records what the dish was CALLED on that date. Without it, editing a
 * recipe in 2027 silently rewrites the 2026 Shabbat card, and deleting one blanks
 * it entirely. */

export type ItemInput = {
  recipe_id: string;
  course: CourseKey;
  /** Written on the card for this meal. Falls back to the recipe's description. */
  note?: string | null;
};

async function requireMember() {
  const m = await currentMember();
  if (!m) throw new Error('Not a family member.');
  return m;
}

/** A long, unguessable secret. Two dedashed UUIDs, exactly as TravelHub mints. */
const newSecret = () =>
  (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');

export async function saveMenu(input: {
  id?: string;
  date: string;
  meal_time: 'evening' | 'day';
  title: string | null;
  language: 'en' | 'he';
  chef_notes: string | null;
  /** The running order for this menu. null means "use the app default". */
  course_order?: CourseKey[] | null;
  items: ItemInput[];
}): Promise<string> {
  const member = await requireMember();
  const db = await supabaseServer();

  /* A blank title falls back to the occasion, resolved HERE for the date and meal
     time actually being saved. The builder used to resolve this and send it along,
     which saved a stale occasion when the date had just changed — the preview and
     the card could both describe the previous date. */
  let title = input.title?.trim() || null;
  if (!title) {
    const { occasionRules } = await import('./menus');
    const { resolveOccasion } = await import('./occasion');
    const rules = await occasionRules();
    const at = input.meal_time === 'day' ? 'T12:00:00' : 'T18:00:00';
    title = resolveOccasion(new Date(`${input.date}${at}`), input.meal_time, rules)?.title ?? null;
  }

  const fields = {
    date: input.date,
    meal_time: input.meal_time,
    title,
    language: input.language,
    chef_notes: input.chef_notes?.trim() || null,
    /* An empty array is stored as null, not as []. They would print identically —
       coursesForMenu treats both as "use the default" — but only one of them says
       what it means, and a column full of empty arrays is a puzzle for whoever reads
       the table next. */
    course_order: input.course_order?.length ? input.course_order : null,
  };

  /* Snapshot every dish as it reads TODAY — read BEFORE the write so the whole
     write can be one transaction. One query for all of them rather than N. */
  let rows: Record<string, unknown>[] = [];
  if (input.items.length) {
    const ids = input.items.map((i) => i.recipe_id);
    const { data: recipes } = await db
      .from('recipes')
      .select('id, title, title_en, description_en, description_he, source:family_members!recipes_source_member_id_fkey(name)')
      .in('id', ids);

    const byId = new Map(
      (recipes ?? []).map((r) => {
        const rec = r as unknown as {
          id: string; title: string; title_en: string | null;
          description_en: string | null; description_he: string | null;
          source: { name: string } | null;
        };
        return [rec.id, rec];
      }),
    );

    rows = input.items.map((item) => {
      const r = byId.get(item.recipe_id);
      return {
        recipe_id: item.recipe_id,
        course: item.course,
        dish_title: r?.title ?? null,
        dish_title_en: r?.title_en ?? null,
        /* A description typed on the CARD wins over the recipe's own.
           Until now this only ever copied the recipe's description, so the italic
           line under each dish — the thing the sample menu is largely made of —
           could not be written at all: you had to go and edit the recipe, which
           changes it everywhere it appears. A menu note is about this meal. */
        dish_description_en: item.note ?? r?.description_en ?? null,
        dish_description_he: item.note ?? r?.description_he ?? null,
        credit_name: r?.source?.name ?? null,
      };
    });
  }

  /* ONE transaction — migration 0021. Update + delete items + insert items used to
     be three separate writes; a failure between them left a menu with no dishes, or
     the old ones under a new title. The function keeps the revision-first rule. */
  let menuId = input.id;
  const rpc = await db.rpc('save_menu_tx', {
    p_id: menuId ?? null,
    p_fields: fields,
    p_items: rows,
    p_member: member.id,
  });

  /* No fallback: migration 0021 is live everywhere this code runs. The pre-0021
     multi-write path was removed in v11.5.0; a database without the function fails
     here loudly, which is what the schema banner and check-schema exist to prevent. */
  if (rpc.error) throw new Error(rpc.error.message);
  menuId = rpc.data as string;

  revalidatePath('/menus');
  return menuId!;
}

/** The ★ that decides whether a menu appears in the keepers list. */
export async function toggleSaved(id: string, saved: boolean) {
  await requireMember();
  const db = await supabaseServer();
  const { error } = await db.from('menus').update({ saved }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/menus');
}

/** Copy a menu onto a new date — the fastest way to build one, and the whole
 *  reason for keeping old menus at all (§3.7). */
export async function duplicateMenu(id: string, date: string): Promise<string> {
  await requireMember();
  const db = await supabaseServer();

  /* NOT after_notes. "How did it go" is about one evening; a copy of the menu onto a
     new date starts with that question unanswered. Deliberate — do not "fix". */
  const { data: source } = await db
    .from('menus').select('title, language, chef_notes').eq('id', id).single();
  const { data: items } = await db
    .from('menu_items')
    .select('recipe_id, course, position, dish_title, dish_title_en, dish_description_en, dish_description_he, credit_name')
    .eq('menu_id', id);

  const { data: created, error } = await db
    .from('menus')
    .insert({ ...source, date, saved: false })
    .select('id').single();
  if (error) throw new Error(error.message);

  if (items?.length) {
    await db.from('menu_items').insert(items.map((i) => ({ ...i, menu_id: created.id })));
  }
  revalidatePath('/menus');
  return created.id as string;
}

/** Mint a guest link. Returns the path with the secret. */
export async function shareMenu(id: string): Promise<string> {
  await requireMember();
  const db = await supabaseServer();
  const share_id = crypto.randomUUID();
  const share_secret = newSecret();
  const { error } = await db
    .from('menus')
    .update({ share_id, share_secret, shared_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/menus');
  return `/m/${share_id}?k=${share_secret}`;
}

/** Revoke. Nulling both columns kills every link that was ever handed out. */
export async function unshareMenu(id: string) {
  await requireMember();
  const db = await supabaseServer();
  const { error } = await db
    .from('menus')
    .update({ share_id: null, share_secret: null, shared_at: null })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/menus');
}

/** Soft delete. The row stays; getMenu/savedMenus filter it; /menus/trash lists it.
 *
 * Snapshot first — the same rule recipes have always followed and menus did not.
 * The share is REVOKED, not merely hidden: deleting means "gone", and a link in
 * somebody's WhatsApp that springs back to life on restore is a surprise nobody
 * asked for. A restored menu can be shared again with a fresh link. */
export async function softDeleteMenu(id: string) {
  const member = await requireMember();
  const db = await supabaseServer();
  await snapshotMenu(id, member.id);
  const { error } = await db
    .from('menus')
    .update({
      deleted_at: new Date().toISOString(),
      share_id: null, share_secret: null, shared_at: null,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/menus');
}

export async function restoreMenu(id: string) {
  await requireMember();
  const db = await supabaseServer();
  const { error } = await db.from('menus').update({ deleted_at: null }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/menus');
}

/** The note after the meal. A narrow write, snapshot-first like every other. */
export async function saveAfterNotes(menuId: string, text: string) {
  const member = await requireMember();
  const db = await supabaseServer();
  await snapshotMenu(menuId, member.id);
  const { error } = await db
    .from('menus').update({ after_notes: text.trim() || null }).eq('id', menuId);
  if (error) throw new Error(error.message);
  revalidatePath(`/menus/${menuId}`);
}

/* Menu revisions.
 *
 * Recipes snapshot on every save; menus did not. With two people editing, the
 * second save won silently and the first evening's work was gone — and unlike a
 * recipe there was nothing to restore from. Same table, same shape: menus are
 * small, so keep every version. */
async function snapshotMenu(menuId: string, memberId: string) {
  const db = await supabaseServer();
  const { data } = await db
    .from('menus').select('*, menu_items(*)').eq('id', menuId).maybeSingle();
  if (!data) return;
  await db.from('menu_revisions').insert({
    menu_id: menuId, snapshot: data, edited_by: memberId,
  });
}

export async function listMenuRevisions(menuId: string) {
  await requireMember();
  const db = await supabaseServer();
  const { data } = await db
    .from('menu_revisions')
    .select('id, created_at, editor:family_members(name)')
    .eq('menu_id', menuId)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data ?? []) as unknown as
    { id: string; created_at: string; editor: { name: string } | null }[];
}

/** Put a menu back the way a revision found it. */
export async function restoreMenuRevision(revisionId: string) {
  const member = await requireMember();
  const db = await supabaseServer();

  const { data: rev } = await db
    .from('menu_revisions').select('menu_id, snapshot').eq('id', revisionId).maybeSingle();
  if (!rev) throw new Error('That version is no longer there.');

  /* The full field set a revision holds. Typing it narrowly was how three fields
     came to be dropped on restore — the snapshot is `select('*')`, so anything
     missing from this type is invisible to the restore rather than absent from the
     data. Optional because an old revision predates the newer columns. */
  const snap = rev.snapshot as {
    date: string; title: string | null; language: 'en' | 'he'; chef_notes: string | null;
    meal_time?: 'evening' | 'day'; course_order?: string[] | null; saved?: boolean;
    after_notes?: string | null;
    menu_items: Record<string, unknown>[];
  };

  // Snapshot the CURRENT state first, so restoring is itself undoable.
  await snapshotMenu(rev.menu_id, member.id);

  const { error: upErr } = await db.from('menus').update({
    date: snap.date, title: snap.title,
    language: snap.language, chef_notes: snap.chef_notes,
    /* meal_time, course_order and saved were NOT restored, so "put it back the way
       it was" produced a menu that differed from the version you chose — a Friday
       evening could come back as a lunch, losing its candles and its occasion, and
       a rearranged running order silently reverted to the default. The snapshot held
       all three the whole time; only the restore ignored them. `?? null` because a
       revision taken before a column existed has no value for it. */
    meal_time: snap.meal_time ?? 'evening',
    course_order: snap.course_order ?? null,
    saved: snap.saved ?? false,
    /* Added with 0022 — in the type AND here, because the type alone restores
       nothing (the lesson three fields up). */
    after_notes: snap.after_notes ?? null,
  }).eq('id', rev.menu_id);
  if (upErr) throw new Error(`restore: ${upErr.message}`);

  /* Checked, both of them. A refused delete left the old items in place and the
     insert below appended to them — a restored menu with every dish twice. */
  const { error: delErr } = await db.from('menu_items').delete().eq('menu_id', rev.menu_id);
  if (delErr) throw new Error(`restore items: ${delErr.message}`);
  if (snap.menu_items?.length) {
    const { error } = await db.from('menu_items').insert(
      snap.menu_items.map((i) => {
        const { id, ...rest } = i as { id?: string };
        void id;                       // a fresh row, not the old one
        return rest;
      }),
    );
    if (error) throw new Error(`restore items: ${error.message}`);
  }
  revalidatePath('/menus');
}

/** The occasion preview for a date the builder just changed to.
 *
 * The builder is handed both meal-time variants for its INITIAL date; this is the
 * round trip for every date after that, so the preview never describes the date the
 * page was opened with while a different one sits in the field. */
export async function occasionFor(date: string): Promise<{ evening: string | null; day: string | null }> {
  const { occasionRules } = await import('./menus');
  const { resolveOccasion } = await import('./occasion');
  const rules = await occasionRules();
  return {
    evening: resolveOccasion(new Date(`${date}T18:00:00`), 'evening', rules)?.title ?? null,
    day: resolveOccasion(new Date(`${date}T12:00:00`), 'day', rules)?.title ?? null,
  };
}
