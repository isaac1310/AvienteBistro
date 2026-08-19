-- When a recipe joined the book.
--
-- Only updated_at existed, so the recipe page could say "last edited" but never "in
-- the book since" — and for a family cookbook the second is the more interesting
-- fact: it is the difference between a recipe someone added last week and one that
-- has been there since the beginning.
alter table recipes add column if not exists created_at timestamptz;

-- Backfill, and it is an APPROXIMATION for every row that predates the column: the
-- earliest evidence a recipe existed is either its first revision snapshot or, for a
-- recipe never edited, its updated_at. Neither is the true creation moment. Written
-- down rather than presented as fact, because a confident wrong date on a family
-- heirloom is worse than an approximate one.
update recipes r
   set created_at = least(
         r.updated_at,
         coalesce((select min(rev.created_at) from recipe_revisions rev
                    where rev.recipe_id = r.id), r.updated_at))
 where r.created_at is null;

-- New rows get it automatically from here on, and it is genuinely accurate for them.
alter table recipes alter column created_at set default now();
alter table recipes alter column created_at set not null;

comment on column recipes.created_at is
  'When the recipe joined the book. Rows predating migration 0013 are approximated from the earliest revision or updated_at.';

insert into schema_migrations (version, name) values (13, 'recipe_created_at')
on conflict (version) do nothing;
