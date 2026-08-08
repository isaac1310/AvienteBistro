import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Turn stored photo PATHS into URLs that work right now.
 *
 * The bucket is private, so every URL is temporary by nature. Photos used to be
 * stored as signed URLs with a one-year expiry, minted once at upload — which meant
 * each recipe carried a link with a hidden expiry date on it, and a year later the
 * picture would vanish with nothing to distinguish that from a deleted file.
 *
 * Paths do not expire. Signing happens here, per request, for an hour: long enough
 * that a page open on the counter through a long bake still shows its photograph,
 * short enough that a URL copied out of the page is not a lasting key to the bucket.
 */

const BUCKET = 'recipe-photos';
const TTL_SECONDS = 60 * 60;

export type WithPhoto = { photo_path?: string | null; photo_url?: string | null };

/**
 * Sign every distinct path in one call and write the result back onto `photo_url`.
 *
 * Deliberately mutates `photo_url` rather than introducing a new field: every
 * component already reads `photo_url` and means "a URL I can put in an img tag",
 * which is exactly what it now receives. The column of the same name holds the old
 * signed URLs and is only a fallback.
 *
 * One request for the whole list, not one per row — a category of thirty recipes
 * would otherwise make thirty round trips before it could render.
 */
export async function attachPhotoUrls<T extends WithPhoto>(
  db: SupabaseClient,
  rows: T[],
): Promise<T[]> {
  const paths = [...new Set(rows.map((r) => r.photo_path).filter((p): p is string => !!p))];
  if (!paths.length) return rows;

  const { data, error } = await db.storage.from(BUCKET).createSignedUrls(paths, TTL_SECONDS);
  /* A signing failure is not worth failing the page over: the recipes are the
     content, the photograph is decoration, and the blueprint plate is a perfectly
     good stand-in. Fall back to whatever legacy URL the row already had. */
  if (error || !data) return rows;

  const byPath = new Map(data.filter((d) => d.signedUrl).map((d) => [d.path ?? '', d.signedUrl]));
  for (const row of rows) {
    if (row.photo_path && byPath.has(row.photo_path)) row.photo_url = byPath.get(row.photo_path)!;
  }
  return rows;
}

/** One row. Same rules. */
export async function attachPhotoUrl<T extends WithPhoto>(db: SupabaseClient, row: T): Promise<T> {
  const [out] = await attachPhotoUrls(db, [row]);
  return out;
}
