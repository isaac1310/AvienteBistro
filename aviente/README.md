# Aviente — the family recipe book

A private cookbook for one family: recipes in Hebrew (and English), printed menu
cards for Shabbat and holidays, a weekly planner for the kids' table, and a guest
link for a menu — nothing else public. Two editors, one database, phone first.

**Stack:** Next.js (App Router) on Vercel · Supabase (Postgres + Auth + Storage) ·
plain CSS modules with a token system · self-hosted fonts (`app/fonts/`) · no test
runner, by decision — the suite runs inside the app (`public/selftest.js`).

## Run it

```bash
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                        # :3000 — the app you click around in
```

Sign-in is a magic link to an email on the People list (`docs/ADDING-A-PERSON.md`).
The link only signs in the browser that asked for it.

## Before a PR

```bash
npm run prepr        # check-schema + typecheck + build
npm run dev:test     # :3001 — a PRODUCTION build on its own origin; run the suite there
open 'http://localhost:3001/?selftest=1'   # read window.__selftest, at 412px AND 1280px
```

Then `/regression` (Claude Code) drives the click catalogue in `tests/REGRESSION.md`
in a **signed-in** browser and writes a report to `tests/reports/`. A signed-out run is
red by construction — the DOM groups fail with "signed out" — so a green run is proof
of a real session. Rules, in order: red means no PR · an unexplained skip is a failure ·
never call a run green when anything skipped · the selftest is read-only · run both
widths. Full detail: `AGENTS.md`, `tests/REGRESSION.md`.

## Releasing

```bash
npm run release      # strict schema check + lint + typecheck + build + db-check
```

Bump `APP_VERSION` in `lib/version.ts` first — the footer and `window.__selftest.version`
are what prove a test pass was not against a cached build. Then the manual pass from
`tests/TEST-PLAN-v<version>.md` on the Ultra, against `:3001`.

## Migrations — the one rule that has caused every outage

`supabase/migrations/NNNN_*.sql`, applied by hand in the Supabase SQL editor. **A
migration ships in the same commit as the code that needs it, is applied BEFORE the
merge, bumps `DB_SCHEMA_VERSION` in `lib/version.ts`, and adds its probe to
`tools/check-schema.mjs` in that same commit.** Both outages this project has had were a
migration merged and never applied; `prepr` now refuses to build against a database that
is behind, and the app shows a banner. Take a backup first when a migration rewrites rows.

There is one database. Dev, the `:3001` sandbox and production all use it. Fixtures
are tagged `__test__`; `npm run test:clean` removes them. Never truncate.

## Backups — local, by hand, monthly

```bash
npm run backup-check    # builds the backup, proves the importer reads it, checks every
                        # photo path, writes /backups/aviente-backup-<date>.json, stamps
                        # last_backup_at. Exit 1 on any problem.
npm run photos:orphans  # lists Storage objects no recipe points at; --delete needs
                        # --zip <photos backup> and refuses unless every object is in it
```

The service-role key lives only in `.env.local` — never in Vercel, never in GitHub
(decision, v11.5.0: no CI, no secrets off this machine). Put a **monthly reminder** in
the calendar for `backup-check`; the Settings page shows how old the last backup is.
Photos are backed up from Settings → "Download the photographs".

## Where things are

| | |
|---|---|
| `app/` | routes — `recipes`, `menus`, `kids`, `print/*` (public print sheets), `m/[id]` (guest menu), `api/pdf`, `api/backup` |
| `components/` | one folder, CSS module beside each component |
| `lib/` | queries (reads), `mutations`/`menuMutations`/`kidsMutations` (server actions, snapshot-first), `i18n.ts` (Hebrew first), `occasion.ts` (hebcal rules), `recipeParse.mjs` (import/backup document), `backupDocument.mjs` |
| `supabase/migrations/` | numbered SQL, applied by hand |
| `tools/` | Node scripts: `check-schema`, `db-check`, `backup-check`, `orphan-photos`, `clean-test-fixtures`, asset builders |
| `tests/` | `REGRESSION.md` (the catalogue), `TEST-PLAN-v*.md` (Itzik's manual pass), `reports/` (gitignored) |
| `REMAINING.md` | dated backlog and decision log — re-audited against the code each release |
| `docs/ADDING-A-PERSON.md` | how a family member gets in |
