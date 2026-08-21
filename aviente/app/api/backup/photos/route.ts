import { NextResponse } from 'next/server';
import { makeZip, type ZipEntry } from '@/lib/zip';
import { supabaseServer, currentMember } from '@/lib/supabase/server';
import { todayIn } from '@/lib/today';

/* The other half of a backup (A2, deferred out of v0.10.0 and now in).
 *
 * /api/backup carries `photoPath` for every recipe, so a restore reconnects photos to
 * recipes — and the Storage objects themselves had no backup of any kind. Restoring
 * from the JSON alone gives every recipe with a photograph a dead path. This is the
 * missing file.
 *
 * The zip carries a manifest.json beside the images, because a folder of uuid.webp is
 * not a backup of anything a person can use: the manifest says which recipe each file
 * belonged to. If the images ever have to be re-attached by hand, that mapping is the
 * whole value of the archive.
 *
 * It also lists UNREFERENCED objects rather than dropping them. There are four in the
 * bucket today, left by replaced or abandoned uploads. A backup route is the wrong
 * place to delete anything, so they are archived and named — deciding what to remove
 * is a separate act, taken deliberately.
 */

export const runtime = 'nodejs';
/* Downloading a dozen objects one at a time is not fast, and the default 10s is not
   generous once the bucket has fifty. */
export const maxDuration = 60;

/* Vercel caps a serverless response at about 4.5MB. Refusing above a threshold is the
   point of having one: a backup that quietly stops being complete is worse than one
   that says it cannot be made. Today the bucket is 1.85MB across 13 objects; at ~150KB
   an image this holds until roughly twenty-five. */
const CEILING_BYTES = 4_000_000;

export async function GET() {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  /* Admin-only, server-side, for the same reason as the JSON export: the Settings
     section is hidden from members, and a route that still answered would make that
     hiding a curtain rather than a door. */
  if (member.role !== 'admin') {
    return NextResponse.json({ error: 'backups are managed by the admin' }, { status: 403 });
  }

  const db = await supabaseServer();

  const { data: objects, error: listErr } = await db.storage
    .from('recipe-photos').list('', { limit: 1000 });
  if (listErr) {
    return NextResponse.json({ error: `listing the bucket: ${listErr.message}` }, { status: 500 });
  }
  if (!objects?.length) {
    return NextResponse.json({ error: 'there are no photographs to back up yet' }, { status: 404 });
  }

  /* Measured BEFORE anything is downloaded. The whole purpose of the ceiling is to
     refuse early with a real number rather than to discover the limit halfway
     through and truncate. */
  const total = objects.reduce((n, o) => n + (o.metadata?.size ?? 0), 0);
  if (total > CEILING_BYTES) {
    return NextResponse.json({
      error: 'too large for one download',
      objects: objects.length,
      bytes: total,
      ceiling: CEILING_BYTES,
      /* Named, because "too large" with no way forward is a dead end. */
      remedy: 'Download the photographs from the Supabase Storage browser instead — '
        + 'this route exists for a bucket small enough to send in one response.',
    }, { status: 413 });
  }

  const { data: recipes } = await db
    .from('recipes')
    .select('title, category, photo_path')
    .not('photo_path', 'is', null)
    .is('deleted_at', null);

  const owner = new Map((recipes ?? []).map((r) => [r.photo_path as string, r]));

  /* Downloaded in parallel, six at a time.
     Sequentially this took over thirty seconds for thirteen images — each object is
     its own network round trip, so the wait was thirteen of them end to end, and at
     fifty images it would have run past the sixty-second limit and returned nothing
     at all. Six rather than unbounded: the point is to overlap the latency, not to
     open a socket per object and have Storage rate-limit the backup. */
  const LANES = 6;
  const entries: ZipEntry[] = [];
  const files: { file: string; recipe: string | null; category: string | null }[] = [];
  const failed: { file: string; why: string }[] = [];

  /* Results are collected into a slot per object rather than pushed as they land, so
     the zip's order is the bucket's order however the downloads interleave — that is
     what makes two backups of an unchanged bucket byte-identical. */
  const slots: (ZipEntry | null)[] = new Array(objects.length).fill(null);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(LANES, objects.length) }, async () => {
    for (let i = next++; i < objects.length; i = next++) {
      const object = objects[i];
      const { data: blob, error } = await db.storage.from('recipe-photos').download(object.name);
      if (error || !blob) {
        /* One unreadable object must not lose the other twelve. It is recorded in the
           manifest AND in a response header, so a partial archive can never be
           mistaken for a complete one. */
        failed.push({ file: object.name, why: error?.message ?? 'no data' });
        continue;
      }
      slots[i] = { name: `photos/${object.name}`, bytes: new Uint8Array(await blob.arrayBuffer()) };
    }
  }));

  for (let i = 0; i < objects.length; i++) {
    const slot = slots[i];
    if (!slot) continue;
    entries.push(slot);
    const r = owner.get(objects[i].name);
    files.push({ file: objects[i].name, recipe: r?.title ?? null, category: r?.category ?? null });
  }

  /* A recipe whose photo_path points at nothing. The opposite of an orphan, and the
     more serious of the two: the app has already met one of these. */
  const dangling = (recipes ?? [])
    .filter((r) => !objects.some((o) => o.name === r.photo_path))
    .map((r) => ({ recipe: r.title, path: r.photo_path }));

  const manifest = {
    exportedAt: new Date().toISOString(),   // the instant, in UTC, on purpose
    exportedBy: member.name,
    /* Deliberately NOT the app or schema version. This file describes a folder of
       images; the only thing it has to stay compatible with is a person reading it. */
    objects: entries.length,
    bytes: entries.reduce((n, e) => n + e.bytes.length, 0),
    files,
    unreferenced: files.filter((f) => !f.recipe).map((f) => f.file),
    dangling,
    failed,
    note: 'Restore the JSON backup first, then re-upload any photograph whose recipe '
      + 'lost it. `files` maps each image to the recipe it belonged to. `unreferenced` '
      + 'are objects no recipe points at — left by replaced uploads, safe to ignore. '
      + '`dangling` are recipes pointing at an image that is no longer in the bucket.',
  };
  entries.unshift({
    name: 'manifest.json',
    bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
  });

  const zip = makeZip(entries);
  /* The family's date, not the server's. toISOString() is UTC, so a backup taken
     after midnight in Jerusalem was named with yesterday's date — the same bug
     lib/today.ts exists for, and a backup filename is exactly the kind of thing
     somebody reads later to decide which file is newest. */
  const stamp = todayIn();

  return new NextResponse(zip as unknown as BodyInit, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="aviente-photos-${stamp}.zip"`,
      /* Readable without opening the file, and the reason the failure list exists at
         all: a silently short archive is the failure mode that matters here. */
      'x-aviente-objects': String(entries.length - 1),
      'x-aviente-failed': String(failed.length),
    },
  });
}
