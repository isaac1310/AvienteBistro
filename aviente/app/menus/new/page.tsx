import MenuBuilder from '@/components/MenuBuilder';
import { occasionRules } from '@/lib/menus';
import { resolveOccasion } from '@/lib/occasion';
import { supabaseServer } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safeNext';
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
}: { searchParams: Promise<{ dish?: string; date?: string; meal?: string; returnTo?: string }> }) {
  const { dish, date, meal, returnTo } = await searchParams;
  const when = date ?? nextFriday();
  /* Where Cancel goes when the builder was entered from a recipe or a category
     selection. Validated like a login `next` — same phishing-hop risk — and '/'
     (safeNext's refusal value) means "no return context", so the builder falls
     back to /menus as before. */
  const back = safeNext(returnTo);
  const cancelTo = back === '/' ? null : back;

  const db = await supabaseServer();
  const [{ data: recipes }, rules] = await Promise.all([
    db.from('recipes')
      .select('id, title, title_en, category, photo_url, photo_path, servings, yield_text, prep_minutes, cook_minutes, source:family_members!recipes_source_member_id_fkey(name)')
      .is('deleted_at', null)
      .order('title'),
    occasionRules(),
  ]);

  const list: RecipeSummary[] = (recipes ?? []).map((r) => {
    const row = r as unknown as Omit<RecipeSummary, 'source_name'> & { source: { name: string } | null };
    const { source, ...rest } = row;
    return { ...rest, source_name: source?.name ?? null };
  });

  /* A new menu starts as an evening meal, because that is what a menu here almost
     always is. The builder can move it to a daytime meal, which is what decides
     whether the Shabbat and festival rules fire at all. */
  const mealTime = meal === 'day' ? 'day' as const : 'evening' as const;

  /* BOTH variants, resolved here and handed to the builder together.
     The alternative was a round trip on every flick of the toggle, or hebcal in the
     client bundle to work it out there. Two cheap calls on the server beat both, and
     the toggle becomes instant. */
  const occasion = {
    evening: resolveOccasion(new Date(`${when}T18:00:00`), 'evening', rules)?.title ?? null,
    day: resolveOccasion(new Date(`${when}T12:00:00`), 'day', rules)?.title ?? null,
  };

  return (
    <MenuBuilder
      recipes={list}
      occasion={occasion}
      cancelTo={cancelTo}
      initial={{
        date: when,
        meal_time: mealTime,
        title: null,
        language: 'he',
        chef_notes: null,
        /* null = follow the app default; see DEFAULT_COURSE_ORDER. */
        course_order: null,
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
