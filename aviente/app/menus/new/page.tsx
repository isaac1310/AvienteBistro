import MenuBuilder from '@/components/MenuBuilder';
import { occasionRules } from '@/lib/menus';
import { resolveOccasion } from '@/lib/occasion';
import { supabaseServer } from '@/lib/supabase/server';
import type { RecipeSummary } from '@/lib/constants';

export const metadata = { title: 'Aviente — Build a menu' };

/** The next Friday, since that is what a menu usually is. */
function nextFriday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}

export default async function NewMenuPage({
  searchParams,
}: { searchParams: Promise<{ dish?: string; date?: string }> }) {
  const { dish, date } = await searchParams;
  const when = date ?? nextFriday();

  const db = await supabaseServer();
  const [{ data: recipes }, rules] = await Promise.all([
    db.from('recipes')
      .select('id, title, title_en, category, photo_url, servings, yield_text, prep_minutes, cook_minutes, source:family_members!recipes_source_member_id_fkey(name)')
      .is('deleted_at', null)
      .order('title'),
    occasionRules(),
  ]);

  const list: RecipeSummary[] = (recipes ?? []).map((r) => {
    const row = r as unknown as Omit<RecipeSummary, 'source_name'> & { source: { name: string } | null };
    const { source, ...rest } = row;
    return { ...rest, source_name: source?.name ?? null };
  });

  // A menu with a main course is an evening meal, and that is what decides
  // whether the Shabbat rule fires at all.
  const occasion = resolveOccasion(new Date(`${when}T18:00:00`), 'evening', rules);

  return (
    <MenuBuilder
      recipes={list}
      occasionTitle={occasion?.title ?? null}
      initial={{
        date: when,
        title: null,
        language: 'he',
        chef_notes: null,
        /* ?dish= carries one id from a recipe page, or several from a category
           selection. Everything lands as a main — the usual case, and one tap
           from anything else in the builder. */
        items: dish
          ? dish.split(',').filter(Boolean).map((id) => ({
              recipe_id: id, course: 'main' as const,
            }))
          : [],
      }}
    />
  );
}
