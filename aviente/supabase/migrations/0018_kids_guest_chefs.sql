-- Chef Guest and Chef Babysitter.
--
-- Credit-only rows: `user_id` null, so they can be named as the cook on a dish and
-- can never sign in. `chef_member_id` is already a nullable FK to family_members, so
-- there is no schema change here — only two rows.
--
-- They WILL leak into the recipe-source dropdown if nothing stops them, because both
-- the kids page and the recipe form select every family_members row: "Guest" would
-- appear as a possible author of a recipe. A `kind` column would be the tidy answer
-- and is overkill for two rows, so the app filters them out of the source list by id
-- and keeps them in the chef list. The comment below is where that decision lives.

insert into family_members (name, display_name, role)
select 'אורח', 'אורח', 'member'
where not exists (select 1 from family_members where name = 'אורח');

insert into family_members (name, display_name, role)
select 'בייביסיטר', 'בייביסיטר', 'member'
where not exists (select 1 from family_members where name = 'בייביסיטר');

comment on column family_members.user_id is
  'The Supabase auth user, or null for a credit-only person. Null means "can be named as a cook, can never sign in" — Savta, Saba, אורח, בייביסיטר. is_family() matches on this column, so a null here is also what keeps those rows from granting access.';

insert into schema_migrations (version, name) values (18, 'kids_guest_chefs')
on conflict (version) do nothing;
