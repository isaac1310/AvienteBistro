-- What migrations this database actually has.
--
-- Written after 0008 was merged and not run: the app queried menus.meal_time, the
-- column was not there, and /menus threw a 500 in production. Nothing in the app
-- could tell "the database is a version behind" from "the code is broken", and the
-- version constant in lib/version.ts was decorative — nothing ever compared it to
-- anything.
--
-- One row per migration. Every future migration ends by inserting its own.
create table if not exists schema_migrations (
  version    int primary key,
  name       text not null,
  applied_at timestamptz not null default now()
);

-- Backfill everything already applied. `on conflict do nothing` so this file is
-- safe to run twice, which matters because it will be pasted by hand.
insert into schema_migrations (version, name) values
  (1, 'init'),
  (2, 'policies'),
  (3, 'storage'),
  (4, 'occasion_rules_public'),
  (5, 'ingredient_groups'),
  (6, 'menu_revisions'),
  (7, 'card_language'),
  (8, 'menu_meal_time'),
  (9, 'schema_migrations')
on conflict (version) do nothing;

-- Readable by a signed-in family member. Not writable from the app at all: rows
-- arrive with the migration that creates them, and an app that could write here
-- could tell itself the schema is fine when it is not.
alter table schema_migrations enable row level security;

drop policy if exists schema_migrations_read on schema_migrations;
create policy schema_migrations_read on schema_migrations
  for select to authenticated using (is_family());

grant select on schema_migrations to authenticated;
