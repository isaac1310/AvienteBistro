-- Aviente — recipe photo storage.
--
-- The bucket is PRIVATE. Photos are reached through short-lived signed URLs, so a
-- leaked share link cannot expose family photographs, and neither can guessing a
-- filename. §9.3 asserts an unauthenticated read is refused.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', false,
        5 * 1024 * 1024,                       -- 5 MB ceiling; the client downscales
                                               -- to ~1600px WebP long before this,
                                               -- so hitting it means the resize failed
        array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;

-- Family members may do anything with photos; nobody else may do anything at all.
create policy "family reads photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'recipe-photos' and is_family());

create policy "family uploads photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-photos' and is_family());

create policy "family replaces photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'recipe-photos' and is_family());

-- Needed so replacing a photo can delete the old object rather than orphaning it.
create policy "family deletes photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-photos' and is_family());
