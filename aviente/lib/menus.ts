import { supabaseServer } from './supabase/server';
import type { OccasionRule } from './occasion';

/* Menu reads. The course order is fixed by the card, not by the database — a
 * dessert row must never print above the main. */

/* Course constants live in ./constants so client components (the builder) can
   import them without dragging next/headers into the browser bundle. */
export { COURSES, courseLabel, courseIndex } from './constants';
export type { CourseKey } from './constants';
import { courseIndex } from './constants';
import type { CourseKey } from './constants';

export type MenuItem = {
  id: string;
  recipe_id: string | null;
  course: CourseKey;
  position: number;
  /* Snapshot fields. Read these first; the live recipe is only a fallback for
     rows written before snapshotting existed. */
  dish_title: string | null;
  dish_title_en: string | null;
  dish_description_en: string | null;
  dish_description_he: string | null;
  credit_name: string | null;
};

export type Menu = {
  id: string;
  date: string;
  title: string | null;
  language: 'en' | 'he';
  chef_notes: string | null;
  saved: boolean;
  share_id: string | null;
  share_secret: string | null;
  items: MenuItem[];
};

export async function occasionRules(): Promise<OccasionRule[]> {
  const db = await supabaseServer();
  const { data } = await db.from('occasion_rules').select('*');
  return (data ?? []) as OccasionRule[];
}

const MENU_COLUMNS =
  `id, date, title, language, chef_notes, saved, share_id, share_secret,
   items:menu_items(id, recipe_id, course, position, dish_title, dish_title_en,
                    dish_description_en, dish_description_he, credit_name)`;

function order(menu: Menu): Menu {
  return {
    ...menu,
    items: [...(menu.items ?? [])].sort(
      (a, b) => courseIndex(a.course) - courseIndex(b.course) || a.position - b.position,
    ),
  };
}

export async function getMenu(id: string): Promise<Menu | null> {
  const db = await supabaseServer();
  const { data, error } = await db
    .from('menus').select(MENU_COLUMNS).eq('id', id).is('deleted_at', null).maybeSingle();
  if (error) throw new Error(`getMenu: ${error.message}`);
  return data ? order(data as unknown as Menu) : null;
}

/** §3.7: starred menus by default, plus anything upcoming. */
export async function savedMenus(includeAll = false): Promise<Menu[]> {
  const db = await supabaseServer();
  const today = new Date().toISOString().slice(0, 10);
  let q = db.from('menus').select(MENU_COLUMNS).is('deleted_at', null);
  // The upcoming menu is always shown, starred or not — it is the one people
  // actually need to see.
  if (!includeAll) q = q.or(`saved.eq.true,date.gte.${today}`);
  const { data, error } = await q.order('date', { ascending: false }).limit(100);
  if (error) throw new Error(`savedMenus: ${error.message}`);
  return (data as unknown as Menu[]).map(order);
}

/** The guest view, via the security-definer RPC. No session involved. */
export async function fetchSharedMenu(id: string, secret: string) {
  const db = await supabaseServer();
  const { data, error } = await db.rpc('fetch_shared_menu', { p_id: id, p_secret: secret });
  if (error) throw new Error(`fetch_shared_menu: ${error.message}`);
  return data as null | {
    date: string; title: string | null; language: 'en' | 'he';
    chef_notes: string | null;
    items: {
      course: CourseKey; position: number;
      dish_title: string | null; dish_title_en: string | null;
      description_en: string | null; description_he: string | null;
      credit_name: string | null;
    }[];
  };
}
