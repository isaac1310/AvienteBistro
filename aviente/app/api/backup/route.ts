import { NextResponse } from 'next/server';
import { supabaseServer, currentMember } from '@/lib/supabase/server';
/* The DOCUMENT format version, from the parser that has to read this file back — not
   the migration counter in lib/version.ts. Importing that one instead stamped every
   export with schemaVersion 11 while lib/recipeParse.mjs accepts only 1, so the
   importer refused its own backups. The button whose entire job is disaster recovery
   was producing files it could not restore. */
import { SCHEMA_VERSION as DOCUMENT_VERSION } from '@/lib/recipeParse.mjs';

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

  const db = await supabaseServer();

  const { data: recipes, error } = await db
    .from('recipes')
    .select(`title, title_en, category, meal_type, description_he, description_en,
             story, serving_suggestions, prep_minutes, cook_minutes, servings,
             yield_text, external_ref, updated_at,
             source:family_members!recipes_source_member_id_fkey(name),
             photo_path,
             ingredients(position, name, amount, amount_max, unit, note, group_label),
             steps(position, heading, body)`)
    .is('deleted_at', null)
    .order('title');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = {
    title: string; title_en: string | null; category: string; meal_type: string | null;
    description_he: string | null; description_en: string | null;
    story: string | null; serving_suggestions: string | null;
    prep_minutes: number | null; cook_minutes: number | null;
    servings: number | null; yield_text: string | null;
    external_ref: string | null; updated_at: string; photo_path: string | null;
    source: { name: string } | null;
    ingredients: { position: number; name: string; amount: number | null;
                   amount_max: number | null; unit: string | null; note: string | null;
                   group_label: string | null }[];
    steps: { position: number; heading: string | null; body: string }[];
  };

  const payload = {
    schemaVersion: DOCUMENT_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy: member.name,
    recipes: (recipes as unknown as Row[]).map((r) => ({
      title: r.title,
      titleEn: r.title_en,
      category: r.category,
      mealType: r.meal_type,
      servings: r.servings,
      yieldText: r.yield_text,
      prepMinutes: r.prep_minutes,
      cookMinutes: r.cook_minutes,
      source: r.source?.name ?? null,
      descriptionHe: r.description_he,
      descriptionEn: r.description_en,
      story: r.story,
      servingSuggestions: r.serving_suggestions,
      externalRef: r.external_ref,
      /* Where the photograph lives in Storage. On its own it does not restore the
         image — that needs the companion zip from /api/backup/photos — but without it
         a restore cannot reconnect a recovered file to its recipe. */
      photoPath: r.photo_path,
      // Sorted here, because child-row order is meaning and the export is the
      // last copy anyone may ever read.
      ingredients: [...r.ingredients].sort((a, b) => a.position - b.position)
        .map((i) => ({
          name: i.name, amount: i.amount, amountMax: i.amount_max,
          unit: i.unit, note: i.note,
          /* Sub-group headings ("מילוי", "רוטב"). Dropped until now, so a restore
             flattened every grouped recipe into one undifferentiated list — the same
             field that silently vanished once already during the markdown import. */
          group: i.group_label,
        })),
      steps: [...r.steps].sort((a, b) => a.position - b.position)
        .map((s) => ({ heading: s.heading, body: s.body })),
    })),
  };

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="aviente-backup-${today}.json"`,
    },
  });
}
