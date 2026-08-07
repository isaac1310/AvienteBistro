-- Is this menu eaten after sundown?
--
-- lib/occasion.ts has always taken a mealTime argument and handled it correctly:
-- a Jewish day begins at sundown, so Friday EVENING is Shabbat and Friday lunch is
-- not. But every one of the five call sites passed the literal 'evening', so the
-- argument was dead and a Friday lunch menu came out titled "Shabbat Dinner".
--
-- 'evening' is the default because that is what a menu here almost always is, and
-- because it is what every existing row was effectively resolved as — defaulting to
-- 'day' would retitle menus that are already printed and shared.
alter table menus
  add column if not exists meal_time text not null default 'evening'
    check (meal_time in ('evening','day'));

comment on column menus.meal_time is
  'evening = after sundown, so the Hebrew day is the NEXT Gregorian day. Decides whether the Shabbat and festival rules fire at all.';

-- The guest card resolves its own occasion, so the share RPC has to carry the new
-- column. Without this a shared Friday-lunch menu would still print candles: the
-- family's copy would be corrected and the guest's would not, which is the worse of
-- the two to get wrong — it is the one that goes out to other people.
--
-- Replaced whole rather than altered: a plpgsql body cannot be patched in place, and
-- the shape of the returned object is what §9.3 asserts on.
create or replace function fetch_shared_menu(p_id uuid, p_secret text)
  returns jsonb
  language plpgsql security definer stable
  set search_path = public
as $$
declare
  v_menu   record;
  v_items  jsonb;
begin
  select m.id, m.date, m.meal_time, m.title, m.language, m.chef_notes
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
    'meal_time',  v_menu.meal_time,
    'title',      v_menu.title,
    'language',   v_menu.language,
    'chef_notes', v_menu.chef_notes,
    'items',      v_items
  );
end $$;

grant execute on function fetch_shared_menu(uuid, text) to anon, authenticated;
