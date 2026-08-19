-- The setting drives the whole interface, not just menu-card descriptions.
--
-- `card_language` was deliberately narrow: it chose the language of the dish
-- descriptions on a printed menu card, and Settings said so — "the app itself is in
-- English". That was the wrong shape for this family. The app is read in Hebrew, by
-- people who cook in Hebrew, so Hebrew is the default and the setting now decides
-- the language of everything except the menu card and the wordmark.
--
-- Renamed rather than added: two columns both called "language" with different
-- scopes is how a setting ends up applying in one place and not another.
alter table family_members rename column card_language to language;

alter table family_members alter column language set default 'he';

comment on column family_members.language is
  'UI language for this person: he (default) or en. The menu card keeps French course titles and its own per-menu language; the AVIENTE wordmark stays Latin in both.';

insert into schema_migrations (version, name) values (14, 'ui_language')
on conflict (version) do nothing;
