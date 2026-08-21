# What is actually left

Rewritten 21 Aug 2026 for v11.0.0, against the code rather than against the last
version of this file. Everything below was checked; nothing is carried forward on
trust.

The previous version of this document is why: it still listed "B4 · no select mode on
category browse" as open, months after `components/SelectableList.tsx` shipped, and a
code review repeated the claim back to us as a finding. A stale plan is worse than no
plan — it is read as evidence.

## Open · after v11.0.0

- **The self-test suite only ever sees the login page.** `:3001` is a separate origin
  by design, so it carries no session, and `?selftest=1` there runs against `/login`.
  The run is genuinely green — 58 passed, 0 failed — and it is green against a sign-in
  form. The checks that matter to the app skip themselves with a printed reason, which
  is what made this invisible: it looked like a clean run with two honest skips.
  Fixing it needs a session on `:3001` (sign in there once, having allow-listed
  `http://localhost:3001/**` in Supabase's redirect URLs) or a way for the suite to
  authenticate itself. Until then, per-page verification is manual on `:3000`.
  **This is the largest known gap in the project's verification story.**
- **One check was found blind because of the above.** "the serif stack resolves, not
  Times" looked for `header h1`; the wordmark is a `<span>` and always has been, so
  the check guarding against every heading becoming Times had been skipping itself
  since the header was redesigned. It has a `[data-wordmark]` hook now. Assume others
  like it exist — a skip with a reason is not the same as a check that ran.
- **The kids planner has no drag and drop.** Deferred deliberately: on a phone a drag
  between two small boxes is a coin toss. "העבר ל…" opens a slot picker instead — two
  taps, works with a keyboard and a screen reader — and `kids_move` is built either
  way, so drag can be added later without touching the data path.
- **Five unreferenced objects in the photo bucket**, left by replaced or abandoned
  uploads. `/api/backup/photos` names them in its manifest rather than deleting them; a
  backup route is the wrong place to delete anything. Sweeping them is a separate,
  deliberate act.
- **Occasion-aware default course order.** The occasion already resolves per date, so
  a Friday evening could default to the full six courses and a weekday lunch to main +
  sides — the app guessing the shape of the meal it already knows you are planning.
  Out of scope for v11 on purpose: the manual version has to be lived with first, or
  the defaults are guesses about a workflow nobody has used.
- **Sorting a category by chef.** Dropped from the sort control with a reason: the
  chef is a nested join, not a column on `recipes`, so `.order('chef')` fails at
  RUNTIME rather than at build. Needs PostgREST's `referencedTable` form.
- **`softDeleteMenu` has no caller.** The mutation exists; no UI reaches it. Either
  add delete + undo to `MenuActions`, or remove the mutation.
- **Search is `ilike`, not `pg_trgm`.** `lib/queries.ts` does a substring match on
  `search_text`. §3.2 specifies trigram similarity. **The extension IS enabled** —
  `0001_init.sql:9` creates it, and this file claimed for three releases that it was
  not, which is the sort of stale line a reviewer reads back as a finding. Only the
  QUERY is still substring.
  Substring is adequate for 41 recipes; revisit at a few hundred.
- **The kids' fridge sheet has now been seen with content** — two dishes in one cell
  with a divider, a free-text dish, chefs by alias — but never on PAPER. The grid is a
  fixed landscape table; the cell caps at four dishes and says "+2" past that rather
  than clipping silently. Whether that holds at A4 is still unverified.
- **`?debug=shot` is gated to non-Vercel** — good — but nothing tests that the gate
  holds. A regression there re-exposes a full-page screenshot of any print route.

## Open · needs a decision, not code

- **No staging database.** `:3000`, `:3001` and production share one Postgres, by
  decision. `tools/check-schema.mjs` narrows the risk of shipping code ahead of the
  schema; it does not make a migration rehearsable. Take a backup before any migration
  that rewrites rows — 0010 and 0013 both did.
- **The `prepr` guard protects the developer, not production.** It fails the local
  build when the database is behind. Nothing stops a merge that skips `prepr`; that
  would need a GitHub Action, and the repo is public, so the URL and anon key would
  have to be repo secrets.
- **Moran cannot repair a schema-behind failure.** The banner now speaks to her
  ("nothing is lost — Itzik has the steps") instead of naming a SQL file, which is a
  fix for the wording, not for the situation.
- **The repo is public and the pushed history contains the recipe book and the
  photos.** They are untracked going forward. Untracking is not retraction; only
  making the repo private stops what is already there being fetched.

## Done in v11.0.0, and verified in the app rather than reported

- **The menu card redrawn to the sample** — notched double frame, paper texture,
  burgundy course headings, delicate dish names, a drawn candle, and a rule with a
  lozenge between courses. A per-dish note, which turned out to be a FEATURE gap
  rather than styling: `saveMenu` only ever copied the recipe's own description, so
  the only way to change what a card said was to edit the recipe — which rewrites it
  on every card that dish has ever appeared on.
- **A running order per menu** (`menus.course_order`, migration 15/16). A course
  holding dishes always prints, appended at the end rather than dropped; verified on a
  fixture built wrong on purpose.
- **`sauces` and the tenth plate**, `breads` relabelled מאפים / Breads & Baking.
- **The kids table**: several dishes per meal, free-text dishes, ordering held by
  three `security definer` functions rather than by application code. Verified against
  the live database — four dishes numbered 0..3, removing the MIDDLE one closing the
  gap, a move across slots reindexing both ends.
- **The third loader**, from the delivered artboard, and the first that is an
  illustration rather than a motif.
- **Every arrow points the right way in Hebrew.** Back is → in an RTL interface, and
  half the arrows were baked into translation strings where no designer could reach
  them.
- **The photo backup** (A2), with a hand-written STORE-only zip writer verified
  against the system `unzip`.
- **Photo uploads 63% smaller**, measured on a real file rather than asserted.

## Done earlier, and verified in the app rather than reported

Recorded because the same items kept being re-raised as open:

- **Select mode / the cross-category basket** — `SelectableList`, `lib/basket.ts`.
  Verified end to end: a soup and a dessert picked in two categories both arrive in
  the builder.
- **Per-user theme** — `data-theme` on `<html>`, switch in Settings, burgundy
  re-derived against the new palette.
- **Hebrew-first UI** — the per-person setting drives the whole interface; document
  `dir` follows it. The menu card keeps French course titles by decision, and the
  AVIENTE lockup stays Latin in both languages.
- **The new design system** — palette, Rubik, the wordmark from the delivered
  artboards, one shared page header across every screen.
- **Backup round trip** — download → Replace-import preserves ingredients, groups,
  notes and `photo_path`. Proven against the live 41-recipe export, 0 errors.
- **Photo paths, not signed URLs** — photos no longer carry a one-year expiry.
- **`meal_time`** — was dead code; all five call sites passed the literal `'evening'`,
  so every Friday lunch was titled "Shabbat Dinner".
- **Recipe ingredient parts** — one heading per run in the editor, not a text field
  repeated on every row.
- **`tools/db-check.mjs`** — the write-path gate `AGENTS.md` had required since the
  beginning and which had never existed. 12 checks, read-only by default.
- **Response headers** — `Referrer-Policy: no-referrer` matters most: a share link
  carries its secret in the URL.
- **Timezone** — `family_settings.timezone` had held `Asia/Jerusalem` since 0001 and
  was read by nothing. Between midnight and 03:00 local a UTC server reported
  yesterday, so the kids planner opened on last week. See `lib/today.ts`.
