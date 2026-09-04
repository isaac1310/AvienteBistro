#!/usr/bin/env node
/* Photos nobody points at.
 *
 *   npm run photos:orphans                      list them (default — changes nothing)
 *   npm run photos:orphans -- --delete --zip <photos-backup.zip>
 *
 * An abandoned upload — photo chosen, edit cancelled — leaves an object in
 * recipe-photos that no recipe references. The photo backup's manifest names them
 * (`unreferenced`) but deliberately deletes nothing: a backup route is the wrong place
 * to delete anything. This is the deliberate place.
 *
 * Deleting is the ONLY hard delete in the product, so it is guarded by evidence, not
 * by a timestamp: `--delete` requires `--zip` pointing at a photos backup zip
 * (Settings → Download the photographs), and the tool refuses unless EVERY object it
 * would remove is listed in that zip's manifest.json. `last_backup_at` would not do —
 * it is stamped by the recipes JSON export, which contains no images.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const DELETE = args.includes('--delete');
const zipArg = args[args.indexOf('--zip') + 1];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
const envFile = resolve(root, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('✗ Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

/* Referenced by ANY recipe, deleted ones included: a trashed recipe can be restored,
   and its photograph must still be there when it is. */
const { data: recipes, error: rErr } = await db.from('recipes').select('photo_path').not('photo_path', 'is', null);
if (rErr) { console.error(`✗ ${rErr.message}`); process.exit(1); }
const referenced = new Set((recipes ?? []).map((r) => r.photo_path));

const { data: objects, error: oErr } = await db.storage.from('recipe-photos').list('', { limit: 1000 });
if (oErr) { console.error(`✗ ${oErr.message}`); process.exit(1); }
const orphans = (objects ?? []).map((o) => o.name).filter((n) => !referenced.has(n));

console.log(`${objects?.length ?? 0} objects in recipe-photos, ${referenced.size} referenced, ${orphans.length} orphan(s).`);
for (const n of orphans) console.log(`  ${n}`);
if (!orphans.length || !DELETE) {
  if (orphans.length) console.log('\nNothing deleted. To remove them: --delete --zip <photos-backup.zip>');
  process.exit(0);
}

/* The guard. */
if (!zipArg || !existsSync(zipArg)) {
  console.error('\n✗ Refusing to delete: --zip <photos-backup.zip> is required, and must exist.');
  console.error('  Take one first: Settings → Download the photographs.');
  process.exit(1);
}
/* Read manifest.json out of the zip without a zip library: the central directory
   lists file names; manifest.json is stored first and uncompressed (lib/zip.ts). */
const zip = readFileSync(zipArg);
const text = zip.toString('latin1');
const start = text.indexOf('{"');
const end = text.indexOf('"}', start);
let manifest;
try {
  manifest = JSON.parse(zip.subarray(start, text.indexOf('\n}', start) + 2).toString('utf8'));
} catch {
  try { manifest = JSON.parse(zip.subarray(start, end + 2).toString('utf8')); } catch { manifest = null; }
}
const inZip = new Set([
  ...((manifest?.files ?? []).map((f) => f.file ?? f)),
  ...(manifest?.unreferenced ?? []),
]);
const missing = orphans.filter((n) => !inZip.has(n) && !text.includes(n));
if (missing.length) {
  console.error(`\n✗ Refusing to delete: ${missing.length} orphan(s) are NOT in that zip:`);
  for (const n of missing) console.error(`  ${n}`);
  console.error('  Take a fresh photos backup and run again.');
  process.exit(1);
}

const { error: delErr } = await db.storage.from('recipe-photos').remove(orphans);
if (delErr) { console.error(`✗ ${delErr.message}`); process.exit(1); }
console.log(`\n✓ Deleted ${orphans.length} orphan(s). They remain in ${zipArg}.`);
