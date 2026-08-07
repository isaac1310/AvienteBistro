import ImportPaste from '@/components/ImportPaste';
import Nav from '@/components/Nav';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata = { title: 'Aviente — Importer' };

export default async function ImportPage() {
  const db = await supabaseServer();
  const { data: members } = await db.from('family_members').select('id, name').order('name');
  return (
    <>
      <Nav current="/add" />
      <ImportPaste members={members ?? []} />
    </>
  );
}
