-- Sub-shelves inside a category — starting with Breads & Baking.
--
-- Back up before running: this rewrites rows. Taken 2026-09-30 with
-- `npm run backup-check` — 122 recipes, 1183 ingredients, 709 steps, every photo
-- path resolving.
--
-- Why a column and not a new category: Breads is the second-largest shelf (26), and
-- scrolling it was the complaint. A new category would compete with this one for the
-- same recipes; headings inside the one page do not. Nullable, so every other
-- category is untouched and a breads recipe without one still lists (under the last
-- heading, "unsorted").
--
-- Only breads has sub-shelves today, and the CHECK says so explicitly — the same
-- pattern as recipes_meal_type_kids_only. Widening it to another category later is a
-- drop-and-re-add of this one constraint.

alter table recipes add column if not exists subgroup text;

alter table recipes drop constraint if exists recipes_subgroup_valid;
alter table recipes add constraint recipes_subgroup_valid check (
  subgroup is null
  or (category = 'breads' and subgroup in ('loaves','rolls','savory','pies')));

comment on column recipes.subgroup is
  'A heading inside the category page. breads only: loaves | rolls | savory | pies. Null = unsorted.';

-- ── the save function learns the column ─────────────────────────────────────
-- Same body as 0021 plus `subgroup` in the update and the insert. Without this the
-- form would send the field and the function would silently drop it.

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
      subgroup            = p_fields->>'subgroup',
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
      title, title_en, category, meal_type, subgroup, description_he, description_en,
      story, serving_suggestions, prep_minutes, cook_minutes, servings,
      yield_text, source_member_id, photo_path, updated_by, updated_at
    ) values (
      p_fields->>'title', p_fields->>'title_en', p_fields->>'category',
      p_fields->>'meal_type', p_fields->>'subgroup',
      p_fields->>'description_he', p_fields->>'description_en',
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

revoke execute on function save_recipe_tx(uuid, jsonb, jsonb, jsonb, uuid) from public, anon;
grant execute on function save_recipe_tx(uuid, jsonb, jsonb, jsonb, uuid) to authenticated;

-- ── backfill, from the titles, reviewed against the 2026-09-30 backup ───────────
-- The toast is not baking; it moves to Other. Its revision is not snapshotted here
-- (this is a one-off data fix, and the backup above is the undo).
update recipes set category = 'other', subgroup = null
where category = 'breads' and title like '%טוסט%';

update recipes set subgroup = case
    when title ~ '^\s*לחמני'                          then 'rolls'
    when title ~ '(בורקס|גוזלומה|גזלמה|חלוז|מאפינס|מאפין)' then 'savory'
    when title ~ '(פשטיד|קיש)'                          then 'pies'
    else 'loaves'
  end
where category = 'breads' and subgroup is null;

insert into schema_migrations (version, name) values (23, 'recipe_subgroup')
on conflict (version) do nothing;
