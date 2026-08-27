#!/usr/bin/env node
/**
 * The write-path gate. `AGENTS.md` and `tests/REGRESSION.md` have required this file
 * for every release candidate since the beginning; it never existed, so nothing has
 * ever tested the parts of the app that WRITE.
 *
 * The in-app selftest is read-only by construction — rule 4 in AGENTS.md, and the
 * right rule, because there is one database and it holds the family's only copy of
 * these recipes. Everything that needs a write lives here instead:
 *
 *   1. anon is refused on every table (the security property the app depends on)
 *   2. the constraints added by recent migrations are actually enforced
 *   3. a tagged fixture can be created and removed again
 *
 * Never truncates. Every row it creates carries `__test__` in a text column and is
 * deleted in the same run; `npm run test:clean` sweeps anything a crash leaves.
 *
 * Read-only unless --write is passed, so the default is safe to run any time.
 */
import { readFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_ || !ANON) { console.error('db-check: no Supabase credentials'); process.exit(1); }

let pass = 0; const fails = [];
const ok = (name) => { pass += 1; console.log(`  pass  ${name}`); };
const bad = (name, why) => { fails.push(`${name}: ${why}`); console.log(`  FAIL  ${name} — ${why}`); };

const anonGet = (q) => fetch(`${URL_}/rest/v1/${q}`, {
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
}).then(async (r) => ({ status: r.status, body: await r.text() }));

/* ── 1 · anon is refused everywhere it must be ───────────────────────────────
   The whole privacy model is that a stranger with the publishable key sees nothing.
   `occasion_rules` is the deliberate exception: a guest opening a shared menu card
   needs it to know whether to draw candles. */
console.log('\nanon access');
const LOCKED = ['recipes', 'ingredients', 'steps', 'menus', 'menu_items',
  'family_members', 'kids_meals', 'kids_week', 'recipe_revisions', 'menu_revisions',
  /* Added because anon CAN reach this one: Supabase grants SELECT on new tables by
     default and only RLS filters it, which is how the schema banner once told guests
     the database was empty. */
  'schema_migrations'];
for (const table of LOCKED) {
  const { status, body } = await anonGet(`${table}?select=*&limit=1`);
  /* A 200 with rows is the failure that matters. A 200 with [] means RLS filtered
     everything, which is the same outcome — but it is worth distinguishing, because
     Supabase's default GRANTs let anon reach new tables and only RLS stops them. */
  if (status === 200 && body.trim() !== '[]') bad(`${table} refuses anon`, `returned DATA (${status})`);
  else if (status === 200) ok(`${table} yields nothing to anon (RLS filtered)`);
  else ok(`${table} refuses anon (${status})`);
}
{
  const { status, body } = await anonGet('occasion_rules?select=id&limit=1');
  if (status === 200 && body.trim() !== '[]') ok('occasion_rules IS readable by anon (intended)');
  else bad('occasion_rules readable by anon', `guests cannot draw candles (${status})`);
}

/* ── 1b · the doorman is on duty ─────────────────────────────────────────────
   Since 0019 signup is ON and the before-user-created hook is the access gate. The
   only way to test a gate is to knock: ask for an OTP for an email that is on no
   list. Expect refusal — the hook's 403, or "signups not allowed" before the 0019
   setup is done (older gate, still closed). A 200 means THE DOOR IS OPEN: signups
   were enabled without the hook attached, a stranger can walk in, and this run just
   created a junk account (door-check-…@example.invalid) that proves it — delete it
   in Authentication → Users after closing the door. Creating that account is the
   cost of the only honest test; every other probe here would pass while the door
   stood open. */
console.log('\nsignup doorman');
{
  const email = `door-check-${Date.now()}@example.invalid`;
  const r = await fetch(`${URL_}/auth/v1/otp`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, create_user: true }),
  });
  const body = await r.text();
  if (r.ok) bad('unknown email is refused', `THE DOOR IS OPEN — signup returned ${r.status}; hook not attached? Junk account ${email} was created and must be deleted.`);
  else if (body.includes('family list')) ok('unknown email refused by the hook, with its own message');
  else ok(`unknown email refused (${r.status} — pre-0019 gate or rate limit; body: ${body.slice(0, 80)})`);
}

/* ── 2 · the constraints exist ───────────────────────────────────────────────
   Checked by asking Postgres to break them. A CHECK that was never exercised is a
   comment. anon cannot insert, so these run only with --write and a service key. */
console.log('\nconstraints');
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!WRITE) {
  console.log('  skip  constraint checks — read-only run, pass --write to exercise them');
} else if (!SERVICE) {
  console.log('  skip  constraint checks — SUPABASE_SERVICE_ROLE_KEY is empty in .env.local');
} else {
  const svc = (path, init) => fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
      'content-type': 'application/json', Prefer: 'return=representation',
      ...(init?.headers ?? {}),
    },
  });

  /* kids_week must start on a Sunday (0010). Tuesday must be rejected. */
  const tue = await svc('kids_week', {
    method: 'POST', body: JSON.stringify({ week_start: '2026-08-04' }),
  });
  if (tue.ok) {
    bad('kids_week rejects a non-Sunday', 'a Tuesday was accepted');
    const row = await tue.json();
    await svc(`kids_week?id=eq.${row[0].id}`, { method: 'DELETE' });
  } else ok('kids_week rejects a non-Sunday');

  /* meal_time is 'evening' | 'day' (0008). */
  const bogus = await svc('menus', {
    method: 'POST',
    body: JSON.stringify({ date: '2026-08-07', meal_time: 'brunch', title: '__test__' }),
  });
  if (bogus.ok) {
    bad('menus.meal_time rejects an unknown value', "'brunch' was accepted");
    const row = await bogus.json();
    await svc(`menus?id=eq.${row[0].id}`, { method: 'DELETE' });
  } else ok('menus.meal_time rejects an unknown value');

  /* role is 'admin' | 'member' (0012). */
  const badRole = await svc('family_members', {
    method: 'POST', body: JSON.stringify({ name: '__test__role', role: 'owner' }),
  });
  if (badRole.ok) {
    bad('family_members.role rejects an unknown value', "'owner' was accepted");
    const row = await badRole.json();
    await svc(`family_members?id=eq.${row[0].id}`, { method: 'DELETE' });
  } else ok('family_members.role rejects an unknown value');

  /* ── 2c · function-only migrations, which check-schema CANNOT see ─────────
     tools/check-schema.mjs probes for COLUMNS, because it runs with the anon key and
     RLS hides schema_migrations from anyone without a session. That works for every
     migration that adds a column and is blind to one that only rewrites a function —
     migration 16 rewrote fetch_shared_menu to return course_order, and an unapplied
     16 fails silently: shared cards print the DEFAULT running order while the owner's
     card prints the chosen one. Nothing errors; the guest simply sees a different
     menu. So the assertion lives here, where the service key can read the table. */
  console.log('\nfunction-only migrations');
  const applied = await svc('schema_migrations?select=version&order=version.desc&limit=1');
  if (!applied.ok) bad('read schema_migrations', await applied.text());
  else {
    const [top] = await applied.json();
    const need = Number(
      readFileSync(new URL('../lib/version.ts', import.meta.url), 'utf8')
        .match(/DB_SCHEMA_VERSION = (\d+)/)?.[1],
    );
    if (top?.version >= need) ok(`schema_migrations is at ${top.version}, build needs ${need}`);
    else bad('the database is behind', `schema_migrations is at ${top?.version}, build needs ${need}`);
  }

  /* ── 3 · a tagged fixture round-trips and is removed ─────────────────────── */
  console.log('\nfixture round trip');
  const made = await svc('family_members', {
    method: 'POST', body: JSON.stringify({ name: '__test__fixture', role: 'member' }),
  });
  if (!made.ok) bad('create a __test__ fixture', await made.text());
  else {
    const [row] = await made.json();
    const gone = await svc(`family_members?id=eq.${row.id}`, { method: 'DELETE' });
    if (gone.ok) ok('a __test__ fixture is created and removed again');
    else bad('remove the __test__ fixture', `id ${row.id} is still there — run npm run test:clean`);
  }
}

console.log(`\ndb-check: ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.error(`  ${f}`); process.exit(1); }
