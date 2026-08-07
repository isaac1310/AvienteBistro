-- Ingredient sub-groups.
--
-- Found by reading מתכונים.md before importing it: recipes there split their
-- ingredients into named parts —
--
--   | **לקציצות** |  |  |     for the patties
--   | דג ים טחון   | 500 גר׳ |
--   | **לרוטב**    |  |  |     for the sauce
--   | פלפלים אדומים | 2 |
--
-- Without this column, קציצות דגים ברוטב אדום imports as one undifferentiated
-- list of 23 items and you cannot tell which half goes in the pan first. The
-- group is part of the recipe, not presentation.
--
-- Nullable, because most recipes have no groups at all and should not gain an
-- empty heading.

alter table ingredients add column group_label text;

comment on column ingredients.group_label is
  'Optional sub-heading, e.g. "לרוטב". Consecutive rows sharing a label render '
  'under one heading; NULL rows render directly under the ingredients title.';
