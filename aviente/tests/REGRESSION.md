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

Launched by **`/regression`** (`.claude/skills/regression/SKILL.md`), which starts the
app, reads the suite at both widths, hands the clicking to a Sonnet subagent, writes
the report and runs `test:clean`. The steps below are what that skill performs, and
what to do by hand when it is not available.

Reports land in `tests/reports/`, which is gitignored — a run is evidence for one PR,
not repository history.

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
| 1.4 | Counts agree | the homepage total matches the sum of the category counts, and a category's count matches the rows it lists. **Only the seeded fixture can assert absolute numbers** (it was "13 recipes, breads = 5"); this database now holds the real book, so the check is now internal consistency, not a magic number |
| 1.5 | Signed out | every route redirects to `/login` and **no recipe data renders** |
| 1.6 | Widths | 412×915 and 1280×800 with **no horizontal page scroll** |
| 1.7 | Version | the footer matches `APP_VERSION` |
| 1.8 | Splash | `?splash=hold` shows the plaque; without it, it is gone and not hit-testable |
| 1.9 | Suite | `window.__selftest` 0 failed at **both** widths, every skip explained |
| 1.10 | Caret | type 5+ characters into an ingredient while a part heading is being named — focus never leaves the field |
| 1.11 | Add part | "＋ הוספת חלק" produces a **second** section; naming it does not rename the first section's ingredients |
| 1.12 | Refused save | Save an empty new recipe from the bottom of the form: the page scrolls to the name field, focuses it, marks it invalid |
| 1.13 | No card delete | a recipe card in a category list has an edit pencil and **no** ✕ |

1.10 and 1.11 are in Sanity rather than Regression because they cost seconds and
they have now bitten twice: the caret jumped to the part heading on every keystroke,
and "add part" silently added a section you could not see while renaming the
ingredient above it.

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

## 2E · People and the front door *(since 11.2.0)*

| # | Check | Passes when |
|---|---|---|
| 2.40 | Doorman | an email on no list gets "not on the family list" at `/login` — **not** "check your email" |
| 2.41 | Add + link | a person added with an email shows "Invited — not signed in yet"; after their first magic link, "Can sign in". The email half needs a real inbox — Itzik's step |
| 2.42 | Remove access | clears the login **and** the email; their next link is refused |
| 2.43 | Delete guard | deleting someone with recipes is refused **with the count**; an unreferenced person deletes and the row disappears without a reload |
| 2.44 | Credit-only | a person with no email appears in the recipe form's "whose recipe" select |
| 2.45 | Non-admin | a member sees no People card and is refused at `/settings/people` — **needs a second signed-in profile; skip with that reason** |
| 2.46 | List freshness | add / save / revoke / delete all change the list with **no reload** (it used to keep showing the old list, so delete looked dead) |

## 2F · Cook mode and destructive actions *(since 11.3.0)*

| # | Check | Passes when |
|---|---|---|
| 2.47 | Ticks | ticking an ingredient dims its row; the tick survives a reload; "clear" appears only once something is ticked |
| 2.48 | Keep awake | the button toggles and reads back its state; absent entirely where the browser has no `wakeLock` (that absence is a pass) |
| 2.49 | Two columns | above 900px ingredients sit beside the method, and **no horizontal page scroll** in RTL |
| 2.50 | Confirm focus | opening any confirm moves focus to **Cancel**; Escape cancels it and does **not** close the editor underneath; focus returns to the trigger |
| 2.51 | No native dialogs | no flow anywhere raises `window.confirm`/`prompt` — they are suppressed in embedded browsers, which is how a delete came to look like a dead button |
| 2.52 | Guarded destruction | removing a kids dish, removing a menu row, and stop-sharing each ask first |
| 2.53 | Menu notes survive | type a per-dish note, save, reopen edit — the note is still in the field (re-saving used to blank it) |
| 2.54 | Kids targets | every control on `/kids` measures ≥44px at 412px |

## 2D · Rendering and accessibility

| # | Check | Catches |
|---|---|---|
| 2.30 | Card fidelity | at 412px and desktop: frame, fleurons, candles, RTL Hebrew all present |
| 2.31 | Empty course | omitted entirely, not printed as a bare heading |
| 2.32 | PDF | `application/pdf`, non-trivial size, **extractable Hebrew text** — the only way to catch a missing embedded font |
| 2.33 | Decorative-tone contrast | computed colour of small letterspaced **text** is the INK token (`--muted-ink`, `#716551`, 5.11:1), never the decorative one (`--muted`, `#a79a85`, 2.48:1). Regressing this is invisible to the eye at 11px and trivial to assert. **The old wording named `#8a6d2f` / `#c9a961`, which the v11 palette change removed entirely — a check that could only go red for the wrong reason.** The in-app suite asserts the ratio numerically rather than the hex, which is the durable form |
| 2.34 | axe-core | no violations on any screen |
| 2.35 | Targets | every control ≥44px at 412px width |
| 2.36b | Bidi | steps, ingredient names/notes and dish titles carry `dir="auto"` on screen **and** in `/print/*`; a Hebrew line that starts with a Latin word or digit reads correctly |
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

---

# Appendix A · Click-level steps

Written for whoever drives the browser — a Sonnet subagent, or a person. The tables
above say *what must be true*; this says *which control to touch*, because "verify the
undo toast" is not a step, and an agent guessing at it will report a green run having
exercised nothing.

Labels are quoted in Hebrew because the app is Hebrew-first; the English sits in
`lib/i18n.ts` under the same key.

**Before anything:** confirm the footer version matches `APP_VERSION`. A pass against
a cached build is a confident wrong answer.

**On driving the browser:** a coordinate click can return a 30-second "pane hidden"
timeout *after having already been delivered* — so a click that "failed" may well have
worked. Verify against the DOM before believing the error, and prefer
`element.focus()` + `element.click()` through `javascript_tool` for anything
load-bearing. Discarding a working click as a failure is the easiest way to produce a
red run that means nothing.

## The suite (1.9)

`/?selftest=1` at 412×915 **and** 1280×800 → read `window.__selftest`. Report
`pass / fail / skipped`, every failure's `detail`, every skip's reason. Note that
`layout/tap targets` skips itself at desktop width — expected, and still reported.

## Recipe form: the caret and the parts (1.10, 1.11, 1.12)

Two traps here, both of which caught the first agent to run this:

- **The name field is the FIRST text input, and it has no placeholder.** The one
  directly beneath it, placeholder `לדוגמה: Khaluz`, is the Latin transliteration —
  easier to select precisely, and the wrong field. Typing into it produces a
  convincing false failure on 1.12.
- **There are two dashed buttons in the ingredients block.** **＋ מתן שם לקבוצה** at
  the top names the *existing* group; **＋ הוספת חלק (רוטב, מילוי…)**, below
  **＋ הוספת מרכיב**, is the one that adds a part. 1.11 means the second.

1. `/add?mode=blank`.
2. Type a name, then type into the first ingredient field. **Focus must stay there.**
3. Press **＋ הוספת חלק (רוטב, מילוי…)** — the lower one. A second section appears,
   its heading focused once.
4. Type 5+ characters into that heading. Focus stays; the section does not collapse;
   the first section's ingredient keeps its own text (it used to be renamed).
5. Type into the first section's ingredient again, and into the recipe name. Focus
   stays where you put it each time.
6. Scroll to the bottom, clear the name, press **שמירה**. The page scrolls **up** to
   the name field, focuses it, and outlines it. **Wait ~300ms before reading
   `document.activeElement`**: the scroll-and-focus runs in an effect after the render
   that shows the error, so an immediate synchronous check reads the Save button or
   `body` and reports a false failure.

## Cards, and where delete lives (1.13, 2.50)

1. `/recipes/mains`. Each card: an edit pencil, **no ✕**.
2. Open a recipe → **עריכה** → scroll to **מחיקת המתכון**. It asks in the page.
3. With the panel open: focus is on **ביטול**. Press **Escape** — the panel closes,
   the form stays, focus returns to the delete button. Then cancel out.

## People (2.40 – 2.46)

1. `/settings/people` → **＋ הוספת אדם**, name only, no email → **הוספה**. The row
   appears **without a reload**, reading "שם בלבד, בלי כניסה".
2. Open the row → **מחיקה** → **כן, למחוק**. The row disappears, again no reload.
3. Open **Savta** (credited on recipes) → **מחיקה** → **כן, למחוק**. Refused, naming
   the count.
4. `/login` in a signed-out window, type an address on no list → "not on the family
   list". **Do not** create an account.
5. 2.45 needs a second signed-in profile. Skip it with that reason.

## Cook mode (2.47 – 2.49)

1. Open a recipe with several ingredients. Tap an ingredient **row** (not just the
   box) — it ticks and dims; **ניקוי הסימונים (1)** appears.
2. Reload. The tick is still there.
3. **להשאיר את המסך דלוק** → reads back as on. Absent on a browser without
   `wakeLock`, which is a pass, not a skip.
4. At ≥900px ingredients sit beside the method; compare
   `document.documentElement.scrollWidth` with `window.innerWidth` for RTL overflow.

## Menus (2.52, 2.53)

1. `/menus/new` → **＋ הוספת מנה** → pick a dish → type a per-dish note → title it
   `__test__ …` → **שמירת תפריט**. The note appears on the card.
2. Reopen `/menus/<id>/edit`. **The note is still in its field.** Re-save; the card
   still shows it.
3. In the builder, **✕** on a dish asks first. So does **הסרת המהלך** on a course that
   holds one, and it says the dish keeps printing.
4. On a shared menu, **להפסיק לשתף** asks first, and says every link already handed
   out stops working.
5. `npm run test:clean` removes the `__test__` menu.

## Kids (2.54, 2.52)

1. `/kids` at 412px. Every control ≥44px — measure with `getBoundingClientRect`,
   do not eyeball it.
2. **⇄ העברה**, **↻ החלפה** and **✕ הסרה** each show a word beside the glyph.
3. **✕ הסרה** asks first. So does **ניקוי השבוע**, and turning off a day holding meals.

## Print and bidi (2.36b, 2.32)

1. `/print/recipe/<id>` renders, and punctuation in Hebrew steps sits where a Hebrew
   reader expects it.
2. Confirm `dir="auto"` on step bodies and ingredient names in **both** the screen and
   print markup.
3. **ייצוא PDF** returns `application/pdf` of non-trivial size with **extractable
   Hebrew text** — a missing embedded font is invisible any other way.

## Never covered by an agent

Whether the printed card looks *right*, whether the kids' planner is *playful*,
whether the Hebrew typography is beautiful rather than merely present. That is Layer
③, and it is Itzik's, on the phone, from `tests/TEST-PLAN-v<version>.md`.

## Known gaps in this catalogue

Stated so a green run is not mistaken for full coverage: the **guest share** flow
(`/m/[id]`, needs a live secret), the **AI paste importer**, **backup restore**, and
**PDF export** beyond its content type were all skipped by the UX review too. They
have Layer ② entries above but no click-level steps here, and nobody has walked them
end to end recently.

Narrower, and worth knowing: 1.3 proves those routes **respond**, not that they render
anything meaningful. `/m/<made-up-id>`, `/print/menu/<id>` and `/print/kids/<week>` all
answer 200 with a "not available" or empty sheet by design, so a 200 there is a much
weaker statement than a 200 on a recipe page.

Two checks cannot be done by one agent in one session at all: **1.5 signed-out
behaviour** (verified by fetching with `credentials: 'omit'` rather than by signing
out, since signing out would end the session the rest of the run needs) and **2.45
non-admin** (needs a second signed-in profile).

Learned in the v11.3.0 release run, so nobody spends the time again:

- **2.48 keep-awake cannot be verified from an automation pane.** `'wakeLock' in
  navigator` is true, and `request('screen')` then rejects with "Wake Lock permission
  denied". That is neither "works" nor the "API absent" case the check treats as a
  pass — it needs a real device. Skip it with this reason.
- **2.5 storage refusal is not a click-through check.** Photographs are served through
  the app as signed URLs, so no `supabase.co` request is observable from the client;
  the assertion belongs to `tools/db-check.mjs`, which holds a key and can ask
  directly.
- **Labels repeat, so scope by container, not by text.** `מחיקה` appears on every
  People row, and `ביטול` means two different things on the menu edit screen (abandon
  the edit, and cancel the confirm panel). Find the panel first
  (`[role="alertdialog"]`) and query inside it. For dismissing a panel, **Escape is
  more reliable than any click target**.
