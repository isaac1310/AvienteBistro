import { NextResponse } from 'next/server';
import { supabaseServer, currentMember } from '@/lib/supabase/server';
/* The column list and the row→document mapping live in lib/backupDocument.mjs, shared
   with tools/backup-check.mjs — so the check verifies the SAME document this route
   writes, and a column added here cannot be forgotten there. The document's version
   is the parser's SCHEMA_VERSION (1), never lib/version.ts's migration counter: that
   mistake once stamped exports the importer refused. */
import { BACKUP_SELECT, toBackupDocument } from '@/lib/backupDocument.mjs';

type BackupRow = Parameters<typeof toBackupDocument>[0][number];

/* Whole-cookbook export (§8).
 *
 * The free Supabase tier takes no automated backups, and these recipes exist
 * nowhere else. This is the safety net.
 *
 * It emits the SAME shape the paste importer accepts, so export and import close
 * the loop: a backup file can be pasted straight back in. That is deliberate —
 * a backup in a format only this app can read is a bet that this app keeps
 * working.
 */
export async function GET() {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  /* Admin-only, and here rather than only in the UI: the Settings section is hidden
     from members, but a route that still answered anyone signed in would make that
     a curtain, not a door. The export is the entire cookbook in one file. */
  if (member.role !== 'admin') {
    return NextResponse.json({ error: 'backups are managed by the admin' }, { status: 403 });
  }

  const db = await supabaseServer();

  const { data: recipes, error } = await db
    .from('recipes')
    .select(BACKUP_SELECT)
    .is('deleted_at', null)
    .order('title');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const payload = toBackupDocument(recipes as unknown as BackupRow[], member.name);

  /* Stamp the singleton BEFORE handing the file over, so the Settings panel can
     answer "am I covered?" — it used to state that nothing is backed up
     automatically and then show three buttons and no state, which turns an honest
     warning into something you scroll past.
     Deliberately not awaited into the failure path: a stamp that did not write is
     not a reason to refuse a backup that did. The worst case is the panel
     under-reporting, which is the safe direction for this particular lie. */
  void db.from('family_settings').update({ last_backup_at: new Date().toISOString() }).eq('id', 1);

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="aviente-backup-${today}.json"`,
    },
  });
}
