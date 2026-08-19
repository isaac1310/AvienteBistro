# What is actually left

Rewritten 20 Aug 2026, against the code rather than against the last version of this
file. Everything below was checked; nothing is carried forward on trust.

The previous version of this document is why: it still listed "B4 · no select mode on
category browse" as open, months after `components/SelectableList.tsx` shipped, and a
code review repeated the claim back to us as a finding. A stale plan is worse than no
plan — it is read as evidence.

## Open · v0.10.1

- **A2 · Photo backup.** `/api/backup` carries `photo_path`, so a restore reconnects
  each photo to its recipe — but the Storage objects themselves have no backup at all.
  Needs `/api/backup/photos` streaming a zip, with a stated size ceiling (Vercel
  serverless responses cap around 4.5MB; today's WebPs are ~200KB, so dozens fit and
  hundreds do not). Deferred deliberately, not forgotten.
- **`softDeleteMenu` has no caller.** The mutation exists; no UI reaches it. Either
  add delete + undo to `MenuActions`, or remove the mutation.
- **Search is `ilike`, not `pg_trgm`.** `lib/queries.ts` does a substring match on
  `search_text`. §3.2 specifies trigram similarity, and `pg_trgm` is not enabled.
  Substring is adequate for 41 recipes; revisit at a few hundred.
- **The kids' fridge sheet has never been printed with content.** The planner works
  and the PDF renders, but no week has ever had meals placed in it, so the sheet has
  only ever been seen empty.
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

## Done, and verified in the app rather than reported

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
