import { notFound } from 'next/navigation';
import MenuBuilder from '@/components/MenuBuilder';
import { getMenu, occasionRules } from '@/lib/menus';
import { resolveOccasion } from '@/lib/occasion';
import { supabaseServer } from '@/lib/supabase/server';
import type { CourseKey, RecipeSummary } from '@/lib/constants';

export const metadata = { title: 'Aviente — Editing a menu' };

/* Editing an existing menu. The builder is the same component as /menus/new —
 * it just arrives with the menu already loaded, so changing one dish does not
 * mean rebuilding the evening from scratch. */
export default async function EditMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServer();

  const [menu, { data: recipes }, rules] = await Promise.all([
    getMenu(id),
    db.from('recipes')
      .select('id, title, title_en, category, photo_url, photo_path, servings, yield_text, prep_minutes, cook_minutes, source:family_members!recipes_source_member_id_fkey(name)')
      .is('deleted_at', null)
      .order('title'),
    occasionRules(),
  ]);

  if (!menu) notFound();

  const list: RecipeSummary[] = (recipes ?? []).map((r) => {
    const row = r as unknown as Omit<RecipeSummary, 'source_name'> & { source: { name: string } | null };
    const { source, ...rest } = row;
    return { ...rest, source_name: source?.name ?? null };
  });

  /* Both variants, so the lunch/dinner toggle does not need a round trip. */
  const occasion = {
    evening: resolveOccasion(new Date(`${menu.date}T18:00:00`), 'evening', rules)?.title ?? null,
    day: resolveOccasion(new Date(`${menu.date}T12:00:00`), 'day', rules)?.title ?? null,
  };


  return (
    <MenuBuilder
      recipes={list}
      occasion={occasion}
      initial={{
        id: menu.id,
        date: menu.date,
        meal_time: menu.meal_time,
        title: menu.title,
        language: menu.language,
        chef_notes: menu.chef_notes,
        course_order: menu.course_order,
        /* Rows whose recipe was since deleted are dropped rather than crashing —
           the card keeps its snapshot, but you cannot re-edit a dish that no
           longer exists. */
        /* The per-dish note is READ BACK, and it has to be. Saving writes it into
           dish_description_{he,en} — the card's snapshot columns — so leaving it out
           here handed the builder a blank note field, and the next save wrote that
           blank over the line someone had typed. Editing a menu to move one dish
           silently erased every card note on it.
           Which column: the menu's own card language, falling back to the other, the
           same order MenuCard reads them in. A description inherited from the recipe
           comes back as an explicit note, which is right for an archive — a menu is a
           snapshot, and a card already sent should not change because a recipe was
           later edited. */
        items: menu.items
          .filter((i) => i.recipe_id)
          .map((i) => ({
            recipe_id: i.recipe_id as string,
            course: i.course as CourseKey,
            note: (menu.language === 'he'
              ? i.dish_description_he ?? i.dish_description_en
              : i.dish_description_en ?? i.dish_description_he) ?? null,
          })),
      }}
    />
  );
}
