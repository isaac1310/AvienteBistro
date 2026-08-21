#!/usr/bin/env node
/**
 * Refuse to ship code the database cannot run.
 *
 * Part of `npm run prepr`, because both outages this project has had were the same
 * event: a migration merged and never applied. 0008 took /menus down in production;
 * 0011 took every recipe page down. The banner explains the state after the fact —
 * this stops it shipping.
 *
 * Compares DB_SCHEMA_VERSION (lib/version.ts) with the highest row in
 * public.schema_migrations, read with the anon key. RLS filters rows from anon, so
 * the read goes through a security-definer-free path: PostgREST HEAD with count is
 * also filtered — so instead we accept ONLY hard evidence:
 *   - table missing (PGRST205)          → behind, fail
 *   - column probe on a known migration → present/missing per version
 *
 * The probe: each migration that added a column is checked directly, newest first.
 * A missing column is 42703 regardless of RLS, so anon can measure it — the same
 * trick lib/schema.ts uses, without needing to see any rows.
 *
 * OFFLINE IS NOT A FAILURE — for DEVELOPMENT. prepr must still run on a train: no
 * network → warn and pass. Only a real answer saying the database is behind fails the
 * build.
 *
 * That default has a cost worth naming, because a reviewer hit it: `npm run prepr`
 * reported success on a machine that could not reach Supabase, so a release looked
 * green with the schema NOT verified — and both outages this project has had were an
 * unapplied migration. Two modes now, and the release one fails closed:
 *
 *   npm run prepr     dev — offline warns and passes
 *   npm run release   pre-PR — offline is a FAILURE (CHECK_SCHEMA_STRICT=1)
 *
 * A skip that can be mistaken for a pass is the same class of bug as a selftest check
 * that skips itself.
 */
const STRICT = process.env.CHECK_SCHEMA_STRICT === '1';

/** Cannot verify. A warning in dev; in strict mode, a failed build. */
function unverified(reason) {
  if (STRICT) {
    console.error(
      `check-schema: ${reason} — and CHECK_SCHEMA_STRICT=1, so this is a FAILURE.\n` +
      '  A release must not be cut against an unverified database. Get on a network,\n' +
      '  or run npm run prepr if you are deliberately building offline.',
    );
    process.exit(1);
  }
  console.warn(`check-schema: ${reason} — SKIPPED, not verified.`);
  process.exit(0);
}
import { readFileSync } from 'node:fs';

const version = readFileSync(new URL('../lib/version.ts', import.meta.url), 'utf8');
const need = Number(version.match(/DB_SCHEMA_VERSION = (\d+)/)?.[1]);
if (!need) { console.error('check-schema: could not read DB_SCHEMA_VERSION'); process.exit(1); }

let env = {};
try {
  env = Object.fromEntries(
    readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
      .split('\n').filter((l) => l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
} catch { /* no .env.local — CI without secrets; treated as offline below */ }

const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) unverified('no Supabase credentials available');

/* One probe per migration that changed a queryable shape. Newest first: the first
   probe that answers "present" proves everything at or below its version.
   MAINTENANCE RULE, stated where it bites: a new migration that adds a column adds
   a probe here in the same commit — that is what prepr then enforces for everyone
   after you. */
/* These probes DO see through RLS, which is worth recording because it looks as
   though they could not: kids_meals and menus both refuse anon outright. PostgREST
   parses the column list BEFORE checking privileges, so a missing column answers
   42703 (400) while an existing column on a protected table answers 42501 (401) —
   two different codes, and `missing()` below tests for the first. Checked against the
   live database rather than reasoned about, because if it were the other way round
   every probe on a protected table would pass unconditionally and this whole gate
   would be theatre.

   WHAT THIS CANNOT SEE, stated where it bites: these probes ask for COLUMNS, because
   this script runs with the anon key and RLS hides schema_migrations from anyone
   without a session. A migration that only rewrites a FUNCTION adds no column, so it
   is invisible here — migration 16 rewrote fetch_shared_menu and is covered by
   tools/db-check.mjs instead, which has the service key and reads schema_migrations
   directly. Hence 16 maps to 15's column: reaching 15 is all this gate can prove, and
   claiming more would be the fail-open behaviour the block below exists to prevent. */
const PROBES = [
  /* 18 adds only ROWS (the two credit-only chefs), so there is no column to ask for
     and it is invisible here — same blind spot as 16, covered by db-check, which
     reads schema_migrations with the service key. It maps to 17's probe: reaching 17
     is all this gate can prove. */
  [18, 'kids_meals?select=id,free_text&limit=1'],
  [17, 'kids_meals?select=id,free_text&limit=1'],
  [16, 'menus?select=id,course_order&limit=1'],
  [15, 'menus?select=id,course_order&limit=1'],
  [14, 'family_members?select=id,language&limit=1'],
  [13, 'recipes?select=id,created_at&limit=1'],
  [12, 'family_members?select=id,role&limit=1'],
  [11, 'recipes?select=id,photo_path&limit=1'],
  [10, 'kids_week?select=id,week_start&limit=1'],
  [9,  'schema_migrations?select=version&limit=1'],
  [8,  'menus?select=id,meal_time&limit=1'],
];

const missing = (t) => /PGRST205|42703/.test(t);

let have = 0;
try {
  for (const [v, probe] of PROBES) {
    const res = await fetch(`${url}/rest/v1/${probe}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.text();
    if (!missing(body)) { have = v; break; }
  }
} catch (e) {
  unverified(`network unreachable (${e?.cause?.code ?? e.message})`);
}

/* A build that needs a version NO PROBE covers is a build whose migration shipped
   without its probe — and capping the requirement to the highest probe (the first
   version of this line) made the guard PASS in exactly that case. The check would
   have failed open for every future migration, forever, silently. It fails closed
   instead: the fix is one probe line, in the same commit as the migration. */
if (need > PROBES[0][0]) {
  console.error(
    `check-schema: DB_SCHEMA_VERSION is ${need} but the newest probe here covers ${PROBES[0][0]}.\n` +
    `  Add a probe for migration ${need} to tools/check-schema.mjs in the same commit —\n` +
    `  without it this guard cannot verify the database and would pass on a broken one.`,
  );
  process.exit(1);
}

if (have >= need) {
  console.log(`check-schema: database has migration ${have}, build needs ${need} — OK`);
  process.exit(0);
}

console.error(
  `check-schema: the DATABASE IS BEHIND — it has migration ${have}, this build needs ${need}.\n` +
  `  Run supabase/migrations/${String(have + 1).padStart(4, '0')}_*.sql onward in the SQL editor,\n` +
  `  then re-run. Merging now repeats the outage that took the recipe pages down.`,
);
process.exit(1);
