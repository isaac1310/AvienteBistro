-- Aviente Family Recipe Cookbook — initial schema
-- Implements §2 of aviente-build-spec.md (revision 2).
--
-- Run order: this file, then 0002_policies.sql, then seed.sql.
--
-- Two humans use this database (Itzik, Moran). Everything else that appears in
-- the app -- Papa, Maman, Savta -- is a credit record with no login.

create extension if not exists pg_trgm;

-- ─────────────────────────────────────────────────────────────── identity ──

create table family_members (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  display_name  text,
  -- NULL for credit-only people. Only two rows ever carry a user_id.
  user_id       uuid unique references auth.users on delete set null,
  theme         text not null default 'green' check (theme in ('green','burgundy')),
  created_at    timestamptz not null default now()
);

comment on column family_members.user_id is
  'NULL means credit-only (e.g. Savta cooks but never logs in).';

-- Used by every policy. security definer so it can read family_members while
-- family_members itself is behind RLS; stable so the planner calls it once.
create function is_family() returns boolean
  language sql security definer stable
  set search_path = public
as $$
  select exists (select 1 from family_members where user_id = auth.uid())
$$;

-- ──────────────────────────────────────────────────────────────── recipes ──

create table recipes (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,                 -- as written, usually Hebrew
  title_en            text,                          -- transliteration: "(Khaluz)"
  category            text not null check (category in
                        ('entrees','soups','salads','mains','sides',
                         'breads','desserts','kids','other')),
  meal_type           text check (meal_type in ('breakfast','lunch','dinner')),
  photo_url           text,
  description_en      text,                          -- both nullable: the corpus is Hebrew
  description_he      text,
  story               text,
  serving_suggestions text,
  prep_minutes        int check (prep_minutes >= 0),
  cook_minutes        int check (cook_minutes >= 0),
  servings            int check (servings > 0),
  yield_text          text,                          -- "כ-1 ליטר תמצית מרוכזת"
  source_member_id    uuid references family_members on delete set null,
  updated_by          uuid references family_members on delete set null,
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  -- migration hooks (§3.10) -- cheap now, a migration later
  import_batch_id     uuid,
  external_ref        text,
  -- a recipe is portioned OR measured by output, never both, never neither
  constraint recipes_portion_or_yield check (
    (servings is not null and yield_text is null) or
    (servings is null and yield_text is not null)
  ),
  -- meal_type belongs to kids recipes only
  constraint recipes_meal_type_kids_only check (
    meal_type is null or category = 'kids'
  )
);

create unique index recipes_external_ref_key
  on recipes (external_ref) where external_ref is not null;
create index recipes_category_idx on recipes (category) where deleted_at is null;
create index recipes_deleted_idx  on recipes (deleted_at);

create table ingredients (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references recipes on delete cascade,
  position    int  not null,
  name        text not null,
  amount      numeric,        -- low end of a range, or the exact amount
  amount_max  numeric,        -- high end; NULL when not a range ("400-500 גרם")
  unit        text check (unit in
                ('kg','g','ml','l','cup','pcs','tbsp','tsp','pinch','to taste')),
  note        text,           -- "רק בסוף אם חסר"
  constraint ingredients_range_ordered check (
    amount_max is null or (amount is not null and amount_max >= amount)
  )
);
create index ingredients_recipe_idx on ingredients (recipe_id, position);

create table steps (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references recipes on delete cascade,
  position   int  not null,
  heading    text,            -- "הכנת השורש"
  body       text not null
);
create index steps_recipe_idx on steps (recipe_id, position);

-- Written on every save. Recipes are tiny; keep all of them. This is what makes
-- last-write-wins survivable between two editors.
create table recipe_revisions (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references recipes on delete cascade,
  snapshot   jsonb not null,  -- recipe + ingredients + steps
  edited_by  uuid references family_members on delete set null,
  created_at timestamptz not null default now()
);
create index recipe_revisions_recipe_idx on recipe_revisions (recipe_id, created_at desc);

-- Search (§5.1): trigram, not full-text -- Postgres has no useful Hebrew stemming.
-- Maintained by trigger rather than generated, because it spans child tables.
alter table recipes add column search_text text;

create function refresh_recipe_search(p_recipe uuid) returns void
  language sql security definer set search_path = public
as $$
  update recipes r set search_text = concat_ws(' ',
      r.title, r.title_en, r.description_he, r.description_en,
      (select string_agg(i.name, ' ') from ingredients i where i.recipe_id = r.id))
  where r.id = p_recipe
$$;

create function trg_refresh_recipe_search() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  perform refresh_recipe_search(coalesce(new.recipe_id, old.recipe_id));
  return null;
end $$;

create function trg_refresh_own_search() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  perform refresh_recipe_search(new.id);
  return null;
end $$;

create trigger recipes_search_au after insert or update of
    title, title_en, description_he, description_en on recipes
  for each row execute function trg_refresh_own_search();
create trigger ingredients_search_aiud after insert or update or delete on ingredients
  for each row execute function trg_refresh_recipe_search();

create index recipes_search_trgm on recipes using gin (search_text gin_trgm_ops);

-- ────────────────────────────────────────────────────────────────── menus ──

create table menus (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  title         text,
  language      text not null default 'he' check (language in ('en','he')),
  chef_notes    text,
  saved         boolean not null default false,   -- the ★ "one we liked" flag
  share_id      uuid unique,
  share_secret  text,
  shared_at     timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index menus_date_idx  on menus (date desc) where deleted_at is null;
create index menus_saved_idx on menus (saved)     where deleted_at is null;

create table menu_items (
  id        uuid primary key default gen_random_uuid(),
  menu_id   uuid not null references menus on delete cascade,
  recipe_id uuid references recipes on delete set null,
  course    text not null check (course in
              ('aperitif','entree','main','sides','dessert')),
  position  int not null,
  -- Snapshot: what this dish was called ON THIS DATE. Menus are an archive, so
  -- editing a recipe in 2027 must not rewrite the 2026 Shabbat card. Read these
  -- first; fall back to the live recipe only when null.
  dish_title           text,
  dish_title_en        text,
  dish_description_en  text,
  dish_description_he  text,
  credit_name          text
);
create index menu_items_menu_idx on menu_items (menu_id, course, position);

-- ─────────────────────────────────────────────────────────────────── kids ──

create table kids_week (
  id         uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  created_at timestamptz not null default now(),
  -- ISO Monday. The five weekday animals are Mon-Fri, so the convention matters.
  constraint kids_week_starts_monday check (extract(isodow from week_start) = 1)
);

create table kids_meals (
  id             uuid primary key default gen_random_uuid(),
  week_id        uuid not null references kids_week on delete cascade,
  weekday        int  not null check (weekday between 1 and 5),   -- Mon..Fri
  meal           text not null check (meal in ('breakfast','lunch','dinner')),
  recipe_id      uuid not null references recipes on delete cascade,
  chef_member_id uuid references family_members on delete set null,
  unique (week_id, weekday, meal)
);

-- ───────────────────────────────────────────────────────────────── config ──

-- Occasion rules are data, not code (§6). `match` is one of:
--   {"weekday": 5, "from": "evening"}      -> every Friday night
--   {"hebcal": "Rosh Hashana", "from": "evening"}
-- Holidays match on a hebcal KEY resolved at query time, never a stored date --
-- Hebrew dates move against the Gregorian calendar every year.
create table occasion_rules (
  id       uuid primary key default gen_random_uuid(),
  match    jsonb not null,
  title    text not null,
  subtitle text,
  ornament text,
  priority int not null default 0
);

create table family_settings (
  id               int primary key default 1 check (id = 1),   -- singleton
  default_language text not null default 'he' check (default_language in ('en','he')),
  timezone         text not null default 'Asia/Jerusalem'
);
insert into family_settings (id) values (1);
