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

/* Recipes first, when there are any. The early exit here used to be
   `if (!doomed.length) process.exit(0)` — which skipped the MENU cleanup below
   entirely, so a run that created a fixture menu and no fixture recipe reported
   "nothing to clean" and left the menu in the database. Found the first time a test
   needed a menu and not a recipe. Each table is now cleaned on its own terms. */
if (doomed?.length) {
  const { error } = await db.from('recipes').delete().like('external_ref', `${FIXTURE_TAG}%`);
  if (error) { console.error(`✗ ${error.message}`); process.exit(1); }
}

/* Menus and kids weeks are tagged through their title / week comment instead.
   menu_items cascade from menus. */
const { data: menus, error: menuErr } = await db
  .from('menus').select('id').like('title', `${FIXTURE_TAG}%`);
if (menuErr) { console.error(`✗ ${menuErr.message}`); process.exit(1); }
if (menus?.length) {
  const { error } = await db.from('menus').delete().like('title', `${FIXTURE_TAG}%`);
  if (error) { console.error(`✗ ${error.message}`); process.exit(1); }
}

/* Kids dishes are tagged through their free text — the only field a test can write
   freely. Added when free-text dishes arrived and a verification run left
   "__test__ bread and white cheese" sitting in Friday dinner: a fixture this script
   could not see is a fixture that becomes real data. */
const { data: kids, error: kidsErr } = await db
  .from('kids_meals').select('id').like('free_text', `${FIXTURE_TAG}%`);
if (kidsErr) { console.error(`✗ ${kidsErr.message}`); process.exit(1); }
if (kids?.length) {
  const { error } = await db.from('kids_meals').delete().like('free_text', `${FIXTURE_TAG}%`);
  if (error) { console.error(`✗ ${error.message}`); process.exit(1); }
}

if (!doomed?.length && !menus?.length && !kids?.length) {
  console.log('nothing to clean.'); process.exit(0);
}

console.log(`✓ removed ${doomed?.length ?? 0} test recipe(s), ${menus?.length ?? 0} test menu(s), ${kids?.length ?? 0} test kids dish(es).`);

/* Counted, not remembered. This line used to read "the 13 real recipes are
   untouched" — a number hardcoded when the book held 13 recipes, printed as
   reassurance long after it held forty. A delete tool that states a stale count is
   worse than one that states none: the one thing it is for is being trusted. */
const { count } = await db
  .from('recipes').select('id', { count: 'exact', head: true }).is('deleted_at', null);
console.log(`  ${count ?? '?'} real recipes untouched — they carry no fixture tag.`);
