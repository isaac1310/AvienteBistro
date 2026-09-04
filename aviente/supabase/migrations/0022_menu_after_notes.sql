-- "How did it go?" — a note written AFTER the meal.
--
-- chef_notes is the note written before: it prints on the card under "Notes du
-- Chef" and travels with the guest link. This column is the other kind of note —
-- "the kids wanted more sauce", "eight was too many for this table" — and it must
-- never reach the card, the print route, the shared RPC (fetch_shared_menu), or a
-- duplicate of the menu: it is about one evening, not about the menu as a design.
alter table menus
  add column if not exists after_notes text;

comment on column menus.after_notes is
  'Written after the meal was served. Never printed, never shared, not copied by duplicate.';

insert into schema_migrations (version, name) values (22, 'menu_after_notes')
on conflict (version) do nothing;
