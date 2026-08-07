# What's left

Honest state of the app at v0.9.0. Grouped by who has to do it.

---

## A · Yours — five minutes, unblocks everything else

- [ ] **A0 · Run `supabase/migrations/0006_menu_revisions.sql`**
      New table. Until it exists, saving a menu throws — menus now snapshot before
      every save, the way recipes always have.
- [ ] **A1 · Run `supabase/migrations/0005_ingredient_groups.sql`**
      One `alter table`. Without it the ingredient groups vanish silently on
      import, which is the exact problem the column exists to prevent.
- [ ] **A2 · Run `supabase/sample-descriptions.sql`**
      Fills the italic line under every dish name on the menu card. Re-runnable;
      never overwrites anything you write yourself.
- [ ] **A3 · Import the 21 recipes**
      Paste `~/Documents/Recipes/metakonim-import.json` into `/import`. Eleven
      will show `other` with a dropdown — set those, then Import. "Undo this
      import" reverses the whole batch if it looks wrong.
- [ ] **A4 · Delete the test menu** (Friday 07.08.2026) and its share link.
- [ ] **A5 · Make the repo private**, then remove the recipe-content block from
      `.gitignore` so the seed and source files are versioned again.

---

## B · Real gaps in the build — things the spec asks for that do not exist

- [x] **B1 · Revision history** — ⟲ on recipes and menus, restore is itself undoable.
- [x] **B2 · Undo toast** — ten seconds, with a visible countdown.
- [x] **B3 · Per-user theme** — green/burgundy on /recipes, stored per member.
- [ ] **B4 · No select mode on category browse.** §3.2's "N SELECTED — BUILD
      MENU →" is missing. Building a menu from a category is currently one dish
      at a time through the builder's picker.
- [x] **B5 · Menu revisions** — migration 0006; saveMenu snapshots first.
- [x] **B6 · /print/recipe/[id]** — built; two columns on paper.
- [ ] **C1 · Extract the 8 dish photos** from `מתכונים.pdf` and attach them.
      This also finally exercises the photo pipeline with real files — one of the
      three things never tested.
- [ ] **C2 · No kids recipes exist.** The planner, the animals, fill-the-week and
      the fridge PDF are all built against an empty category.
- [ ] **C3 · ChatGPT export** — arriving in a few days. §3.10 describes the
      migration; `tools/parse-markdown-book.mjs` is the working template for it.

---

## D · Testing

- [ ] **D1 · `tests/TEST-PLAN-v0.9.0.md`** — the human pass, for judgement calls
      a machine cannot make.
- [ ] **D2 · Agent run on localhost** — selftest at both widths plus the flows
      that need a session.
- [ ] **D3 · Three things never tested end to end:** photo upload (needs a real
      file), magic-link email (needs an inbox), and a second person editing at
      the same time.

---

## Not doing, and why

- **Drag-and-drop photo moving** — a picker is one tap and behaves the same on
  phone and desktop; dragging across a scrolling list is fiddly and undoing it
  means dragging back.
- **A separate test database** — dropped by decision. The selftest is read-only
  by construction instead.
- **Playwright** — removed. The suite lives in the app at `?selftest=1`.
