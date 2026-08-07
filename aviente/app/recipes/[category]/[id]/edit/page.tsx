import { notFound } from 'next/navigation';
import RecipeForm from '@/components/RecipeForm';
import { getRecipe } from '@/lib/queries';
import { supabaseServer } from '@/lib/supabase/server';

type Params = { params: Promise<{ category: string; id: string }> };

export const metadata = { title: 'Aviente — Editing' };

export default async function EditPage({ params }: Params) {
  const { id } = await params;
  const db = await supabaseServer();
  const [recipe, { data: members }] = await Promise.all([
    getRecipe(id),
    db.from('family_members').select('id, name').order('name'),
  ]);
  if (!recipe) notFound();

  return <RecipeForm recipe={recipe} members={members ?? []} />;
}
