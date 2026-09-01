-- Transactional save boundaries.
--
-- Every save that touches more than one table used to be a chain of separate
-- PostgREST writes: recipe save was revision → update → delete ingredients →
-- delete steps → insert ingredients → insert steps, six round trips, any of which
-- could fail and leave the row half-written. The menu-revision restore actually
-- shipped that bug once (a refused delete plus a completed insert = every dish
-- twice). These functions move each boundary into ONE database transaction: it all
-- lands, or none of it does.
--
-- SECURITY INVOKER, deliberately. The caller is the signed-in family member, so
-- every statement inside still runs under the same RLS policies as the individual
-- writes did — this migration adds atomicity, not privilege. Anon keeps nothing:
-- execute is revoked from public/anon below, and db-check asserts anon is refused.

-- ── recipes ───────────────────────────────────────────────────────────────

create or replace function save_recipe_tx(
  p_id uuid,               -- null = create
  p_fields jsonb,          -- the recipes columns, exactly as lib/mutations.ts builds them
  p_ingredients jsonb,     -- array of {name, amount, amount_max, unit, note, group_label}
  p_steps jsonb,           -- array of {heading, body}
  p_member uuid            -- who is saving (revision credit)
) returns uuid
language plpgsql
security invoker
as $$
declare
  rid uuid := p_id;
begin
  if rid is not null then
    -- The revision FIRST, same invariant the app code has always kept: nothing is
    -- overwritten before it is snapshotted. Same shape as the JS snapshot() —
    -- the row plus its children — so the ⟲ restore path reads both eras alike.
    insert into recipe_revisions (recipe_id, snapshot, edited_by)
    select r.id,
      to_jsonb(r)
        || jsonb_build_object(
             'ingredients',
             coalesce((select jsonb_agg(to_jsonb(i)) from ingredients i where i.recipe_id = r.id), '[]'::jsonb),
             'steps',
             coalesce((select jsonb_agg(to_jsonb(s)) from steps s where s.recipe_id = r.id), '[]'::jsonb)),
      p_member
    from recipes r where r.id = rid;

    update recipes set
      title               = p_fields->>'title',
      title_en            = p_fields->>'title_en',
      category            = p_fields->>'category',
      meal_type           = p_fields->>'meal_type',
      description_he      = p_fields->>'description_he',
      description_en      = p_fields->>'description_en',
      story               = p_fields->>'story',
      serving_suggestions = p_fields->>'serving_suggestions',
      prep_minutes        = (p_fields->>'prep_minutes')::int,
      cook_minutes        = (p_fields->>'cook_minutes')::int,
      servings            = (p_fields->>'servings')::int,
      yield_text          = p_fields->>'yield_text',
      source_member_id    = (p_fields->>'source_member_id')::uuid,
      photo_path          = p_fields->>'photo_path',
      updated_by          = (p_fields->>'updated_by')::uuid,
      updated_at          = coalesce((p_fields->>'updated_at')::timestamptz, now())
    where id = rid;

    if not found then
      raise exception 'save_recipe_tx: recipe % not found', rid;
    end if;

    -- Children replaced wholesale, same as the app has always done — but now a
    -- refused insert rolls the delete back too.
    delete from ingredients where recipe_id = rid;
    delete from steps where recipe_id = rid;
  else
    insert into recipes (
      title, title_en, category, meal_type, description_he, description_en,
      story, serving_suggestions, prep_minutes, cook_minutes, servings,
      yield_text, source_member_id, photo_path, updated_by, updated_at
    ) values (
      p_fields->>'title', p_fields->>'title_en', p_fields->>'category',
      p_fields->>'meal_type', p_fields->>'description_he', p_fields->>'description_en',
      p_fields->>'story', p_fields->>'serving_suggestions',
      (p_fields->>'prep_minutes')::int, (p_fields->>'cook_minutes')::int,
      (p_fields->>'servings')::int, p_fields->>'yield_text',
      (p_fields->>'source_member_id')::uuid, p_fields->>'photo_path',
      (p_fields->>'updated_by')::uuid,
      coalesce((p_fields->>'updated_at')::timestamptz, now())
    ) returning id into rid;
  end if;

  insert into ingredients (recipe_id, position, name, amount, amount_max, unit, note, group_label)
  select rid, ord - 1,
         e->>'name', (e->>'amount')::numeric, (e->>'amount_max')::numeric,
         e->>'unit', e->>'note', e->>'group_label'
  from jsonb_array_elements(coalesce(p_ingredients, '[]'::jsonb)) with ordinality as t(e, ord);

  insert into steps (recipe_id, position, heading, body)
  select rid, ord - 1, e->>'heading', e->>'body'
  from jsonb_array_elements(coalesce(p_steps, '[]'::jsonb)) with ordinality as t(e, ord);

  return rid;
end;
$$;

-- ── menus ─────────────────────────────────────────────────────────────────

create or replace function save_menu_tx(
  p_id uuid,       -- null = create
  p_fields jsonb,  -- date, meal_time, title, language, chef_notes, course_order
  p_items jsonb,   -- FINAL menu_items rows (snapshot fields already resolved by the app)
  p_member uuid
) returns uuid
language plpgsql
security invoker
as $$
declare
  mid uuid := p_id;
begin
  if mid is not null then
    insert into menu_revisions (menu_id, snapshot, edited_by)
    select m.id,
      to_jsonb(m)
        || jsonb_build_object(
             'menu_items',
             coalesce((select jsonb_agg(to_jsonb(i)) from menu_items i where i.menu_id = m.id), '[]'::jsonb)),
      p_member
    from menus m where m.id = mid;

    update menus set
      date         = (p_fields->>'date')::date,
      meal_time    = p_fields->>'meal_time',
      title        = p_fields->>'title',
      language     = p_fields->>'language',
      chef_notes   = p_fields->>'chef_notes',
      course_order = case
        when p_fields->'course_order' is null or p_fields->'course_order' = 'null'::jsonb then null
        else (select array_agg(x) from jsonb_array_elements_text(p_fields->'course_order') as x)
      end
    where id = mid;

    if not found then
      raise exception 'save_menu_tx: menu % not found', mid;
    end if;

    delete from menu_items where menu_id = mid;
  else
    insert into menus (date, meal_time, title, language, chef_notes, course_order)
    values (
      (p_fields->>'date')::date, p_fields->>'meal_time', p_fields->>'title',
      p_fields->>'language', p_fields->>'chef_notes',
      case
        when p_fields->'course_order' is null or p_fields->'course_order' = 'null'::jsonb then null
        else (select array_agg(x) from jsonb_array_elements_text(p_fields->'course_order') as x)
      end
    ) returning id into mid;
  end if;

  insert into menu_items (
    menu_id, recipe_id, course, position,
    dish_title, dish_title_en, dish_description_en, dish_description_he, credit_name
  )
  select mid, (e->>'recipe_id')::uuid, e->>'course', ord - 1,
         e->>'dish_title', e->>'dish_title_en',
         e->>'dish_description_en', e->>'dish_description_he', e->>'credit_name'
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as t(e, ord);

  return mid;
end;
$$;

-- Family members only. Anon must be refused outright — db-check asserts it.
revoke execute on function save_recipe_tx(uuid, jsonb, jsonb, jsonb, uuid) from public, anon;
revoke execute on function save_menu_tx(uuid, jsonb, jsonb, uuid) from public, anon;
grant execute on function save_recipe_tx(uuid, jsonb, jsonb, jsonb, uuid) to authenticated;
grant execute on function save_menu_tx(uuid, jsonb, jsonb, uuid) to authenticated;

insert into schema_migrations (version, name) values (21, 'transactional_saves')
on conflict (version) do nothing;
