import ImportPaste from '@/components/ImportPaste';
import BackLink from '@/components/BackLink';
import Nav from '@/components/Nav';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata = { title: 'Aviente — Importer' };

export default async function ImportPage() {
  const db = await supabaseServer();
  const { data: members } = await db.from('family_members').select('id, name').order('name');
  return (
    <>
      <Nav current="/add" />
      {/* These two screens are a bare client component, so the back link needs a
          strip of its own rather than a header to sit in. */}
      <div className="shell"><BackLink href="/add" label="Add" /></div>
      <ImportPaste members={members ?? []} />
    </>
  );
}
