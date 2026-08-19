-- Who may replace the whole cookbook.
--
-- Any family member can add recipes, paste from an AI, and correct individual
-- dishes — including replacing one. What is gated is WHOLESALE replacement:
-- restoring a backup overwrites every recipe in one motion, and that is an admin
-- operation, not a member one. The app enforces it in the import mutation by batch
-- size, so pasting a backup into the ordinary import screen is caught too.
--
-- 'member' is the default: a new person can never arrive with the keys.
alter table family_members
  add column if not exists role text not null default 'member'
    check (role in ('admin','member'));

comment on column family_members.role is
  'admin may restore whole backups; everyone may add and edit recipes.';

-- Itzik runs the Supabase project, the migrations and the backups — the admin in
-- fact, so the admin in the data.
update family_members set role = 'admin' where name in ('Itzik', 'Papa');

insert into schema_migrations (version, name) values (12, 'member_role')
on conflict (version) do nothing;
