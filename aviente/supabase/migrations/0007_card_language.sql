-- The default language for a NEW menu card's dish descriptions, per person.
--
-- Scope, deliberately narrow: the app's own chrome is English only. This setting
-- does not translate the interface — it decides whether a card you build starts in
-- Hebrew or English, which is the one language choice the app actually has. Course
-- names on the card stay French either way; that is the card's typography, not a
-- language setting.
--
-- 'he' is the default because the corpus is Hebrew and that is what the family
-- reads at the table.
alter table family_members
  add column if not exists card_language text not null default 'he'
    check (card_language in ('en','he'));

comment on column family_members.card_language is
  'Default descriptions language for new menu cards. Does NOT translate the UI.';
