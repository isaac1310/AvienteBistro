> **Read REMAINING.md first.** This checklist is the original build plan and its
> boxes reflect the order things were *intended* in, not the state of the app. Where
> the two disagree, REMAINING.md was written against the code and wins.
> Reconciled 20 Aug 2026.

# Aviente — build checklist

Every item has the steps to do it and the condition that says it's done. The
authority for *what* to build is `../aviente-build-spec.md`; this is the order and
the mechanics. Tick things off here as they land.

Legend: `[x]` done · `[ ]` to do · `[!]` blocked on you, not on code

---

## Phase 1 · Foundation

- [x] **Next.js scaffold** — App Router, TypeScript, no Tailwind (the design is a
      precise token system; plain CSS matches it more faithfully).
- [x] **Schema applied** — `supabase/migrations/0001..0003` all run clean.
- [x] **Seed** — 13 real recipes, generated from your source files by
      `node tools/seed-from-source.mjs --commit`.
- [x] **Design tokens** — `app/globals.css`, including the split gold
      (`--gold` decorative, `--gold-ink` for text only).
- [x] **Identity** — Le Cachet, Est. 2018. `components/Cachet.tsx`,
      `public/brand/{logo-cachet,icon,icon-small}.svg`.
- [x] **Splash** — TravelHub's timing model; `?splash=hold` for screenshots.
- [x] **Version footer** — `lib/version.ts`. Bump `APP_VERSION` every release.
- [x] **Fonts** — five faces incl. Frank Ruhl Libre + Heebo for Hebrew.

- [x] **Step 6: environment keys** — everything below is blocked on this.
      1. Supabase → Project Settings → API.
      2. Copy **Project URL** and the **anon / publishable** key.
      3. `cp .env.example .env.local`, paste both in, set `NEXT_PUBLIC_E2E=1`.
      4. Restart `npm run dev`.
      **Done when:** the homepage counts come from the database instead of the
      hard-coded array in `app/page.tsx`.
      *Do not* put the `service_role` key here or in Vercel.

- [x] **Supabase client wiring**
      1. `lib/supabase/client.ts` — browser client via `@supabase/ssr`
         `createBrowserClient`.
      2. `lib/supabase/server.ts` — server client with the cookie adapter, for
         Server Components and route handlers.
      3. `lib/supabase/middleware.ts` + `middleware.ts` — refresh the session on
         every request, redirect signed-out users to `/login`.
      **Done when:** a Server Component can read `recipes` and an unauthenticated
      request to `/` lands on `/login`.

- [x] **Login screen** (`app/login/page.tsx`)
      1. Le Cachet plaque, one email field, `SEND ME A LINK`.
      2. `supabase.auth.signInWithOtp({ email })`.
      3. **The code fallback** — same email carries a 6-digit code; add an
         "or enter the code" field calling `verifyOtp`. This covers requesting the
         link on the laptop and opening it on the phone, which otherwise fails.
      4. `app/auth/callback/route.ts` — `exchangeCodeForSession`, then redirect.
      5. Behind `NEXT_PUBLIC_E2E`, a password form for the two test users.
      **Done when:** you can sign in with a real magic link, and with a code.

- [x] **`family_settings` + per-user theme** — shipped; `data-theme` on `<html>`, switch in Settings.
      1. Read `family_members.theme` for the signed-in user; stamp
         `data-theme` on `<html>`.
      2. A theme switch that writes the column.
      **Done when:** switching to burgundy changes your phone and not Moran's.

---

## Phase 2 · Recipes (§3.2–3.4)

- [x] **Category browse** (`app/recipes/[category]/page.tsx`)
      1. Title + count, filter chips (All / per member / Quick).
      2. Cards: thumb, serif title, italic "Savta's · serves 8".
      3. **Photo fallback** — striped placeholder with the category emoji.
      4. Select mode: checkbox per card, sticky `N SELECTED — BUILD MENU →`.
      **Done when:** all five seeded categories browse correctly, and `breads`
      shows 5.

- [x] **Recipe view** (`app/recipes/[category]/[id]/page.tsx`)
      1. Photo hero or full-bleed blueprint; back + EDIT overlays.
      2. Serif title, `title_en` beneath when present, italic attribution.
      3. **Timing strip** — `PRÉPARATION 15 min · CUISSON 40 min · 6 PERSONNES`,
         omitting null parts; `yield_text` replaces the portion count.
      4. Story as a bordered italic quote.
      5. Ingredients: dotted rules, right-aligned amounts, ranges as `400–500 g`,
         per-row italic notes, scale dropdown.
      6. Steps: numbered, bold `heading` when present.
      7. `POUR SERVIR` list from `serving_suggestions`.
      8. Buttons: ADD TO MENU / EXPORT PDF / ⟲ earlier versions.
      **Done when:** the ginger concentrate shows its yield and **no** scale
      dropdown, and the khaluz shows its notes.

- [x] **Serving scaling** (`lib/scale.ts`)
      1. Multiply by `target/servings`; scale `amount` **and** `amount_max`.
      2. `pcs` rounds up with an "≈" hint; `to taste` and `pinch` untouched.
      3. g/ml promote to kg/l above 1000; 2 significant decimals otherwise.
      4. Hide the control entirely when `servings is null`.
      5. Note under the dropdown that step text does not scale.
      **Done when:** `400–500 g` at ×1.5 reads `600–750 g`, and 3 eggs ×1.5 is 5.

- [x] **Recipe edit** (§3.4) — **explicit save, no autosave**
      1. Header: EDITING · SAVE · CANCEL, with a dirty-guard on navigate-away.
      2. Inline title; CATEGORY select; MEAL TYPE only when category = kids.
      3. Ingredients: drag-reorder with a keyboard path (↑↓ on the focused
         handle), name + amount + unit + note, delete, add row.
      4. Steps: same, with the optional heading field.
      5. EN / עב description tabs; the Hebrew field is RTL.
      6. On save: write a `recipe_revisions` snapshot, then update.
      7. Footer: "last edited by {name} · {time ago}".
      **Done when:** saving twice leaves two revisions and the footer updates.

- [x] **Photos**
      1. Two dashed buttons: 📷 TAKE PHOTO (`capture="environment"`) /
         🖼 FROM GALLERY.
      2. **Downscale before upload** — canvas to max 1600px, WebP ~0.85.
      3. Upload to the private `recipe-photos` bucket; render via signed URL.
      4. On replace, **delete the old object** or orphans accumulate forever.
      **Done when:** a 9MB phone photo lands under ~250KB and replacing one
      leaves exactly one object in the bucket.

- [x] **Soft delete + undo** — `deleted_at`, a 10-second undo toast, and every
      query filtering `deleted_at is null`.

- [x] **Search** (§5.1) — recipes only: title, `title_en`, ingredient names, both
      descriptions. NOTE: shipped as `ilike` on `search_text`, NOT `pg_trgm` — the extension is not enabled and substring is adequate at 41 recipes. Tracked in REMAINING.md. Needs a results
      screen and an empty state; neither exists in the design file.

---

## Phase 3 · Menus (§3.5–3.7)

- [x] **Occasion rules** (`lib/occasion.ts`)
      1. Resolve `{weekday: 5}` and `{hebcal: "..."}` against the menu date using
         `@hebcal/core`, in `family_settings.timezone` (never the device clock).
      2. Evening vs day: a menu with a `main` course is an evening meal, so a
         Friday **lunch** must not be titled Shabbat Dinner.
      3. Yom Kippur break-fast is the **following** evening (`offset_days`).
      4. Highest priority wins; the title stays editable.
      **Done when:** the same holiday resolves correctly in two different years.

- [x] **Menu builder** (§3.5) — date picker with occasion badge, language
      segmented toggle, drag-reorder course rows, `+ ADD A DISH` into select
      mode, other-language fallback chip. **On save, write the `menu_items`
      snapshot fields** from the recipe as it is right now.

- [x] **Menu card** (§3.6 / 3b-5a) — beige, double frame, ❧ fleurons, burgundy
      French course names, ❦ dividers, per-course credit, CSS candles for the
      `candles` ornament. An empty course is omitted, never printed empty.
      Fixed width; centred on desktop, never reflowed.

- [x] **Print routes + PDF** (§4)
      1. `/print/recipe/[id]`, `/print/menu/[id]`, `/print/kids/[week]` with a
         `@media print` sheet: A4 portrait, **`print-color-adjust: exact`**
         (without it browsers strip the beige and green), no nav, no page-break
         inside a card.
      2. `app/api/pdf/route.ts` — `puppeteer-core` + `@sparticuz/chromium-min`,
         renders a print route, returns a download named
         `aviente-menu-2026-08-08.pdf`.
      **Done when:** the PDF has extractable Hebrew text — that is the only way to
      catch a missing embedded font.

- [x] **Saved menus** (§3.7) — ★ list by default, upcoming pinned, "show all"
      for the rest, DUPLICATE on every row, holiday suggestion rows, auto-tidy of
      unstarred menus older than 6 months.

- [x] **Guest share** (§3.6)
      1. 🔗 SHARE LINK mints `share_id` + `share_secret`, copies
         `/m/{id}?k={secret}`.
      2. `app/m/[id]/page.tsx` calls `fetch_shared_menu` — already written.
      3. **Strip `?k=` from the address bar** after loading, so the secret is not
         left on screen or leaked in `Referer`.
      4. ⛔ STOP SHARING nulls both columns.
      **Done when:** a revoked link returns nothing, and the guest page exposes
      no ingredients.

---

## Phase 4 · Kids, import, polish

- [x] **Kids planner** (§3.8) — week picker (Mondays), `＋ PICK DISHES` into a
      tray, place day-by-day or `FILL THE WEEK`, animal day bubbles, chef badges,
      ↻ swap, 🧲 Fridge PDF, Clear week. Exempt from theming.

- [x] **JSON paste import** (§3.9) — copyable prompt textarea, paste box, live
      preview, duplicate-title check, unknown `schemaVersion` refused.
      `lib/recipeParse.mjs` already does the parsing; this is the UI.

- [x] **Backup export** (§8) — one button, whole cookbook as §3.9 JSON. Free tier
      has no automated backups and these recipes exist nowhere else.

- [ ] **Desktop + polish** — 768/1024 breakpoints, sidebar nav, empty/loading/
      error states on every list, `axe-core` clean, 44px targets at 412px.

- [ ] **Deploy** — import to Vercel **signed in as `isaac1310`** (a work-linked
      account offers the Locusview team as a scope), Preview env vars pointed at a
      **separate dev project**, then do spec steps 5 and 7.

- [ ] **Flip the repo private**, then delete the recipe-content block from
      `.gitignore` so the seed is versioned again.

---

## Phase 5 · Post-launch

- [ ] **ChatGPT export migration** (§3.10) — `tools/migrate-chatgpt.mjs`,
      dry-run default, idempotent on `external_ref`, unparseable recipes imported
      as drafts behind a "needs tidying" filter rather than dropped.
