#!/usr/bin/env node
/* Prove the backup — not just take it.
 *
 *   npm run backup-check
 *
 * A backup is worth something only if it is recent, complete, and readable by the
 * thing that has to read it back. This builds the SAME document the Settings button
 * downloads (lib/backupDocument.mjs — one definition, shared with the API route), then:
 *
 *   1. runs it through the importer's normalizeDocument — the parser that a restore
 *      will actually use — and refuses if it rejects anything;
 *   2. checks the count against the live non-deleted recipes;
 *   3. checks every recipe has at least one ingredient or step (an empty shell is a
 *      title, not a recipe);
 *   4. checks every photoPath exists in the recipe-photos bucket (a dangling path is a
 *      restore that will silently lose a photograph);
 *   5. writes /backups/aviente-backup-<date>.json (gitignored) and stamps
 *      family_settings.last_backup_at, because this IS a recipes backup.
 *
 * Any failure exits 1. Local only — the service-role key stays in .env.local and is
 * never put in GitHub or Vercel (decision, v11.5.0). Run it monthly; the README says
 * where the reminder lives.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { BACKUP_SELECT, toBackupDocument } from '../lib/backupDocument.mjs';
import { normalizeDocument, SCHEMA_VERSION } from '../lib/recipeParse.mjs';

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
  console.error('✗ Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local. Keep the key local.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const problems = [];
const fail = (msg) => problems.push(msg);

const { data: rows, error } = await db.from('recipes').select(BACKUP_SELECT)
  .is('deleted_at', null).order('title');
if (error) { console.error(`✗ ${error.message}`); process.exit(1); }

const { count: live } = await db.from('recipes').select('id', { count: 'exact', head: true })
  .is('deleted_at', null);

const doc = toBackupDocument(rows, 'backup-check');

/* 1 — the importer must accept its own backup. */
if (doc.schemaVersion !== SCHEMA_VERSION) fail(`schemaVersion ${doc.schemaVersion} ≠ importer's ${SCHEMA_VERSION}`);
const parsed = normalizeDocument(doc);
if (parsed.errors?.length) fail(`importer refused ${parsed.errors.length} recipe(s):\n    ${parsed.errors.slice(0, 5).join('\n    ')}`);
if ((parsed.recipes?.length ?? 0) !== doc.recipes.length) {
  fail(`importer read ${parsed.recipes?.length ?? 0} of ${doc.recipes.length} recipes`);
}

/* 2 — complete. */
if (live != null && doc.recipes.length < live) fail(`document has ${doc.recipes.length} recipes, the book has ${live}`);

/* 3 — no empty shells. */
const shells = doc.recipes.filter((r) => !r.ingredients.length && !r.steps.length);
if (shells.length) fail(`${shells.length} recipe(s) have no ingredients and no steps:\n    ${shells.map((r) => r.title).join('\n    ')}`);

/* 4 — every photo path resolves. */
const { data: objects, error: listErr } = await db.storage.from('recipe-photos').list('', { limit: 1000 });
if (listErr) fail(`could not list recipe-photos: ${listErr.message}`);
const present = new Set((objects ?? []).map((o) => o.name));
const dangling = doc.recipes.filter((r) => r.photoPath && !present.has(r.photoPath));
if (dangling.length) fail(`${dangling.length} recipe(s) point at a photo that is not in the bucket:\n    ${dangling.map((r) => `${r.title} → ${r.photoPath}`).join('\n    ')}`);

/* 5 — write it, stamp it. */
const dir = resolve(root, 'backups');
mkdirSync(dir, { recursive: true });
const file = resolve(dir, `aviente-backup-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(file, JSON.stringify(doc, null, 2));

if (problems.length) {
  console.error(`\n✗ backup-check: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(`  • ${p}`);
  console.error(`\n  The document was still written to ${file} — read it before trusting it.`);
  process.exit(1);
}

const { error: stampErr } = await db.from('family_settings')
  .update({ last_backup_at: new Date().toISOString() }).eq('id', 1);
if (stampErr) console.warn(`  (last_backup_at not stamped: ${stampErr.message})`);

console.log(`✓ backup-check: ${doc.recipes.length} recipes, ${doc.recipes.reduce((n, r) => n + r.ingredients.length, 0)} ingredients, ${doc.recipes.reduce((n, r) => n + r.steps.length, 0)} steps — importer accepts it, every photo path resolves.`);
console.log(`  written: ${file}`);
