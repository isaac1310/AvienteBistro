/* Delete rows created by the test suite. Nothing else, ever.
 *
 *   npm run test:clean
 *
 * There is no separate test database -- by decision, the suite runs against the
 * one real project. That makes isolation the tests' job rather than the database's,
 * so every fixture they create is tagged, and this script deletes only tagged rows.
 *
 * It replaces an earlier reset script that truncated whole tables. Against the
 * only copy of the family's recipes, a truncate is not a reset; it is a loss.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

/** Every fixture the suite creates carries this. Tests that skip it leak rows. */
export const FIXTURE_TAG = '__test__';

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
  console.error(`
✗ Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.

  The service-role key is required because cleanup must reach rows regardless of
  who created them. Keep it local; it must never be set in Vercel.`);
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

/* Recipes: match the tag, and count first so a mistake is visible before it runs.
   ingredients/steps/revisions cascade from recipes, so they need no separate pass. */
const { data: doomed, error: findErr } = await db
  .from('recipes').select('id, title').like('external_ref', `${FIXTURE_TAG}%`);
if (findErr) { console.error(`✗ ${findErr.message}`); process.exit(1); }

/* The guard that matters: if a query for test fixtures ever returns one of the
   real recipes, something is wrong with the tagging and we stop rather than delete. */
const untagged = (doomed ?? []).filter((r) => !r.title.startsWith(FIXTURE_TAG)
  && !/^__/.test(r.title));
if (untagged.length) {
  console.error(`
✗ Refusing to delete. ${untagged.length} row(s) matched the fixture tag but do not
  look like fixtures:

${untagged.map((r) => `    ${r.title}`).join('\n')}

  Check the tagging in the test that created them before re-running.`);
  process.exit(1);
}

if (!doomed?.length) { console.log('nothing to clean.'); process.exit(0); }

const { error } = await db.from('recipes').delete().like('external_ref', `${FIXTURE_TAG}%`);
if (error) { console.error(`✗ ${error.message}`); process.exit(1); }

/* Menus and kids weeks are tagged through their title / week comment instead. */
await db.from('menus').delete().like('title', `${FIXTURE_TAG}%`);

console.log(`✓ removed ${doomed.length} test recipe(s) and any test menus.`);
console.log('  the 13 real recipes are untouched — they carry no fixture tag.');
