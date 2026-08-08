-- Store WHERE the photo is, not a signed link to it.
--
-- photo_url held a Supabase signed URL with a one-year expiry, minted at upload. That
-- works until it doesn't: a year after a photo is attached the link 404s and the
-- recipe silently loses its picture, with nothing in the app able to tell that from a
-- deleted file. The first three photos were attached today, so the clock has started.
--
-- The bucket is private and must stay private, so a URL is always going to be
-- temporary. The fix is to keep the durable thing — the object's path — and sign it
-- for minutes at read time.
alter table recipes add column if not exists photo_path text;

comment on column recipes.photo_path is
  'Object path inside the private recipe-photos bucket. Signed at read time; never store a signed URL here.';

-- Backfill from the URLs already stored. A signed URL looks like
--   https://<ref>.supabase.co/storage/v1/object/sign/recipe-photos/<path>?token=...
-- so the path is what sits between the bucket name and the query string.
update recipes
   set photo_path = split_part(
         substring(photo_url from '/recipe-photos/(.*)$'),
         '?', 1)
 where photo_url is not null
   and photo_path is null
   and photo_url like '%/recipe-photos/%';

-- photo_url is deliberately NOT dropped. It is the only copy of where those objects
-- live if the substring above got anything wrong, and a column costs nothing. Reads
-- prefer photo_path and fall back to it.

insert into schema_migrations (version, name) values (11, 'photo_paths')
on conflict (version) do nothing;
