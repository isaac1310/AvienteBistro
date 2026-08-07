import KidsPlanner from '@/components/KidsPlanner';
import Nav from '@/components/Nav';
import { getKidsWeek, kidsRecipes, mondayOf } from '@/lib/kids';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata = { title: "Aviente — The Kids' Table" };

export default async function KidsPage({
  searchParams,
}: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const weekStart = week ?? mondayOf();

  const db = await supabaseServer();
  const [{ meals }, recipes, { data: members }] = await Promise.all([
    getKidsWeek(weekStart),
    kidsRecipes(),
    db.from('family_members').select('id, name').order('name'),
  ]);

  return (
    <>
      <Nav current="/" />
      <KidsPlanner
        weekStart={weekStart}
        meals={meals}
        recipes={recipes}
        members={members ?? []}
      />
    </>
  );
}
