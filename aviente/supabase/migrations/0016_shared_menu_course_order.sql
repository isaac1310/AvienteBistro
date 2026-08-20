-- The share link has to print the same card the owner sees.
--
-- `course_order` arrived in 0015 and the guest page could not see it: the shared view
-- goes through `fetch_shared_menu`, a security-definer RPC that builds a fixed JSON
-- object, so a column added to `menus` is invisible to it until the function is
-- rewritten. A Friday menu arranged challah-first would have printed one way for the
-- family and another for whoever was sent the link — and the printed card is the one
-- thing in this app whose whole purpose is to be handed to someone else.
--
-- Same body as 0008 otherwise. Rewritten in full rather than patched, because
-- `create or replace` needs the whole function and a diff-shaped edit here is how a
-- coalesce goes missing.
--
-- Also: `order by x.course` sorts the courses ALPHABETICALLY inside the JSON —
-- 'aperitif','dessert','entree','main','pain','sides'. That has always been wrong and
-- has always been harmless, because both the card and the print route sort by the
-- catalogue index themselves. Left as it was: making the RPC's order meaningful would
-- invite a caller to trust it, and the arrangement is now genuinely per menu.

create or replace function fetch_shared_menu(p_id uuid, p_secret text)
  returns jsonb
  language plpgsql security definer stable
  set search_path = public
as $$
declare
  v_menu   record;
  v_items  jsonb;
begin
  select m.id, m.date, m.meal_time, m.title, m.language, m.chef_notes, m.course_order
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
    'date',         v_menu.date,
    'meal_time',    v_menu.meal_time,
    'title',        v_menu.title,
    'language',     v_menu.language,
    'chef_notes',   v_menu.chef_notes,
    'course_order', v_menu.course_order,
    'items',        v_items
  );
end;
$$;

grant execute on function fetch_shared_menu(uuid, text) to anon, authenticated;

insert into schema_migrations (version, name) values (16, 'shared_menu_course_order')
on conflict (version) do nothing;
