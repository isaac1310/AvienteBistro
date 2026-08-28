import KidsPlanner from '@/components/KidsPlanner';
import BackLink from '@/components/BackLink';
import Nav from '@/components/Nav';
import { serverT } from '@/lib/lang';
import { getKidsWeek, kidsRecipes, sundayOf } from '@/lib/kids';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata = { title: "Aviente — The Kids' Table" };

export default async function KidsPage({
  searchParams,
}: { searchParams: Promise<{ week?: string }> }) {
  const t = await serverT();
  const { week } = await searchParams;
  const weekStart = week ?? sundayOf();

  const db = await supabaseServer();
  const [{ meals }, recipes, { data: members }] = await Promise.all([
    getKidsWeek(weekStart),
    kidsRecipes(),
    db.from('family_members').select('id, name, display_name').order('name'),
  ]);

  return (
    <>
      <Nav current="/kids" />
      <div className="shell"><BackLink href="/" label={t('nav.home')} /></div>
      <KidsPlanner
        weekStart={weekStart}
        meals={meals}
        recipes={recipes}
        members={members ?? []}
      />
    </>
  );
}
