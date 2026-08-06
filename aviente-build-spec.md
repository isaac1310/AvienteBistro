# Aviente Family Recipe Cookbook — Build Spec for Claude Code

**Revision 2** (2026-08-06) — folds in the design review, the resolved decisions, and logic reused from two existing apps of ours. Changes from rev 1 are marked **[r2]**.

A family recipe web app: shared cookbook, dish-selection → dated menu cards, kids weekly meal planner, JSON paste import, PDF export. Everything editable by both of us.

**Stack:** Next.js (App Router) on Vercel · Supabase (Postgres + Auth + Storage) · responsive web app, phone and desktop equally first-class.

**⚠️ Account rule — non-negotiable [r2]:** this is a personal project. Supabase, Vercel, and the git remote must all use the **personal email and personal GitHub account — never the work ones** — and the Vercel project must live in a **personal Hobby scope**. When importing at vercel.com/new, check the scope selector: it will default to a linked Locusview team if one exists. No work identity, no work infrastructure, no work tooling anywhere in this project.

**Users [r2]:** exactly two accounts — Itzik and Moran. Both have full read/write on everything. No other accounts, ever. Family members who *appear* in the app (Papa, Maman, Savta…) are credit records, not logins. Guests receive a **read-only share link to a single menu** and never sign in.

**Seed data [r2]** — real recipes live in this folder and are the source of truth for schema decisions:
- `my_recipes copy.json` / `.md` — 12 recipes (challah, no-knead bread, bao buns, oshpalov, flan, Salzburger Nockerl…), Hebrew, ingredients as flat strings.
- `my_recipes.json` / `.md` — 1 recipe (ginger concentrate), Hebrew, ingredients as structured objects.
- `מתכונים.docx` — `סלט ביצים רטוב`, with a per-ingredient notes column.
- The two `.pdf` files are superseded by the `.md`/`.json` versions above; this machine has no poppler, so don't rely on them.

**Import these 13 as the seed set in build step 1** — a real corpus beats invented fixtures, and §2.1/§3.9 are already reconciled against it. The `.md` versions are human-readable references for how a recipe should *read* on screen.

**Design reference:** `Aviente Explorations.dc.html` in this project — final choices are options 1a, 2a, 3b/5a, 4a, 4b, 5c, 4d, 4e, 5b, 6a, 6c. Match those screens exactly (colors, type, spacing), with the corrections in §1.

**Reuse from our other apps [r2]** — read these before writing equivalent code; they are working, deployed, and solve the same problems:
- `~/Documents/Vacation POC` (**Family TravelHub**) — `supabase-schema.sql` is the exact pattern to copy for guest share links: tables revoked from `anon`/`authenticated`, all access through `security definer` RPCs gated by a long random secret, with a payload size cap and a creation rate limit. Also copy its `vercel.json` (CSP + `Referrer-Policy: no-referrer`), `scripts/write-config.js` (writes client config from Vercel env vars at build time), `manifest.webmanifest`, and its trick of **stripping the secret from the address bar once consumed** so it never leaks via `Referer`.
- `~/Documents/Prices/price-tracker.html` (**Vault-Mart**) — `PASTE_PROMPT` + `parseProductPaste()` (~line 1938) is the exact pattern for §3.9 import: a read-only prompt textarea the user copies into an AI tool, a paste box, tolerant parsing (strips ``` fences, slices from first `{` to last `}`), field-by-field validation that degrades to null rather than throwing, and a live preview before commit. Also copy its `SCHEMA_VERSION` guard (`refuse rather than guess` on an unknown version) and its undo snapshot.
- `~/Documents/Prices/preview-ultra.html` — a device-frame harness for checking layouts at 412×915 / 384×854 / 360×800 / 480×1000 with zoom. Copy it into this project as `preview-device.html` and use it for every screen.

---

## 0. Target devices [r2]

Both of these are primary; neither is a fallback.

| | Width | Notes |
|---|---|---|
| **Phone (Samsung Galaxy S26 Ultra)** | 412 CSS px baseline | The design was drawn at 390px. Do **not** hard-code 390 — build fluid so 360→480 all work. Verify at 412×915 (and 384×854, the large-font-setting case). |
| **Desktop** | 1024–1440 | Not just a stretched phone; see breakpoints below. |

- Breakpoints: `<768` single column + bottom nav (Home/Recipes/Menus/Add) · `≥768` two-column content, bottom nav becomes a top bar · `≥1024` persistent left sidebar nav, content capped at `max-width: 1100px` and centered.
- **The menu card never reflows.** It is a print artifact at a fixed width (the 3b/5a geometry); on desktop it sits centered on the page bg with generous margin. Same for the kids fridge grid.
- Category grid: 2-col on phone, 3-col ≥768, 4-col ≥1024. Recipe cards likewise.
- Touch targets ≥44px on phone (the price-tracker uses `min-height: 40px`; go to 44). Hover states are desktop-only (`@media (hover: hover)`).
- Hebrew fields are RTL; the app chrome stays LTR.

## 1. Design system

### Fonts
- **Cormorant Garamond** (serif) — titles, dish names, menu cards, editorial accents (italic).
- **Jost** (sans) — UI labels, body, buttons. Small-caps-style letter-spaced labels (e.g. `letter-spacing: 2px`, 10–12px).
- **Baloo 2** — kids section only.
- **[r2] Hebrew — Frank Ruhl Libre** (serif) and **Heebo** (sans). Cormorant Garamond and Jost contain **zero Hebrew glyphs**; without this, every Hebrew description on the printed menu card silently falls back to a system font and destroys the engraved look. Set explicit stacks — `font-family: 'Cormorant Garamond', 'Frank Ruhl Libre', serif` and `'Jost', 'Heebo', sans-serif` — so per-character fallback happens inside one rule. Load Hebrew subsets; verify on the card and in the PDF, not just on screen.

### Themes (**[r2] per-user** switch; kids section exempt)
| Token | Green (default) | Burgundy (6a) |
|---|---|---|
| Primary / header bg | `#1e3a2f` | `#5c2222` |
| Page bg | `#f7f2e7` | `#f7f0e4` |
| Gold — rules & ornaments | `#c9a961` / `#b08d3e` | `#c9a961` / `#a8763e` |
| **[r2] Gold — small text** | `#8a6d2f` | `#8a6d2f` |
| Card border | `#ded5c2` | `#e0d2be` |
| Ink | `#2a2417` | `#2a2017` |

- **[r2] Accessibility fix — the gold split above is required, not optional.** Measured against the cream page bg: `#c9a961` = **2.02:1**, `#b08d3e` = **2.80:1**, both far below the 4.5:1 WCAG AA minimum — and the design uses gold for 10–12px letter-spaced labels, the hardest case to read. `#8a6d2f` reaches **4.37:1** and still reads as gold. Use `#8a6d2f` for gold *text*; keep `#c9a961` for hairlines, diamonds, and fleurons where contrast is decorative. (Already fine, leave alone: gold on the green header = 5.48:1; burgundy on card beige = 7.34:1; the card's `#6b5535` frame on beige = 5.32:1.)
- Buttons: primary = solid primary color, cream text, 2px radius, letter-spaced uppercase Jost; secondary = 1px primary outline.
- Cards: white, 1px border, 2px radius (bistro = square corners, not rounded).
- Header: centered, "EST. LA FAMILLE" eyebrow, "Aviente" serif title, gold rule with rotated-square diamond divider.
- French-accented English copy throughout ("Livre de Recettes de Famille", "Entrées").
- **[r2]** Every list screen needs three states drawn, not just the happy one: empty ("no recipes here yet — ＋ add the first"), loading (skeleton rows in card geometry), and error with a retry.

### Menu card (print artifact — 3b/5a)
- Beige `#e9dfc6`, inner panel `#ede4cd`, double frame (1px + 2px `#6b5535`) with ❧ corner fleurons.
- Burgundy `#7a2e2e` small-caps course names (French: APÉRITIF, ENTRÉE, PLAT PRINCIPAL, ACCOMPAGNEMENTS, DESSERT, NOTES DU CHEF), ❦ hairline dividers. **[r2] ENTRÉE added** — rev 1 listed five `course` values in the schema but only four headings here, so `entree` items had nowhere to render.
- Date top ("VENDREDI · 08.08.2026"), dish names serif 17px, italic descriptions, per-course credit line: `— de la cuisine de Papa —`.
- Shabbat/holiday: two drawn CSS candles flank the title (see §6).
- **[r2]** A course with no items is omitted entirely — never printed as an empty heading.

### Kids section (exempt from theming — 4a)
- Garden gradient bg (`#d9f0e2 → #f0f9ef → #fff9ec`), CSS butterflies, Baloo 2 type.
- White pill banner with green border/shadow: "The Kids' Table".
- Each weekday hosted by an animal: 🧸 Mon, 🐶 Tue, 🐱 Wed, 🐘 Thu, 🐰 Fri; day headings like "Teddy's Monday".
- Day bubbles = colored circles with animal + hard drop shadow (`box-shadow: 0 3px 0 <darker>`); unselected = dashed outline.
- Meal cards: white, rounded 12px, colored border per meal (breakfast gold `#f4c95d`, lunch green `#7bbf9e`, dinner blue `#8fb8e8`), chef badge (👩 Chef Mom / 👨 Chef Dad), ↻ swap.
- Buttons: rounded 16px, hard shadow, e.g. "🧲 Fridge PDF!".

---

## 2. Data model (Supabase) [r2 — revised]

```sql
-- ── identity ────────────────────────────────────────────────────────────
family_members (
  id uuid pk,
  name text,                    -- "Papa", "Maman", "Savta"
  display_name text,
  user_id uuid unique null references auth.users on delete set null,
                                -- [r2] NULL for credit-only people (Savta has no login).
                                -- Only two rows ever have a user_id: Itzik, Moran.
  theme text default 'green' check in ('green','burgundy'),   -- [r2] theme is per-user
  created_at timestamptz default now()
)

-- helper used by every policy below
create function is_family() returns boolean
  language sql security definer stable as $$
    select exists (select 1 from family_members where user_id = auth.uid())
  $$;

-- ── recipes ─────────────────────────────────────────────────────────────
recipes (
  id uuid pk,
  title text not null,          -- as written, usually Hebrew
  title_en text null,           -- [r2] the transliteration the sources carry in parentheses:
                                -- "חלוז צ'רקסי עם גבינה (Khaluz)" → title + title_en. Free bilingual
                                -- dish names for the menu card; importer splits the parens.
  category text check in ('entrees','soups','salads','mains','sides',
                          'breads','desserts','kids','other'),
                                -- [r2] 'dessert' → 'desserts', and 'breads' ADDED — see §2.1
  meal_type text null check in ('breakfast','lunch','dinner'),   -- kids recipes only
  photo_url text null,          -- Supabase Storage; null → category blueprint placeholder
  description_en text null, description_he text null,            -- [r2] BOTH nullable — see §5
  story text null,              -- family story/notes, italic quote display
  serving_suggestions text null, -- [r2] "how to serve it", distinct from the story.
                                -- Sources carry this as `usage_recommendations` / `notes`.
  prep_minutes int null,        -- [r2] present on 13/13 real recipes; rev 1 had no time fields
  cook_minutes int null,        -- [r2]
  servings int null check (servings > 0),   -- [r2] now nullable
  yield_text text null,         -- [r2] for recipes measured by output, not portions:
                                -- "כ-1 ליטר תמצית מרוכזת". Exactly one of servings/yield_text.
  source_member_id uuid null references family_members,           -- "Papa's recipe"
  updated_by uuid references family_members,
  updated_at timestamptz default now(),
  deleted_at timestamptz null,  -- [r2] soft delete; every query filters `deleted_at is null`
  search_text text,             -- [r2] see §5.1. Maintained by TRIGGER, not a
                                -- generated column: it spans `ingredients`, and a
                                -- Postgres generated column cannot reference another
                                -- table. Rev 1's `generated` version would not compile.
  -- [r2] migration hooks — cheap now, unblock §3.10's bulk import later
  import_batch_id uuid null,    -- which migration run created this row
  external_ref text null        -- stable id from the source (e.g. ChatGPT conversation id
                                -- + heading slug), unique per batch source
)
create unique index on recipes (external_ref) where external_ref is not null;
ingredients (id, recipe_id fk on delete cascade, position int, name text,
             amount numeric null, unit text null,
             amount_max numeric null,  -- [r2] RANGES are common in the real data:
                               -- "400-500 גרם", "1.2-1.5 ליטר", "150-170 מ\"ל".
                               -- amount = low end, amount_max = high end (null if exact).
                               -- Display "400–500 g"; scale both ends; a single numeric
                               -- column as in rev 1 would have silently lost half of each range.
             note text null)   -- [r2] per-row remark, e.g. "רק בסוף אם חסר",
                               -- "להוסיף בסוף רק אם חסר". Present in the real sample
                               -- data (מתכונים.docx) as a third table column; rev 1
                               -- had nowhere to put it. Renders as small italic ink
                               -- after the amount on the recipe view; never on the menu card.
  -- [r2] unit enum: kg, g, ml, l, cup, pcs, tbsp, tsp, pinch, 'to taste' (null amount).
  --   METRIC ONLY. `cup` and `pinch` ADDED — כוס/כוסות is the 3rd most common unit in the
  --   real data (11 uses) and קורט appears too; rev 1's enum couldn't express either.
  --   cup = 240ml for scaling purposes, but store and display as cup.
  -- [r2] amount may be null with a unit ("כף שמיר" = 1 tbsp) or wholly absent ("בצל ירוק").
steps (id, recipe_id fk on delete cascade, position int,
       heading text null,     -- [r2] the sources title their steps: "הכנת השורש",
                              -- "סינון וסחיטה". Bold heading above the body; null is fine.
       body text)

recipe_revisions (                                              -- [r2] undo safety net
  id uuid pk, recipe_id uuid references recipes on delete cascade,
  snapshot jsonb not null,      -- whole recipe + ingredients + steps
  edited_by uuid references family_members,
  created_at timestamptz default now()
)

-- ── menus ───────────────────────────────────────────────────────────────
menus (
  id uuid pk,
  date date not null,
  title text,                   -- auto-derived from occasion rules, editable
  language text default 'en' check in ('en','he'),   -- per-menu override of the family default
  chef_notes text null,
  saved boolean default false,  -- [r2] ★ "one we liked" — see §3.7
  share_id uuid null, share_secret text null,        -- [r2] guest link, TravelHub pattern
  shared_at timestamptz null,
  deleted_at timestamptz null,
  created_at timestamptz default now()
)
menu_items (
  id uuid pk, menu_id fk on delete cascade,
  recipe_id uuid null references recipes on delete set null,
  course text check in ('aperitif','entree','main','sides','dessert'),
  position int,
  -- [r2] snapshot: what this dish was called ON THIS DATE. Menus are an archive;
  -- without this, editing a recipe in 2027 silently rewrites the 2026 Shabbat card,
  -- and deleting one blanks it. Read snapshot first, fall back to the live recipe.
  dish_title text, dish_description_en text, dish_description_he text,
  credit_name text
)

-- ── kids ────────────────────────────────────────────────────────────────
kids_week (
  id uuid pk,
  week_start date unique not null check (extract(dow from week_start) = 1),  -- [r2] Monday
  created_at timestamptz default now()
)
kids_meals (
  id uuid pk, week_id fk on delete cascade,
  weekday int check (weekday between 1 and 5),    -- [r2] Mon–Fri only: five animals, five days
  meal text check in ('breakfast','lunch','dinner'),
  recipe_id uuid references recipes on delete cascade,
  chef_member_id uuid null references family_members,
  unique (week_id, weekday, meal)                 -- [r2] one dish per slot, no duplicates
)

-- ── config ──────────────────────────────────────────────────────────────
occasion_rules (id, match jsonb, title text, subtitle text, ornament text, priority int)
family_settings (id int pk default 1 check (id = 1),   -- [r2] singleton, enforced
                 default_language text default 'en' check in ('en','he'),
                 timezone text default 'Asia/Jerusalem')
```

### 2.1 Categories — reconciled against the real data [r2]

The sample set (`my_recipes copy.json`, 12 recipes) uses these Hebrew categories, which must map onto the enum:

| Source category | n | → enum | French label on the card |
|---|---|---|---|
| קינוחים ועוגות | 5 | `desserts` | Desserts |
| מאפים מסורתיים | 2 | **`breads`** | Boulangerie |
| לחמים | 2 | **`breads`** | Boulangerie |
| מאפים ואסייתי | 1 | **`breads`** | Boulangerie |
| מנות עיקריות | 1 | `mains` | Plat Principal |
| מרקים | 1 | `soups` | Soupes |

**`breads` is a required addition, not a nice-to-have:** five of the twelve recipes are breads and pastries (challah, no-knead bread, bao buns, gözleme, khaluz). Against rev 1's enum every one of them would have landed in `other` — the largest single group in the cookbook, filed under "miscellaneous". Blueprint placeholder emoji: 🥖.

Note `entrees`, `salads`, `sides` and `kids` have **zero** examples in the sample, so their card counts will read 0 at launch. That's expected, not a bug — but it means the empty states from §1 will be visible on day one and need to look deliberate.

### Access control [r2]

Rev 1 said "RLS: authenticated only" — that was a hole, not a policy. The Supabase anon key ships in the JS bundle and **public signup is on by default**, so any stranger could have created an account and gained full write access to the cookbook. Replace with:

1. **Turn off public signup** in Supabase Auth (Providers → Email → disable "Allow new users to sign up"). Add exactly two users by hand, insert their `family_members` rows with `user_id` set.
2. **Login = magic link**, no passwords. At two logins a month, Supabase's built-in email sender is sufficient — no custom SMTP needed. (Add Resend only if it ever throttles.)
3. **Every table:** `using (is_family()) with check (is_family())` for all four verbs. Never `auth.role() = 'authenticated'`.
4. **Guest menu links — copy TravelHub's `supabase-schema.sql` exactly.** `revoke all on menus, menu_items from anon`, then a single `security definer` RPC:

```sql
create function fetch_shared_menu(p_id uuid, p_secret text) returns jsonb ...
```
   It matches on `share_id + share_secret`, and returns **only** the assembled card — date, title, ornament, chef notes, and the `menu_items` snapshot fields. It must not join `recipes`, so ingredients, steps, stories, and photos are never reachable from a share link. `share_secret` is two concatenated dedashed UUIDs, as TravelHub generates them. Grant execute to `anon`. **Revoke** = `update menus set share_id = null, share_secret = null` — a button on the menu, which rev 1 had no way to do.
5. **Storage bucket `recipe-photos`:** private; read + write policies both gated on `is_family()`. Serve through signed URLs or a Next route — never make the bucket public.
6. Login screen must be designed; the exploration file has none. Keep it in the 1a idiom: header, one email field, "SEND ME A LINK".

### Editing rules [r2]
- **No autosave.** Rev 1's §3.4 autosave is dropped. Explicit **SAVE** / **CANCEL**, with a dirty-state guard on navigate-away. This removes the write races, the lying "saved ✓", and the offline ambiguity in one stroke.
- On each save: write a `recipe_revisions` snapshot, then update. Recipes are tiny; keep every revision. Surface as "⟲ earlier versions" on the recipe view with a restore action.
- Delete is **soft** (`deleted_at`) everywhere, with a 10-second undo toast. Nothing is ever destroyed by a mistap. (Reuse the price-tracker's `undoSnapshot` idea.)
- Last-write-wins between the two of us, which is fine at this scale — revisions make it recoverable. Show "last edited by {name} · {time ago}" on recipe view and edit.
- Ingredient amounts stay structured (numeric + unit) so scaling works; see §5.2.

## 3. Screens

### 3.1 Homepage (1a / 6a)
Themed header (eyebrow, Aviente, subtitle, gold divider) → search bar → category grid (serif name + recipe count; Kids' Table card is the playful pink/blue gradient odd-one-out) → "THIS FRIDAY 🕯" upcoming menu card → nav (bottom on phone, sidebar on desktop): Home / Recipes / Menus / Add.

### 3.2 Category browse (4d)
Category title + count, filter chips (All / per family member / Quick), recipe cards (thumb, serif title, italic "Savta's · serves 8"). **Photo fallback:** striped placeholder with category emoji + label (e.g. 🍗 mains). Select mode: checkbox on each card; sticky bottom bar "N SELECTED — BUILD MENU →".

### 3.3 Recipe view (4b)
Photo hero (or full-width category blueprint), back + EDIT overlay buttons, category eyebrow, serif title (+ `title_en` beneath in small letter-spaced Jost when present), italic attribution ("Papa's recipe · serves 6" — or the `yield_text` when there's no serving count), story as bordered italic quote, INGREDIENTS list (dotted rules, right-aligned amounts, per-row italic notes, scale dropdown), numbered STEPS with bold `heading` where present, buttons: ADD TO MENU / EXPORT PDF / ⟲ earlier versions.

**[r2] Timing row** — a gold-ruled strip under the attribution: `PRÉPARATION 15 min · CUISSON 40 min · 6 PERSONNES`. Every real recipe has these times and rev 1 had nowhere to show them. Omit any part that's null. **[r2] Serving suggestions** render as a small "POUR SERVIR" list below the steps, separate from the story.

### 3.4 Recipe edit (5c) — inline fields, **[r2] explicit save**
- Header bar: EDITING · **SAVE** · CANCEL. Dirty-guard on leave.
- Photo: two dashed buttons — 📷 TAKE PHOTO (mobile `capture` camera input) / 🖼 FROM GALLERY. **[r2] downscale client-side before upload** — canvas to max 1600px, WebP, ~85% quality. Phone photos are 3–12MB; unresized they'd exhaust Supabase's 1GB free Storage and crawl on mobile. On replace, **delete the old object** or orphans accumulate forever.
- Title inline; CATEGORY dropdown; MEAL TYPE dropdown appears only when category = kids.
- Ingredients: drag-reorder (⠿ handle), name + amount + unit dropdown (kg/g/ml/l/pcs/tbsp/tsp/to taste), ✕ delete, + ADD ROW.
- Steps: drag-reorder + delete + add, numbered.
- Description with EN / עב tabs (Hebrew field is RTL). Story/notes textarea.
- Footer: "last edited by {name} · {time ago}".
- **[r2]** Drag-reorder needs a keyboard/desktop path too (↑↓ buttons or arrow keys on the focused handle).

### 3.5 Menu builder (2a + 6c)
- Header: BUILD A MENU, date picker; when the date's occasion rule fires, show badge (e.g. "🕯 Shabbat dinner").
- Language row: "CARD DESCRIPTIONS IN" + EN/עברית segmented toggle (defaults from `family_settings`).
- Course list: white rows, drag-to-reorder (⠿), italic gold course label, serif dish name, description preview in the chosen language — missing Hebrew shows English with a small "EN fallback" tag.
- + ADD A DISH → opens category browse in select mode.
- Buttons: PREVIEW MENU CARD / EXPORT PDF.
- **[r2]** On save, write the `menu_items` snapshot fields from the recipe as it is right now.

### 3.6 Menu card (3b/5a) + guest share
As specced in §1. Language toggle affects **descriptions only** (course names stay French, dish names as written). Per-course credit from the recipe's source member. Buttons: EXPORT PDF / 🔗 SHARE LINK / **[r2]** ⛔ STOP SHARING.

**[r2] The guest link — "send the menu to a family member":** 🔗 SHARE LINK mints `share_id` + `share_secret` and copies `https://…/m/{id}?k={secret}`. The recipient opens it on any phone, sees the menu card read-only, no account, nothing else in the app reachable. Caption on the button: "anyone with the link can see this menu — nothing else." Following TravelHub, the guest page **strips `?k=` from the address bar** after loading so the secret isn't left on screen or leaked in outbound `Referer` headers. Guests get a "SAVE AS PDF" button too.

### 3.7 Saved menus [r2 — replaces "menu history"]
Rev 1 had a full chronological history. You'd rather keep the ones we liked — so:

- **Every menu is still stored** (they're a few rows each; throwing them away buys nothing), but the screen is a **keepers list**, not a log. `menus.saved` = the ★ flag.
- "NOS MENUS" + ＋ NEW. Default view = **★ saved** menus, newest first, plus the upcoming menu pinned at top (gold border, 🕯).
- A quiet "show all menus" link reveals the unstarred ones. Two housekeeping affordances: ★ to keep, and an auto-tidy that soft-deletes unstarred past menus older than 6 months so the list can't silt up.
- **DUPLICATE stays on every row** — copying a menu we liked onto a new date is the single fastest way to build one, and it's the main reason to keep old menus at all.
- Upcoming-holiday suggestion rows from occasion rules (e.g. "🍎 Rosh Hashanah Dinner · Sep 22 · plan ahead").

### 3.8 Kids weekly planner (4a) [r2 — flow clarified]
No auto-suggest. The flow is: **pick a week → pick dishes from the kids menu → place them, either one day at a time or across the whole week.**

1. **Week picker** — "◀ WEEK OF 10 AUG ▶", jumping in whole weeks (`week_start` is always a Monday). Opening the planner defaults to the current week.
2. **Pick dishes** — "＋ PICK DISHES" opens the kids-category recipes in multi-select (filtered by `meal_type`), exactly like §3.2's select mode. Selected dishes land in a **tray** at the bottom of the planner.
3. **Place them, two ways:**
   - **Day by day** — tap a day bubble (🧸 Mon … 🐰 Fri), then drop tray dishes into that day's breakfast / lunch / dinner slots.
   - **Whole week** — "FILL THE WEEK" distributes the tray across Mon–Fri in order, filling only the meals you've enabled, so five picks become a week in one tap. Then adjust individually.
4. Each meal card shows recipe + chef badge (assign a family member); ↻ swap replaces just that meal from the tray. Tap a card → recipe view.
5. Buttons: 🧲 **Fridge PDF!** (week grid, playful style) / **Clear week** (was "Redo week" — with auto-suggest cut, that is all it does; soft-delete + undo toast).

Day bubbles still toggle whether a day is included; excluded days are dashed and hold no meals.

### 3.9 Import — paste JSON from an AI tool (4e) [r2 — replaces CSV]
Follow `price-tracker.html`'s paste flow, which already works this way:

- **Two textareas.** Top = a **read-only prompt** with a 📋 copy button, containing the schema to hand an AI tool ("read this recipe photo / page and return JSON only, in this shape…"). Bottom = **paste the answer here**.
- **Tolerant parsing** — mirror `parseProductPaste()`: strip ``` fences, slice from the first `{`/`[` to the last `}`/`]`, `JSON.parse`, then validate field by field, degrading bad values to null instead of throwing. Accept a single object or an array of them.
- **Live preview as you paste** — title + resolved category ✓, unresolved rows get a "? pick category ▾" dropdown; unknown units fall back to `to taste`; a `source` name that matches no `family_members` row offers "create Savta" or "leave blank". Per-row error list, never a single opaque failure.
- **Duplicate check** on title before commit: "Couscous already exists — skip / add anyway / replace".
- Confirm: "IMPORT N RECIPES", then an undo snapshot.
- Carry a `schemaVersion` in the JSON and **refuse rather than guess** on an unknown one (price-tracker line ~1084).

**Canonical schema** (also the §3.10 migration target and the §8 backup format — keep it stable):

```json
{ "schemaVersion": 1,
  "title": "חלוז צ'רקסי עם גבינה", "titleEn": "Khaluz",
  "category": "breads", "mealType": null,
  "servings": 6, "yieldText": null,
  "prepMinutes": 40, "cookMinutes": 25,
  "source": "Savta",
  "descriptionHe": "…", "descriptionEn": null, "story": "…",
  "servingSuggestions": "מגישים חם לצד ירקות טריים.",
  "ingredients": [
    { "name": "קמח לבן", "amount": 500, "unit": "g" },
    { "name": "ג'ינג'ר טרי", "amount": 400, "amountMax": 500, "unit": "g",
      "note": "מקולף וקצוץ" },
    { "name": "פלפל שחור", "unit": "pinch" },
    { "name": "בצל ירוק" } ],
  "steps": [ { "heading": "הכנת הבצק", "body": "בקערה רחבה מערבבים…" },
             { "body": "לשים את הבצק כ-7-10 דקות…" } ] }
```

Accept a bare array of these, and accept the looser variants documented above.

CSV upload and the downloadable template are **cut** — pasting JSON covers the same need with no file handling and no column-mapping UI.

**[r2] The importer must accept two different source schemas.** The real files prove the exports are not consistent — `my_recipes.json` and `my_recipes copy.json` disagree on almost every field:

| | `my_recipes.json` (1 recipe) | `my_recipes copy.json` (12 recipes) |
|---|---|---|
| name field | `name` | `title` |
| times | `prep_time_minutes` | `prep_time_min` |
| portions | `yield` (free text) | `servings` (int) |
| **ingredients** | objects: `{name, amount, unit, notes}` | **flat strings**: `"500 גרם קמח לבן"` |
| **instructions** | objects: `{step, title, description}` | **flat strings** |
| extras | `usage_recommendations` (array) | `notes` (string) |

So the parser needs a **normalizing front door**: accept either shape per field, and when ingredients or instructions arrive as bare strings, run them through the string parser below. Treat field names as aliases (`name`≡`title`, `prep_time_min`≡`prep_time_minutes`). Expect the ChatGPT export in §3.10 to introduce a third variant — never assume one shape.

**[r2] Parsing rules, derived from the real sample data** (`my_recipes*.json/.md` and `מתכונים.docx`) — the importer must survive all of these, because they are how the recipes are actually written:
- **Amount ranges:** `400-500`, `1.2-1.5`, `150-170`, with either a hyphen or an en-dash → `amount` + `amount_max`.
- **Number + plural noun, where the noun *is* the ingredient:** `4 ביצים`, `3 בצל`, `2 גזרים`, `1 ראש שום`, `1 מקל חמאה` → amount 4, unit `pcs`, name "ביצים". Sixteen ingredients in the sample have no leading number at all — those get a null amount and must not be dropped.
- **`לפי הטעם`** → `to taste`; **`קורט`** → `pinch`; **`כוס`/`כוסות`** → `cup`.
- **Transliteration in the title:** `"לחם ללא לישה (No-Knead Bread)"` → `title` + `title_en`. Only split when the parenthetical is Latin script.
- **Vulgar fractions:** `½` → 0.5, `¼` → 0.25, `⅓`, `¾`, `⅛`… and ASCII `1/2`. Also mixed forms (`1½`).
- **Hebrew spoon-words as units:** `כף`/`כפות` → tbsp, `כפית`/`כפיות` → tsp, `כוס` → ml (240), `גרם` → g, `ק"ג` → kg, `מ"ל` → ml, `ליטר` → l, `יחידה`/`יח'` → pcs.
- **Bare unit, no number:** `כף שמיר` means amount 1, unit tbsp. Default a missing number to 1 when a unit is present.
- **No amount at all:** `בצל ירוק` — store name only, `amount` and `unit` both null. Do not coerce to "to taste"; that's a different statement.
- **Number-then-unit-then-name order is Hebrew-natural** (`3 כפות מיונז`) — parse right-to-left tolerantly rather than assuming a column order.
- Servings appear as `4 מנות` in the heading, not a labelled field.

### 3.10 Bulk migration from the ChatGPT export [r2 — future, but designed for now]

A large body of recipes still lives in a **ChatGPT data export** and will be migrated into the app later. This is a separate path from §3.9 and must not be forced through that UI.

**Why separate:** the paste dialog is right for one-to-a-few recipes typed or photographed ad hoc. A ChatGPT export is `conversations.json` — recipes buried as free text inside chat messages, unstructured, likely hundreds of candidates, mostly Hebrew, mixed with unrelated conversation. Pasting that into a textarea is neither practical nor safe.

**The path:**
1. A **local one-off Node script** (`tools/migrate-chatgpt.mjs`, kept in the repo, run from your machine — never deployed) reads the export, walks `conversations.json`, and extracts candidate recipe blocks with their conversation id + heading as `external_ref`.
2. Each candidate is normalized into the **§3.9 JSON shape** — that schema is therefore the project's single canonical import format, and it already accepts an array. Normalization uses an AI pass, the same way the paste flow does, just batched.
3. The script writes to Supabase with the **service-role key from a local `.env`** (never committed, never in a Vercel env var — nothing server-side needs it), stamping one `import_batch_id` per run.
4. **Idempotent:** the unique index on `external_ref` means re-running skips what already landed instead of duplicating it. Safe to run repeatedly as normalization improves.
5. **`--dry-run` is the default.** It prints a per-recipe report — parsed / partial / rejected, with reasons — and writes nothing until `--commit`. A batch is fully undoable: `update recipes set deleted_at = now() where import_batch_id = '…'`.
6. Anything the script can't confidently parse is **imported as a draft** (title + raw text in `story`, empty ingredients) rather than dropped, and surfaced by a "needs tidying" filter on the browse screen so it can be finished by hand. Losing a family recipe to a parser is worse than importing it messy.

**Sequencing:** this is post-launch work — it needs recipe CRUD and the JSON schema to exist and be stable first. Nothing in phases 1–8 should be designed around it, but the two hook columns in §2 and the array-accepting import schema mean it will not require a migration or a rewrite when the time comes. If any export images come along, run them through §3.4's downscale-then-upload path rather than a second image pipeline.

## 4. PDF export [r2 — real downloaded files]

You want a file, not a print dialog. So:

- Build three **print routes** first — `/print/recipe/[id]`, `/print/menu/[id]`, `/print/kids/[week]` — styled with a `@media print` sheet: A4 portrait, `print-color-adjust: exact` (**critical** — browsers strip background colors by default, which would erase the beige card and green header), nav and buttons hidden, no page-break inside a card.
- Then a Vercel serverless route renders that page to PDF with headless Chromium (`puppeteer-core` + `@sparticuz/chromium-min`, loading the brotli pack remotely to stay inside the Hobby deploy budget) and returns it as a download with a sensible filename (`aviente-menu-2026-08-08.pdf`).
- **`@react-pdf` is rejected**: it supports neither gradients nor `box-shadow`, so the radial-gradient candle flames, the double frame, and the fleurons would all have to be re-approximated. The card would stop matching the design. Rendering the real CSS in a real browser is the only way to keep 3b/5a exact — and it gets RTL Hebrew for free.
- The print routes also give a zero-cost fallback: if the Chromium route ever misbehaves, the same URL is directly printable, and the guest share page can use it without a serverless call.
- Verify Hebrew glyphs and the candles **in the generated PDF**, not only on screen — embedded-font bugs only show up there.

## 5. Language, search, scaling

**[r2] Rev 1 had the language assumption backwards, and the real data proves it.** It required `description_en` and made `description_he` optional. In fact **all 13 sample recipes are entirely Hebrew — there is not one English word of recipe content in either file**, and no description field at all. So:

- **Both description columns are nullable**, and neither is privileged.
- **Fallback runs both directions:** if the chosen language is missing, show the other one. Rev 1's one-way "missing Hebrew → show English" would have left every card blank.
- The builder's tag becomes a neutral "**other-language fallback**" chip rather than "EN fallback". Still never printed on the card.
- **`family_settings.default_language` defaults to `'he'`**, not `'en'` — that's what the corpus is.
- Descriptions are short menu-card lines and don't exist in the source data at all, so they must be **written by hand or generated at import**, per recipe. Until one exists, the card falls back to the dish name alone. Plan for most recipes to have no description on day one.
- App-wide `default_language`; each menu overrides it.
- Toggle affects menu-card **descriptions only**; course names stay French, dish names as written (with `title_en` available when a card is set to English).
- UI chrome stays English (French-accented) regardless. Hebrew text fields and Hebrew card descriptions render RTL.

### 5.1 Search [r2]
**Recipes only** — confirmed. It searches `title` + ingredient names + `description_en`/`description_he`, and nothing else (not menus, not steps, not stories). Use **`pg_trgm` similarity**, not `to_tsvector`: the corpus is small, trigrams tolerate typos, and Postgres full-text has no useful Hebrew stemming. Maintain `search_tsv` as title ‖ ingredient names ‖ descriptions with a GIN trigram index. Needs a results screen — the exploration file has none; use 3.2's card list with the query echoed as the title and an empty state.

### 5.2 Serving scaling [r2]
Scaling multiplies amounts by `target/servings`, with rules rev 1 left undefined:
- **[r2] If `servings` is null (a `yield_text` recipe), hide the scale dropdown entirely.** There is no portion count to scale against; the ginger concentrate in the sample data is exactly this case.
- **[r2] Ranges scale at both ends** — `400–500 g` at ×1.5 becomes `600–750 g`.
- `to taste` (null amount) and `pinch` pass through **untouched**.
- `pcs` rounds up to a whole number (3 eggs × 1.5 = 5, not 4.5); display an "≈" hint.
- Other units round to 2 significant decimals, and g/ml promote to kg/l above 1000.
- **Step text does not scale** ("add the 200g of flour" stays literal). Show a one-line note under the scale dropdown when scale ≠ 1 so nobody is misled.

## 6. Occasion rules — data, not code [r2 — corrected]

`occasion_rules` drive titles + ornaments from the menu date.

- `{weekday: 5, from: 'evening'}` → "Aviente Family Shabbat Dinner", ornament `candles`, subtitle "shabbat shalom · chez nous".
- **[r2] Match on hebcal holiday *keys*, not stored dates.** Rev 1 stored Jewish holidays as dated rows; Hebrew dates move against the Gregorian calendar every year, so those rows would be silently wrong by next autumn. Store `{hebcal: 'Rosh Hashana'}` and resolve the date at query time with `@hebcal/core`. The table then never goes stale.
- **[r2] Jewish days start at sundown.** A rule needs an evening/day notion, or a Friday *lunch* menu gets titled "Shabbat Dinner". Give each rule `from: 'evening' | 'day'`; treat a menu as an evening meal if it has a `main` course, otherwise ask. Yom Kippur break-fast falls on the *following* evening, not the fast day.
- **[r2] Timezone is `family_settings.timezone`, default `Asia/Jerusalem`** — never the device clock, or the same menu would retitle itself on a laptop abroad.
- Highest-priority matching rule wins; the title is always manually editable.
- Ornament `candles` = the two CSS-drawn candles flanking the card title (flame: radial-gradient ellipse `#e8a13c→#c47a2a`; wax `#d9cfb4` 4×26px; base `#a8905e`).

## 7. Explicitly cut / rejected

Shopping list · timing plan tab · auto-suggest kids week · realtime co-editing · per-recipe language toggle (moved to menu level) · FROM field on edit · imperial units (metric only).
**[r2] also cut:** autosave (→ explicit save) · CSV import + template (→ JSON paste) · chronological menu history (→ ★ saved menus) · `@react-pdf` · password login · any third user.

## 8. Operations [r2]

- **Idle pausing — settled [r2]:** the free tier pauses after 7 days of no activity, and Itzik will edit a recipe weekly, which resets the counter. No Pro plan, no keep-warm cron.
- **[r2] Backups are the real durability risk, not pausing.** The free tier gives no automated backups, and this is a permanent family archive containing recipes that exist nowhere else. Ship a **JSON export of everything** (the pattern already exists in both sibling apps) and keep a monthly dump in `~/Documents/Recipes`. The §3.9 import schema is also the restore format, so export/import close the loop.
- Vercel **Hobby** is free and forbids commercial use — correct and compliant here.
- Copy TravelHub's `vercel.json`: CSP plus `Referrer-Policy: no-referrer` (which is what keeps guest share secrets out of outbound headers). Any new external font, image host, or API must be added to the CSP or the browser blocks it.
- Supabase URL + publishable key via Vercel env vars for all three environments, written at build time by TravelHub's `scripts/write-config.js` pattern. The publishable key is safe in client code; the **service-role key must never appear client-side**.
- Add `manifest.webmanifest` + `apple-touch-icon` (copy TravelHub's) so the app installs to the phone home screen — this lives in a kitchen.

## 9. Testing & release gate [r2]

Every release passes three layers, in order. Nothing merges on a red layer.

```
Sonnet agent, localhost          Sonnet agent, localhost         Itzik, on the Ultra
   ① SANITY  (~2 min)      →       ② REGRESSION  (~10 min)   →     ③ MANUAL  (~5 min)
   every PR                        before a release                before a release
        ↓ green                          ↓ green                        ↓ ✅
   open the PR                     tag the release                  deploy to prod
```

**Reuse `~/Documents/Vacation POC/tests/`** — it already solves this. Copy three things: `selftest.js`'s **machine-readable result object** (`window.__selftest = {pass, fail, results}`) so an agent can assert without re-implementing anything; its **`skip("why")` discipline** — a check that cannot run in the current context must say so, never `return true`, because two TravelHub checks silently passed at desktop width while exercising nothing; and its **versioned `TEST-PLAN-vX.Y.Z.md`** format for layer ③. Its guiding line applies here too: *"most assertions cover bugs that actually shipped — a suite that only tests what was never broken is decoration."*

### 9.1 Prerequisites the agent needs (build these in step 1, not later)

These three make agent testing possible at all; without them layers ① and ② can't exist.

1. **A separate database, never the real one.** Tests must be free to delete things, so **an agent must never point them at the production project** — that's the family archive.
   **[r2 — corrected against the actual machine]** `supabase start` needs Docker, and this Mac has **neither Docker nor the Supabase CLI**. So rather than a local Postgres, use a **second free Supabase project as `aviente-dev`** (the free tier allows two), seeded from `supabase/seed.sql`, and point `.env.local` plus all Vercel **Preview** env vars at it. Trade-offs to accept: tests need network, and resets are a SQL truncate rather than `db reset`. If Docker Desktop gets installed later, switch to local — it's faster and offline — but don't block on it.
2. **A test login path.** Magic-link auth is not automatable — there's no inbox to poll. So local/preview builds only expose a password sign-in for two seeded test users, gated behind `NEXT_PUBLIC_E2E === '1'`, which is **never set in the production environment**. (If auth ends up TravelHub-style secret links instead, this problem disappears — the secret is just a fixture. Worth weighing when settling §2's auth question.)
3. **A version footer**, as TravelHub has, so layer ③ is never performed against a cached build. Manual testing the wrong build is worse than not testing.
4. Stable `data-testid` hooks on the things tests must find — nav, course rows, drag handles, day bubbles, the scale dropdown — rather than selectors keyed to Cormorant/Jost styling that will churn.

### 9.2 Layer ① — sanity, every PR

Fast and shallow. Fails loudly on a broken build.

- `npm run build` clean, **zero TypeScript errors, zero console errors** on any route.
- Every route responds: `/`, `/recipes`, `/recipes/[id]`, category browse, `/menus`, builder, `/m/[slug]`, `/kids`, `/import`, login, all three `/print/*`.
- The 13 seeded recipes are present, with correct per-category counts (including `breads` = 5 — the count that proves §2.1 landed).
- Signed out, every route redirects to login and **no data renders**.
- Renders at **412×915 and 1280×800** with no horizontal page scroll.

### 9.3 Layer ② — regression, before a release

Ordered by what actually hurts if it breaks.

**Security — the highest-value tests in the project.**
- An `anon` client can read **nothing**: `recipes`, `ingredients`, `steps`, `menus`, `menu_items`, `kids_meals` all return zero rows.
- `fetch_shared_menu(id, secret)` returns the card fields **and nothing else** — assert the response contains no ingredients, steps, story, or photo URL. This is the guest-link containment guarantee; assert it on the response shape, not by reading the SQL.
- A wrong or revoked secret returns null. After ⛔ STOP SHARING, the previously-working link is dead.
- The Storage bucket rejects an unauthenticated read.
- `NEXT_PUBLIC_E2E` is absent from a production-mode build (grep the build output — a password login shipped to prod would bypass everything above).

**Data integrity.**
- **Menu snapshots:** build a menu, rename the recipe, re-render the old card → the old dish name is unchanged. Then soft-delete the recipe → the card still renders. This is the archive guarantee from §2.
- Soft delete hides a recipe from browse and search; the undo toast restores it; a saved revision restores prior ingredients and steps.
- `unique (week_id, weekday, meal)` rejects a duplicate kids slot.
- Two concurrent saves: last write wins **and** both revisions exist.

**Correctness of the fiddly logic.**
- Scaling: a range scales at both ends (`400–500 g` ×1.5 → `600–750 g`); `pcs` rounds up (3 eggs ×1.5 → 5); `to taste` and `pinch` pass through untouched; a `yield_text` recipe shows **no** scale dropdown.
- Occasion rules: Friday evening → Shabbat title + candles; Friday **lunch** → not Shabbat (the sundown bug); a hebcal holiday resolves correctly in **two different Gregorian years** (the staleness bug rev 1 would have shipped); the title stays overridable.
- Import: both source schemas parse (structured *and* flat-string ingredients); ranges, `½`, `כף שמיר` → 1 tbsp, `בצל ירוק` → null amount, `4 ביצים` → 4 pcs; a duplicate title prompts; an unknown `schemaVersion` is **refused, not guessed**; a bad row fails alone without aborting the batch.
- Language: a Hebrew-only recipe on an English card falls back to Hebrew (**not blank** — rev 1's one-way rule); the fallback chip shows in the builder and never on the card.

**Rendering.**
- Menu card at 412px and on desktop: frame, fleurons, candles, and RTL Hebrew all present; an empty course is omitted entirely.
- PDF route returns `application/pdf`, a non-trivial byte size, and **extractable Hebrew text** — the only way to catch a missing embedded font.
- `axe-core` pass on every screen, plus an explicit assertion that gold **text** resolves to `#8a6d2f` and not `#c9a961` (§1's 2.02:1 failure regressing is invisible to the eye but trivial to assert).
- Touch targets ≥44px at 412px width.

### 9.4 The agent's workflow

The agent (Sonnet, localhost) does exactly this, and **opens no PR on a failure**:

1. `supabase start`, reset and seed the local DB.
2. `npm run dev` on a fixed port.
3. Run layer ① (and ② when the branch is a release candidate).
4. Write `tests/reports/<branch>-<n>.md`: pass/fail/skip counts, every failure with its assertion and a screenshot, and every **skip with its reason** — an unexplained skip is treated as a failure.
5. Green → open the PR, pasting the summary table into the description. Red → report the failures and stop. It must never describe a suite as passing when checks were skipped.

### 9.5 Layer ③ — the manual pass

A versioned `tests/TEST-PLAN-v<version>.md` per release, in TravelHub's proven style: about five minutes, numbered steps with an explicit **Expect:** per step, ⚠️ marking what's new or previously broken, ✅/❌ boxes, and the version footer to confirm up front. Scope it to what a machine can't judge — does the printed card look *right*, does the kids planner feel playful, is the Hebrew typography actually beautiful. Perform it **on the Ultra**, not a desktop browser, since that's the primary device.

### 9.6 CI and branch conventions

- Private repo on your **personal** GitHub (per the account rule). Feature branch → PR → your review → merge to `main` → Vercel production.
- The same suites run in GitHub Actions on the PR, so a green agent report can be independently confirmed rather than trusted.
- **Vercel Preview deployments must not point at production Supabase.** Scope Preview env vars to a separate staging project, or every PR preview reads and writes the real family cookbook.

## 10. Build order

1. Supabase schema + **auth (signup off, two users, `is_family()` policies)** + seed categories/members + **import the 13 real sample recipes** + `preview-device.html` + **the §9.1 test prerequisites (local DB, E2E login gate, version footer, testids)**
2. Recipe CRUD — view/edit/browse, explicit save, revisions, soft delete, photo downscale + upload, blueprints
3. Search (§5.1) + serving scaling (§5.2)
4. Menu builder + card + occasion rules + `menu_items` snapshots
5. Print routes → Chromium PDF route (all three artifacts)
6. Saved menus + duplicate + guest share RPC + revoke
7. Kids planner + fridge PDF
8. JSON paste import (§3.9) — the canonical import schema
9. Per-user theme + language setting + desktop breakpoints + empty/loading/error states + accessibility pass
10. **[r2] Post-launch:** bulk migration of the ChatGPT export (§3.10) + monthly JSON backup export (§8)
