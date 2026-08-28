-- When the cookbook was last backed up.
--
-- The backup panel says, honestly and a little alarmingly, that the free Supabase
-- tier takes no automated backups and that these recipes exist nowhere else — and
-- then offers three buttons and no state. So the one question it provokes ("am I
-- covered?") is the one question it cannot answer, and the honest warning turns into
-- background noise you learn to scroll past.
--
-- On the singleton family_settings row rather than a new table: there is exactly one
-- cookbook, and this is a property of it. Nullable because the truthful answer for an
-- existing project is "nobody knows" — defaulting it to now() would invent a backup
-- that never happened, which is the one lie this column exists to prevent.
alter table family_settings
  add column if not exists last_backup_at timestamptz;

comment on column family_settings.last_backup_at is
  'Set by GET /api/backup. Null means no backup has been taken since this shipped.';

insert into schema_migrations (version, name) values (20, 'backup_stamp')
on conflict (version) do nothing;
