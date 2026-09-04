# What is actually left

Re-audited 4 Sep 2026 for v11.5.0, against the code rather than against the last
version of this file. Everything below was checked; nothing is carried forward on
trust. (The last rewrite was for v11.1.0 and by v11.4.1 it listed transactional saves
and a recipe trash as open — both had shipped. A stale plan is read as evidence.)

## Open · after v11.5.0

- **Import / restore are still per-recipe multi-writes.** `lib/importMutations.ts`
  snapshots first and checks every result, so a failure loses one recipe's display and
  says so; recipe and menu SAVES are transactional (0021). Extending `save_recipe_tx`
  to carry `import_batch_id` and the replace path's preserve-flags is the remaining
  step. Not urgent: the importer is failure-isolated per row.
- **Typo-tolerant search** was considered and dropped: `pg_trgm` is enabled and the GIN
  index exists (`0001_init.sql:9,148`) but similarity on short Hebrew words is noisy.
  Search is `ILIKE` over the trigger-maintained `search_text`, with category / chef /
  time filters (v11.5.0). Revisit at a few hundred recipes.
- **OTP code sign-in** as a fallback to the magic link (a link only signs in the
  browser that asked for it; the screen now says so). Deferred.
- **A shared Dialog/Sheet primitive** with focus trap + Escape for the menu, kids,
  history and photo pickers. `Confirm` has it; the pickers do not. Deferred.
- **Local draft recovery** for the recipe form (crash, closed tab, expired session).
  The dirty guard covers deliberate navigation only. Deferred.
- **Touch drag in the recipe form** is unverified on the Ultra; ↑↓ buttons are the
  guaranteed path.
- **The kids' fridge sheet has never been printed on paper.** Layout caps a cell at
  four dishes and says "+2"; A4 unverified.
- **`?debug=shot` is gated to non-Vercel**; nothing tests that the gate holds.
- **Occasion-aware default course order** — out of scope until the manual version has
  been lived with.
- **Sorting a category by chef** needs PostgREST's `referencedTable` order form.

## Open · needs a decision, not code

- **No staging database** — decided again in v11.5.0: applying every migration twice
  is a recurring manual step for a two-user app. The safeguards are the
  backup-before-migration rule, `check-schema` refusing to build behind, and the banner.
- **No CI gate** — decided in v11.5.0. `npm run prepr` + `/regression` before every PR
  is the gate; a GitHub Action would need the anon key (and for a schema check, Supabase
  reachable) as repo secrets, and the project's rule is that no key leaves this machine.
- **No observability** — decided. Two users who tell each other; every failure is
  surfaced in the UI with a message.
- **Moran cannot repair a schema-behind failure.** The banner speaks to her; the fix is
  still Itzik's.

## Done in v11.5.0

- **Selftest red when signed out.** The four DOM groups each fail one check on `/login`
  instead of measuring the sign-in card — closes the largest known verification gap
  (it was "58 passed against a sign-in form").
- **`npm run backup-check`** — builds the backup via the shared `lib/backupDocument.mjs`,
  proves the importer reads it, checks counts, empty shells and every photo path, writes
  `/backups/…json`, stamps `last_backup_at`. Local only, no secrets off the machine.
- **Menu delete → `/menus/trash` → restore.** Soft delete, snapshot-first, share link
  revoked on delete (deliberately not resurrected on restore).
- **"How did it go?"** — `menus.after_notes` (0022): never printed, never shared, never
  duplicated. **Promote** one line into a recipe's Notes, dated, snapshot-first.
- **Search**: the field on the results page with a button; `%`/`_` escaped; category
  chips, chef and time filters in the URL.
- **Recently added** on the home page (five, title-tiebroken) and `/recipes/recent`.
- **`npm run photos:orphans`** — lists unreferenced Storage objects; `--delete` demands
  a photos zip that contains every object it would remove.
- **Docs**: README is the operational truth; `CHECKLIST.md`'s "auto-tidy" claim
  corrected (it is a list filter); the search comment no longer says "trigram".
- **Removed the 0021 write fallbacks** — a database at 20 no longer runs this code, and
  `check-schema` says so via the 22 probe.

## Done in v11.4.x

- Cooking mode (full-screen sheet, ticks, wake lock, guarded exit); print sheet white
  under print media so the PDF matches; Cachet lockup on the recipe sheet; A4 viewport
  in the PDF route; family-agnostic font wait (v11.4.1).
- Typography tokens `--t-h1/h2/h3`; self-hosted fonts; login/menus/import localized;
  recipe trash; `returnTo` into the menu builder; occasion follows the date;
  moved-category banner; focus ring restored; two-up home grid; clipboard fallbacks;
  transactional recipe and menu saves (0021) (v11.4.0).

## Earlier

- v11.0.0 – v11.3.x: menu card redraw, per-menu running order, `sauces`, guest share,
  kids planner multi-dish and guest chefs, people self-service, backup stamp. Recipe
  sharing is DROPPED, not deferred — the PDF does the job with no schema.
