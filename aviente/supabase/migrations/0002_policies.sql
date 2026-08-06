-- Aviente — row level security and the guest share RPC.
-- Implements §2 "Access control". Read this with the spec open.
--
-- The security model in one sentence: the two of us are authenticated members and
-- see everything; guests are anonymous, hold a secret, and can reach exactly one
-- assembled menu card through one function.
--
-- ⚠️ This file is only half the gate. The other half is a dashboard setting:
--    Auth → Providers → Email → "Allow new users to sign up" MUST be OFF.
--    Left on, signInWithOtp creates an account for any address typed, and any
--    stranger becomes a family member. No SQL here can compensate for that.

-- ─────────────────────────────────────────────── members: authenticated only ──

alter table family_members    enable row level security;
alter table recipes           enable row level security;
alter table ingredients       enable row level security;
alter table steps             enable row level security;
alter table recipe_revisions  enable row level security;
alter table menus             enable row level security;
alter table menu_items        enable row level security;
alter table kids_week         enable row level security;
alter table kids_meals        enable row level security;
alter table occasion_rules    enable row level security;
alter table family_settings   enable row level security;

-- Nothing is reachable directly by anonymous callers. Guest access goes through
-- fetch_shared_menu() below, which is security definer and therefore unaffected.
revoke all on family_members, recipes, ingredients, steps, recipe_revisions,
              menus, menu_items, kids_week, kids_meals, occasion_rules,
              family_settings
  from anon;

-- One policy shape for every table: you are family, or you see nothing.
do $$
declare t text;
begin
  foreach t in array array[
    'family_members','recipes','ingredients','steps','recipe_revisions',
    'menus','menu_items','kids_week','kids_meals','occasion_rules',
    'family_settings'
  ] loop
    execute format(
      'create policy family_all on %I for all to authenticated
         using (is_family()) with check (is_family())', t);
  end loop;
end $$;

-- ────────────────────────────────────────────────────── the guest menu link ──

-- Returns the assembled card and NOTHING else. Note what is absent: this never
-- joins ingredients, steps, story, or photo_url. A shared menu therefore cannot
-- leak the cookbook, which is a property of this function's SELECT list -- so
-- the regression test in §9.3 asserts on the response shape, not on the source.
create function fetch_shared_menu(p_id uuid, p_secret text)
  returns jsonb
  language plpgsql security definer stable
  set search_path = public
as $$
declare
  v_menu   record;
  v_items  jsonb;
begin
  select m.id, m.date, m.title, m.language, m.chef_notes
    into v_menu
    from menus m
   where m.share_id = p_id
     and m.share_secret = p_secret
     and m.deleted_at is null;

  if v_menu.id is null then
    return null;                      -- wrong, revoked, or deleted
  end if;

  select coalesce(jsonb_agg(x order by x.course, x.position), '[]'::jsonb)
    into v_items
    from (
      select mi.course,
             mi.position,
             coalesce(mi.dish_title,          r.title)          as dish_title,
             coalesce(mi.dish_title_en,       r.title_en)       as dish_title_en,
             coalesce(mi.dish_description_en, r.description_en) as description_en,
             coalesce(mi.dish_description_he, r.description_he) as description_he,
             mi.credit_name
        from menu_items mi
        left join recipes r on r.id = mi.recipe_id
       where mi.menu_id = v_menu.id
    ) x;

  return jsonb_build_object(
    'date',       v_menu.date,
    'title',      v_menu.title,
    'language',   v_menu.language,
    'chef_notes', v_menu.chef_notes,
    'items',      v_items
  );
end $$;

grant execute on function fetch_shared_menu(uuid, text) to anon, authenticated;

-- Revoking a link is a plain update by a family member:
--   update menus set share_id = null, share_secret = null, shared_at = null
--    where id = $1;

-- ──────────────────────────────────────────────────────────── seed families ──
-- Occasion rules. Every Friday evening is Shabbat dinner; holidays match on a
-- hebcal key resolved at query time so these rows never go stale.

insert into occasion_rules (match, title, subtitle, ornament, priority) values
  ('{"weekday": 5, "from": "evening"}',
   'Aviente Family Shabbat Dinner', 'shabbat shalom · chez nous', 'candles', 10),
  ('{"hebcal": "Rosh Hashana", "from": "evening"}',
   'Rosh Hashanah Dinner', 'shanah tovah · chez nous', 'apple', 100),
  ('{"hebcal": "Yom Kippur", "from": "evening", "offset_days": 1}',
   'Break-Fast', 'tsom kal · chez nous', 'star', 100),
  ('{"hebcal": "Sukkot", "from": "evening"}',
   'Sukkot Dinner', 'chag sameach · dans la soukka', 'branch', 90),
  ('{"hebcal": "Chanukah", "from": "evening"}',
   'Hanukkah Dinner', 'chag urim sameach · chez nous', 'candles', 90),
  ('{"hebcal": "Pesach", "from": "evening"}',
   'Seder de Pessah', 'chag kasher ve''sameach', 'star', 100),
  ('{"hebcal": "Shavuot", "from": "evening"}',
   'Shavuot Dinner', 'chag sameach · chez nous', 'branch', 90);
