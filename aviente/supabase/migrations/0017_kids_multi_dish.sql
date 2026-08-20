-- Several dishes in one meal, dishes with no recipe, and ordering that cannot race.
--
-- Today `kids_meals` allows exactly one row per (week, day, meal) and demands a
-- recipe_id. Both block what the planner is for: a lunch is a sandwich AND a fruit,
-- and "bread with white cheese" needs no recipe at all. A tired parent planning the
-- week wants to know what to shop for and what to prepare, and half of that never
-- had a recipe.
--
-- SAFE ON THE EXISTING DATA, checked before writing this rather than hoped: the table
-- holds 16 rows across two weeks (2026-08-02 and 2026-08-16), every one of them has a
-- recipe_id and no slot holds more than one dish. So every existing row satisfies the
-- new XOR constraint, and dropping a unique constraint can never fail on data.

-- The generated name is what 0001's `unique (week_id, weekday, meal)` produced;
-- `if exists` so a database built fresh from a future 0001 does not fail here.
alter table kids_meals drop constraint if exists kids_meals_week_id_weekday_meal_key;

alter table kids_meals add column if not exists position int not null default 0;
alter table kids_meals alter column recipe_id drop not null;
alter table kids_meals add column if not exists free_text text;

-- XOR, not "either". An earlier draft said "recipe_id is not null or free_text is not
-- null", which accepts '', accepts whitespace, and accepts BOTH at once — all three
-- render as an empty line in the planner and on the fridge sheet, which is how a
-- blank dish gets printed and nobody knows why.
alter table kids_meals drop constraint if exists kids_meals_one_kind;
alter table kids_meals add constraint kids_meals_one_kind check (
  (recipe_id is not null and free_text is null)
  or (recipe_id is null and nullif(btrim(free_text), '') is not null)
);

alter table kids_meals drop constraint if exists kids_meals_position_sane;
alter table kids_meals add constraint kids_meals_position_sane check (position >= 0);

-- Positions are deliberately NOT unique within a slot. A transient tie is harmless
-- when the read order is (position, id), and a unique index would force a temporary
-- shuffle on every reorder — three writes to move one dish.
create index if not exists kids_meals_slot_idx
  on kids_meals (week_id, weekday, meal, position);

comment on column kids_meals.free_text is
  'A dish with no recipe — "לחם עם גבינה לבנה". First-class, not a lesser dish: half of what a week actually contains never had a recipe. Exactly one of recipe_id / free_text is set. Contributes no ingredients, so it can never feed a shopping list; if one is ever built, these appear as their own verbatim line.';

-- ── ordering belongs in the database ─────────────────────────────────────────
--
-- `position = max + 1` computed in application code races two simultaneous adds to
-- the same number, and nothing in the app was ever going to repair positions after a
-- delete or a cross-slot move. So each operation is one function that locks the slot
-- and does the whole thing: insert-and-number, move-and-renumber, delete-and-close-
-- the-gap. Same lesson as the menu snapshot: an invariant spanning rows belongs where
-- the rows are.
--
-- `security definer` because they write through RLS, so each one checks is_family()
-- itself. A definer function that forgets that check is a public write endpoint.

create or replace function kids_add(
  p_week_id uuid, p_weekday int, p_meal text,
  p_recipe_id uuid, p_free_text text,
  p_chef_member_id uuid default null,
  p_replace_id uuid default null
) returns uuid
  language plpgsql security definer
  set search_path = public
as $$
declare
  v_next int;
  v_id   uuid;
begin
  if not is_family() then
    raise exception 'not a family member';
  end if;

  /* Replacing is the commonest edit — "not that dish, this one" — and it must not
     become an insert. The picker carries the row it is replacing; without this branch
     the swap button would silently add a second dish. */
  if p_replace_id is not null then
    update kids_meals
       set recipe_id = p_recipe_id,
           free_text = p_free_text,
           chef_member_id = coalesce(p_chef_member_id, chef_member_id)
     where id = p_replace_id
       and week_id = p_week_id
     returning id into v_id;
    if v_id is null then
      raise exception 'no such dish to replace: %', p_replace_id;
    end if;
    return v_id;
  end if;

  /* The lock is on the WEEK row, not on kids_meals: there is nothing to lock in an
     empty slot, and two people adding to the same week is the only contention that
     exists here. It serialises the read-then-write below. */
  perform 1 from kids_week where id = p_week_id for update;

  select coalesce(max(position) + 1, 0) into v_next
    from kids_meals
   where week_id = p_week_id and weekday = p_weekday and meal = p_meal;

  insert into kids_meals (week_id, weekday, meal, recipe_id, free_text, chef_member_id, position)
  values (p_week_id, p_weekday, p_meal, p_recipe_id, p_free_text, p_chef_member_id, v_next)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function kids_move(
  p_id uuid, p_weekday int, p_meal text, p_position int default null
) returns void
  language plpgsql security definer
  set search_path = public
as $$
declare
  v_week    uuid;
  v_weekday int;
  v_meal    text;
  v_pos     int;
begin
  if not is_family() then
    raise exception 'not a family member';
  end if;

  select week_id, weekday, meal, position
    into v_week, v_weekday, v_meal, v_pos
    from kids_meals where id = p_id;
  if v_week is null then
    raise exception 'no such dish: %', p_id;
  end if;

  perform 1 from kids_week where id = v_week for update;

  /* Out of the old slot first: close the gap, so positions stay 0..n-1 there whether
     or not anything else moves. Renumbering on read instead would mean every caller
     had to agree about it, and the fridge sheet is a different caller from the
     planner. */
  update kids_meals set position = position - 1
   where week_id = v_week and weekday = v_weekday and meal = v_meal and position > v_pos;

  /* Then into the new one. A null position means the end — which is what dragging a
     dish onto a slot rather than between two dishes means. */
  if p_position is null then
    select coalesce(max(position) + 1, 0) into p_position
      from kids_meals
     where week_id = v_week and weekday = p_weekday and meal = p_meal
       and id <> p_id;
  else
    update kids_meals set position = position + 1
     where week_id = v_week and weekday = p_weekday and meal = p_meal
       and position >= p_position and id <> p_id;
  end if;

  update kids_meals
     set weekday = p_weekday, meal = p_meal, position = p_position
   where id = p_id;
end;
$$;

create or replace function kids_remove(p_id uuid) returns void
  language plpgsql security definer
  set search_path = public
as $$
declare
  v_week    uuid;
  v_weekday int;
  v_meal    text;
  v_pos     int;
begin
  if not is_family() then
    raise exception 'not a family member';
  end if;

  delete from kids_meals where id = p_id
    returning week_id, weekday, meal, position
    into v_week, v_weekday, v_meal, v_pos;

  /* A delete that removed nothing is reported, not swallowed. The whole reason
     "clear week doesn't work" went unnoticed for a release is that a refused delete
     was indistinguishable from a successful one. */
  if v_week is null then
    raise exception 'no such dish: %', p_id;
  end if;

  update kids_meals set position = position - 1
   where week_id = v_week and weekday = v_weekday and meal = v_meal and position > v_pos;
end;
$$;

grant execute on function kids_add(uuid, int, text, uuid, text, uuid, uuid) to authenticated;
grant execute on function kids_move(uuid, int, text, int) to authenticated;
grant execute on function kids_remove(uuid) to authenticated;

insert into schema_migrations (version, name) values (17, 'kids_multi_dish')
on conflict (version) do nothing;
