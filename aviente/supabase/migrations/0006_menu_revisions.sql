-- Menu revisions.
--
-- Recipes have snapshotted every save since 0001. Menus did not, and with two
-- people editing that asymmetry mattered: the second save won silently and the
-- first person's evening was gone, with nothing to restore from.
--
-- Menus are a handful of rows each. Keep every version, as recipes do.

create table menu_revisions (
  id         uuid primary key default gen_random_uuid(),
  menu_id    uuid not null references menus on delete cascade,
  snapshot   jsonb not null,          -- the menu plus its items
  edited_by  uuid references family_members on delete set null,
  created_at timestamptz not null default now()
);

create index menu_revisions_menu_idx on menu_revisions (menu_id, created_at desc);

alter table menu_revisions enable row level security;
revoke all on menu_revisions from anon;
create policy family_all on menu_revisions for all to authenticated
  using (is_family()) with check (is_family());
