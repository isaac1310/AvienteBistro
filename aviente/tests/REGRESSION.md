# Pre-PR regression — the agent protocol

Run by a Sonnet agent on localhost **before opening any PR**. Itzik does the manual
pass afterwards, on the Ultra (§9.5 of the build spec).

```
   ① SANITY  ~2 min          ② REGRESSION  ~10 min        ③ MANUAL  ~5 min
   every PR         →        release candidates    →       Itzik, on the phone
        ↓ green                    ↓ green                      ↓ ✅
   open the PR              tag the release                deploy to prod
```

## The three rules

1. **A red suite means no PR.** Report the failures and stop. Do not open a PR
   "with a note about" a failing check.
2. **An unexplained skip is a failure.** Borrowed from TravelHub's `selftest.js`,
   which learned this the hard way: two checks used to `return true` early at
   desktop width, so a desktop run reported them green while exercising nothing.
   A check that cannot run must say *why*.
3. **Never report a suite as passing when checks were skipped.** Say
   "18 passed, 2 skipped (no photo fixture)" — never "all passed".

## Setup, once

```bash
cp .env.example .env.local
# NEXT_PUBLIC_E2E=1 must be set. It does two things: exposes password sign-in for
# the two test users (magic links cannot be automated — there is no inbox to poll),
# and attaches the pure parser to window.Aviente so the selftest exercises the real
# implementation rather than a copy of it.
```

Nothing else to install. There is no test runner — see "Running it" below.

## The database — read this before writing a test

There is **one** Supabase project, by decision: no local Postgres (no Docker on
this machine) and no separate dev project. The suite therefore runs against the
database holding the family's only copy of these recipes.

That moves isolation from the database to the tests, and the rules are not
negotiable:

1. **Never mutate a row you did not create.** The 13 seeded recipes are read-only
   fixtures. Assert against them; never edit, delete or rename them.
2. **Tag everything you create** with `FIXTURE_TAG` (`__test__`) in
   `external_ref`, and in `title` for menus. `npm run test:clean` deletes only
   tagged rows, and refuses outright if an untagged row ever matches.
3. **Clean up in `afterAll`**, even on failure. A leaked fixture shows up in the
   real cookbook.
4. **Never truncate.** The earlier `test:reset` script has been deleted for this
   reason — against the only copy of the recipes, a truncate is not a reset.

Six regression checks were written assuming a disposable database and are now
**fixture-scoped**: soft delete (2.9), revisions (2.10), kids uniqueness (2.11),
concurrency (2.12), share revocation (2.4) and photo replace (2.14). Each must
create its own recipe or menu, act on that, and remove it. If a check cannot be
done that way, it is **dropped and listed here as not covered** — never quietly
pointed at real data.

The honest cost of dropping the second project: destructive behaviour is tested
against fixtures rather than in a clean-slate database, so a bug that only appears
on an empty or freshly-migrated database will not be caught here. Worth revisiting
if Docker ever gets installed.

## Running it — there is no test framework, on purpose

TravelHub has no `package.json` at all, and its testing works. Aviente follows it:
the suite is **`public/selftest.js`**, it runs **inside the app** in a real browser,
and it needs no runner, no config and no browser download.

```bash
npm run dev
open 'http://localhost:3000/?selftest=1'
```

A panel appears with every check, colour-coded, and the same run lands on
`window.__selftest` as `{ pass, skipped, fail, version, results }` so an agent can
read it without re-implementing anything.

A Playwright layer was written and then **deleted**. It downloaded a 95MB browser
and gave a second place for assertions to live, which is how suites rot — and the
agent already drives a real browser, so it added nothing but machinery. If a
headless CI gate is ever wanted, it is a thirty-line file that loads
`?selftest=1` and reads `window.__selftest`; write it then.

## The agent's steps

1. `npm run prepr` — typecheck and build. Must be clean: **zero** TS errors.
2. `npm run dev`, then open `/?selftest=1` in the browser and read
   `window.__selftest`.
3. Repeat at **412px and 1280px** — several checks skip themselves outside phone
   width and must be seen to skip, not assumed to pass.
4. `node tools/db-check.mjs` for the security and constraint checks, which need a
   database rather than a DOM.
5. Report counts, every failure with its detail, and **every skip with its
   reason**.
6. Green → open the PR with the summary. Red → report and stop.

---

# Layer ① Sanity · every PR

Fast, shallow, fails loudly on a broken build.

| # | Check | Passes when |
|---|---|---|
| 1.1 | Build | `npm run build` clean, zero TS errors |
| 1.2 | Console | no `error` on any route |
| 1.3 | Routes | `/`, `/login`, `/recipes/[cat]`, recipe view, `/menus`, builder, `/m/[id]`, `/kids`, `/import`, three `/print/*` all respond |
| 1.4 | Seed | 13 recipes; `breads` = 5 (proves the category addition survived) |
| 1.5 | Signed out | every route redirects to `/login` and **no recipe data renders** |
| 1.6 | Widths | 412×915 and 1280×800 with **no horizontal page scroll** |
| 1.7 | Version | the footer matches `APP_VERSION` |
| 1.8 | Splash | `?splash=hold` shows the plaque; without it, it is gone and not hit-testable |

---

# Layer ② Regression · before a release

Ordered by what hurts if it breaks. Each group names the failure it exists to
catch — a suite that only tests what was never broken is decoration.

## 2A · Security — the highest-value tests here

| # | Check | Passes when |
|---|---|---|
| 2.1 | Anon read | an `anon` client gets **zero rows** from recipes, ingredients, steps, menus, menu_items, kids_meals |
| 2.2 | Share containment | `fetch_shared_menu` response contains **no** ingredients, steps, story or photo_url — assert on the response shape, not the SQL |
| 2.3 | Bad secret | wrong, revoked or deleted → `null` |
| 2.4 | Revoke | after STOP SHARING the previously-working link is dead |
| 2.5 | Storage | an unauthenticated read of `recipe-photos` is refused |
| 2.6 | E2E flag | `NEXT_PUBLIC_E2E` absent from a production build — grep the output. A password login shipped to prod bypasses everything above |
| 2.7 | Signup | `signInWithOtp` for an unknown email fails (public signup off) |

## 2B · Data integrity

| # | Check | Catches |
|---|---|---|
| 2.8 | Menu snapshot | rename a recipe → the old card is **unchanged**; soft-delete it → the card still renders. The archive guarantee |
| 2.9 | Soft delete | hidden from browse and search; undo toast restores it |
| 2.10 | Revisions | two saves → two revisions; restore brings back prior ingredients *and* steps |
| 2.11 | Kids uniqueness | a duplicate `(week_id, weekday, meal)` is rejected |
| 2.12 | Concurrency | two saves → last write wins **and** both revisions exist |
| 2.13 | Portion constraint | a recipe with both `servings` and `yield_text`, or neither, is rejected |
| 2.14 | Photo replace | exactly one object remains in the bucket |

## 2C · The fiddly logic

| # | Check | Catches |
|---|---|---|
| 2.15 | Range scaling | `400–500 g` ×1.5 → `600–750 g` |
| 2.16 | pcs rounding | 3 eggs ×1.5 → 5, not 4.5 |
| 2.17 | Pass-through | `to taste` and `pinch` unchanged by scaling |
| 2.18 | No portions | a `yield_text` recipe shows **no** scale dropdown |
| 2.19 | Shabbat | Friday **evening** → candles + title; Friday **lunch** → neither. The sundown bug |
| 2.20 | Holiday drift | one hebcal key resolves correctly in **two different Gregorian years**. The staleness bug the first schema would have shipped |
| 2.21 | Break-fast | Yom Kippur resolves to the *following* evening |
| 2.22 | Import: shapes | both source schemas parse — structured objects **and** flat-string ingredients |
| 2.23 | Import: Hebrew | `½`→0.5, `כף שמיר`→1 tbsp, `4 ביצים`→4 pcs, `קורט`→pinch, `בצל ירוק`→null amount kept |
| 2.24 | Import: refusal | unknown `schemaVersion` refused, not guessed |
| 2.25 | Import: isolation | one bad row fails alone; the batch continues |
| 2.26 | Import: dupes | an existing title prompts skip / add / replace |
| 2.27 | Language fallback | a Hebrew-only recipe on an English card shows **Hebrew, not blank** — the one-way-fallback bug |
| 2.28 | Fallback chip | shows in the builder, never on the card |
| 2.29 | Search scope | finds by ingredient name and Hebrew title; does **not** search steps or stories |

## 2D · Rendering and accessibility

| # | Check | Catches |
|---|---|---|
| 2.30 | Card fidelity | at 412px and desktop: frame, fleurons, candles, RTL Hebrew all present |
| 2.31 | Empty course | omitted entirely, not printed as a bare heading |
| 2.32 | PDF | `application/pdf`, non-trivial size, **extractable Hebrew text** — the only way to catch a missing embedded font |
| 2.33 | Gold contrast | computed colour of small gold **text** is `#8a6d2f`, never `#c9a961`. The 2.02:1 failure regressing is invisible to the eye and trivial to assert |
| 2.34 | axe-core | no violations on any screen |
| 2.35 | Targets | every control ≥44px at 412px width |
| 2.36 | Hebrew font | Hebrew text resolves to Frank Ruhl Libre / Heebo, **not** a system fallback — this shipped broken once already |
| 2.37 | Fonts on print routes | the same assertion inside `/print/*`, where the PDF is generated |
| 2.38 | Reduced motion | the splash still dismisses with `prefers-reduced-motion` |
| 2.39 | Keyboard | ingredient and course reorder are operable without a pointer |

---

## Report format

`tests/reports/<branch>-<n>.md`:

```markdown
# <branch> · run 3 · Aviente v0.4.0 · schema 1

| layer | pass | fail | skip |
|-------|-----:|-----:|-----:|
| sanity     | 8 | 0 | 0 |
| regression | 37 | 1 | 1 |

## Failures
### 2.19 Shabbat — Friday lunch titled "Shabbat Dinner"
expected title to be null for a lunch menu, got "Aviente Family Shabbat Dinner"
tests/reports/img/2.19.png

## Skips
### 2.14 Photo replace — no photo fixture in the dev bucket
```

## What layer ③ is for, and what it isn't

Do **not** put anything a machine can assert into the manual plan. Layer ③ exists
only for judgement: does the printed card look *right*, is the kids planner
actually playful, is the Hebrew typography beautiful rather than merely present.
Write it as `tests/TEST-PLAN-v<version>.md` in TravelHub's style — five minutes,
numbered steps, an explicit **Expect:** per step, ⚠️ on what is new or previously
broken, ✅/❌ boxes, and the version footer checked first so it is never performed
against a cached build.
