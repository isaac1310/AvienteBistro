/* Truncate and re-seed the DEV Supabase project so a test run is deterministic.
 *
 *   npm run test:reset
 *
 * There is no local Postgres on this machine (no Docker, no Supabase CLI), so
 * "reset" is a truncate against a second free Supabase project rather than
 * `supabase db reset`. That makes the guard below the only thing standing between
 * a test run and the family archive, so it is deliberately loud and unskippable.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* Minimal .env.local reader -- no dependency needed for five lines. */
const env = { ...process.env };
const envFile = resolve(root, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const url = env.SUPABASE_DEV_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_DEV_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(`
✗ Missing SUPABASE_DEV_URL / SUPABASE_DEV_SERVICE_ROLE_KEY.

  Create a SECOND free Supabase project as the dev database, run the three
  migrations against it, and put its URL and service-role key in .env.local as
  SUPABASE_DEV_*. Do not reuse the production project: this script deletes rows.`);
  process.exit(1);
}

/* The guard. A dev project must be named or tagged as such; refusing by default
   is the right failure mode when the target is ambiguous. */
if (!/dev|staging|test/i.test(url) && env.ALLOW_UNSAFE_RESET !== 'yes') {
  console.error(`
✗ Refusing to truncate ${url}

  The project ref does not look like a dev database, and this script deletes every
  recipe, menu and kids week. If this really is the throwaway project, re-run with
  ALLOW_UNSAFE_RESET=yes -- but check twice: the production project holds recipes
  that exist nowhere else.`);
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

/* Child-first, so foreign keys never block the delete. */
const TABLES = [
  'kids_meals', 'kids_week',
  'menu_items', 'menus',
  'recipe_revisions', 'ingredients', 'steps', 'recipes',
  'family_members',
];

for (const table of TABLES) {
  const { error } = await db.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) { console.error(`✗ ${table}: ${error.message}`); process.exit(1); }
  console.log(`  cleared ${table}`);
}

console.log(`
✓ dev database cleared.

  Now re-seed it: paste supabase/seed.sql into the dev project's SQL editor.
  (Regenerate it first with \`npm run seed:build\` if the source recipes changed.)
  Automating the seed load needs a Postgres connection string rather than the
  REST API -- worth doing once the suite runs often enough to justify it.`);
