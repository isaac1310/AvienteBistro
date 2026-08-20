-- v11.0.0's schema. Four changes, three tables, and one non-change worth recording.
--
-- Back up before running: two CHECK constraints are dropped and re-added on the only
-- copy of the family's recipes. Verified against the export taken first — 74 recipes,
-- 721 ingredients, 420 steps, 8 photo paths, document version 1.
--
-- 1 · A `sauces` category. Evidence rather than a hunch: `other` held seven recipes
--     and three of them are sauces or spreads (ממרח חומוס ביתי, רוטב בוטנים,
--     רוטב סאטה). This empties `other` back down to genuine oddments, which is what
--     `other` is for.
--
--     NOT done by renaming `other`, which was the cheaper idea: `mapCategory` returns
--     `other` as its UNRESOLVED FALLBACK (recipeParse.mjs), and the ChatGPT export
--     still to come will lean on it. Rename it and every unrecognised recipe lands in
--     Sauces — silently wrong instead of visibly unsorted.
--
-- 2 · A sixth course, `pain`. Categories and courses answer different questions:
--     `recipes.category` is where a recipe is filed in the book, `menu_items.course`
--     is where a dish sits in the running order of a printed meal. The sample menu has
--     a Pain de Table section our card could not reproduce — a focaccia had to be
--     filed under Sides.
--
-- 3 · `menus.course_order`, so the running order is per menu. A Friday dinner opens
--     with challah and runs six courses; a Tuesday lunch is a main and a salad. `null`
--     means "use the default", so every existing menu is untouched and no backfill is
--     needed.
--
-- 4 · No change to `menu_items.recipe_id`. The plan called for making it nullable for
--     free-text dishes; it already is (0001: `references recipes on delete set null`,
--     no `not null`). Left here as a record so the next person does not go looking for
--     the migration that did it.
--
-- The two CHECK widenings are drop-and-re-add. Constraint names are stated explicitly
-- and dropped `if exists`, so a fresh database and one upgraded from 14 both work.
--
-- Numbered 15, not the 17 the plan said. The plan sequenced the kids-table migrations
-- first and they have not been written yet; leaving a 15/16 hole for them would mean
-- two migrations that arrive AFTER this one carrying lower numbers, and the version
-- gate reads the highest row. The number follows the order things actually happen in.

alter table recipes drop constraint if exists recipes_category_check;
alter table recipes add constraint recipes_category_check check (category in
  ('entrees','soups','salads','mains','sides',
   'breads','desserts','kids','sauces','other'));

comment on column recipes.category is
  'Where the recipe is filed in the book. `breads` is labelled מאפים / Breads & Baking in the app and holds pastries, pies and muffins too — a label change, not a key change, and the importer already routed מאפים there. `other` is also the importer''s unresolved fallback: do not repurpose it.';

alter table menu_items drop constraint if exists menu_items_course_check;
alter table menu_items add constraint menu_items_course_check check (course in
  ('aperitif','entree','pain','main','sides','dessert'));

alter table menus add column if not exists course_order text[];

-- Values only, not order or length: the whole point is that a menu chooses its own
-- arrangement. `<@` allows a subset in any order, and null passes.
alter table menus drop constraint if exists menus_course_order_valid;
alter table menus add constraint menus_course_order_valid check (
  course_order is null or course_order <@
    array['aperitif','entree','pain','main','sides','dessert']::text[]);

comment on column menus.course_order is
  'The running order for THIS menu, or null for the app default (aperitif · pain · entree · main · sides · dessert). A course holding dishes always prints even when absent from this list — hiding is not deleting.';

insert into schema_migrations (version, name) values (15, 'sauces_pain_course_order')
on conflict (version) do nothing;
