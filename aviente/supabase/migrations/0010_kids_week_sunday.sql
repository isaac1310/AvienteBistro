-- The kids' week runs Sunday to Saturday.
--
-- It was Monday to Friday: `kids_week` enforced an ISO Monday start and
-- `kids_meals.weekday` was checked between 1 and 5. That is a European school week,
-- and this family's week begins on Sunday.
--
-- Two separate changes, and only one of them touches existing data:
--
--   * weekday numbering does NOT move. It was 1..5 meaning Mon..Fri, which is
--     already what JavaScript's getDay() means, so every stored row keeps pointing at
--     the day it always did. Only the range widens, to admit Sunday (0) and
--     Saturday (6).
--   * week_start DOES move. A week keyed to Monday the 3rd is the same week as one
--     keyed to Sunday the 2nd, so every existing row shifts back one day. Without
--     this the rows survive but become unreachable: the app would look for the Sunday
--     and find nothing, and a planned week would appear to have been wiped.

alter table kids_meals drop constraint if exists kids_meals_weekday_check;
alter table kids_meals
  add constraint kids_meals_weekday_check check (weekday between 0 and 6);

comment on column kids_meals.weekday is
  'JavaScript getDay(): 0 = Sunday … 6 = Saturday. Unchanged for Mon-Fri rows.';

-- Drop the Monday rule BEFORE moving the dates, or the update violates it midway.
alter table kids_week drop constraint if exists kids_week_starts_monday;

-- Monday → the Sunday before it. Guarded so running this file twice cannot walk the
-- dates backwards a day at a time.
update kids_week
   set week_start = week_start - 1
 where extract(isodow from week_start) = 1;

alter table kids_week
  add constraint kids_week_starts_sunday check (extract(dow from week_start) = 0);

comment on column kids_week.week_start is
  'The Sunday the week begins on. extract(dow) = 0, not isodow — isodow has no 0.';

insert into schema_migrations (version, name) values (10, 'kids_week_sunday')
on conflict (version) do nothing;
