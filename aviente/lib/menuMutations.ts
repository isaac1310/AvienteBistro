'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer, currentMember } from './supabase/server';
import type { CourseKey } from './menus';

/* Menu writes. The snapshot rule from §2 lives here: a menu is an archive, so
 * every item records what the dish was CALLED on that date. Without it, editing a
 * recipe in 2027 silently rewrites the 2026 Shabbat card, and deleting one blanks
 * it entirely. */

export type ItemInput = { recipe_id: string; course: CourseKey };

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
  title: string | null;
  language: 'en' | 'he';
  chef_notes: string | null;
  items: ItemInput[];
}): Promise<string> {
  const member = await requireMember();
  const db = await supabaseServer();

  const fields = {
    date: input.date,
    title: input.title?.trim() || null,
    language: input.language,
    chef_notes: input.chef_notes?.trim() || null,
  };

  let menuId = input.id;
  if (menuId) {
    // Before anything is overwritten — the same rule recipes have followed all
    // along, and the reason last-write-wins is survivable.
    await snapshotMenu(menuId, member.id);
    const { error } = await db.from('menus').update(fields).eq('id', menuId);
    if (error) throw new Error(error.message);
    await db.from('menu_items').delete().eq('menu_id', menuId);
  } else {
    const { data, error } = await db.from('menus').insert(fields).select('id').single();
    if (error) throw new Error(error.message);
    menuId = data.id as string;
  }

  if (input.items.length) {
    /* Snapshot every dish as it reads TODAY. One query for all of them rather
       than N, then the rows are built from that. */
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

    const rows = input.items.map((item, position) => {
      const r = byId.get(item.recipe_id);
      return {
        menu_id: menuId,
        recipe_id: item.recipe_id,
        course: item.course,
        position,
        dish_title: r?.title ?? null,
        dish_title_en: r?.title_en ?? null,
        dish_description_en: r?.description_en ?? null,
        dish_description_he: r?.description_he ?? null,
        credit_name: r?.source?.name ?? null,
      };
    });

    const { error } = await db.from('menu_items').insert(rows);
    if (error) throw new Error(error.message);
  }

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

export async function softDeleteMenu(id: string) {
  await requireMember();
  const db = await supabaseServer();
  const { error } = await db
    .from('menus').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/menus');
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

  const snap = rev.snapshot as {
    date: string; title: string | null; language: 'en' | 'he'; chef_notes: string | null;
    menu_items: Record<string, unknown>[];
  };

  // Snapshot the CURRENT state first, so restoring is itself undoable.
  await snapshotMenu(rev.menu_id, member.id);

  await db.from('menus').update({
    date: snap.date, title: snap.title,
    language: snap.language, chef_notes: snap.chef_notes,
  }).eq('id', rev.menu_id);

  await db.from('menu_items').delete().eq('menu_id', rev.menu_id);
  if (snap.menu_items?.length) {
    await db.from('menu_items').insert(
      snap.menu_items.map((i) => {
        const { id, ...rest } = i as { id?: string };
        void id;                       // a fresh row, not the old one
        return rest;
      }),
    );
  }
  revalidatePath('/menus');
}
