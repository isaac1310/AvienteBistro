-- Sample menu-card descriptions for the 13 seeded recipes.
--
-- These are the italic line under each dish name on the printed card. Written
-- from each recipe's own ingredients and method — short, concrete, and about what
-- the dish IS rather than how good it is. A menu card is not an advertisement.
--
-- Hebrew is the primary language (the corpus is Hebrew); English is supplied so
-- an EN card is not falling back on every line. Overwrite freely — they are a
-- starting point, not a decision.
--
-- Safe to re-run: matched on title, and only fills rows that are still empty.

update recipes set
  description_he = coalesce(description_he, v.he),
  description_en = coalesce(description_en, v.en)
from (values
  ('חלוז צ''רקסי עם גבינה',
   'כיסוני בצק דקים במילוי גבינה צ''רקסית, מטוגנים עד הזהבה',
   'Thin pastry crescents filled with Circassian cheese, fried golden'),

  ('לחם ללא לישה',
   'לחם כפרי בקרום פריך, תפיחה ארוכה בלילה',
   'A crusty country loaf, risen slowly overnight'),

  ('לחמניות באו מאודות',
   'לחמניות רכות ואווריריות, מאודות ולא אפויות',
   'Soft, cloud-light buns — steamed rather than baked'),

  ('עוגת שיש קלאסית',
   'עוגה בחושה בשני צבעים, וניל ושוקולד',
   'The two-tone loaf cake, vanilla marbled through chocolate'),

  ('אושפלאו בוכרי מסורתי',
   'אורז, בשר וגזר בסיר אחד, כמו שעושים בבוכרה',
   'Rice, meat and carrot in one pot, the Bukharan way'),

  ('מרק תפוחי אדמה גרמני',
   'מרק סמיך של תפוחי אדמה וכרישה, על בסיס חמאה',
   'A thick potato and leek soup, built on butter'),

  ('גזלמה תרד וגבינות',
   'עלה בצק דק במילוי תרד וגבינות, על הפלנצ''ה',
   'Thin flatbread folded over spinach and cheese, off the griddle'),

  ('עוגת תפוחים צרפתית עשירה',
   'יותר תפוחים מבצק, אפויה עד שהיא כמעט נמסה',
   'More apple than batter, baked until it almost melts'),

  ('קרם פלאן קלאסי',
   'קרם ביצים אפוי באמבט מים, עם קרמל נוזלי',
   'Baked custard in a water bath, under its own caramel'),

  ('זלצבורגר נוקרל',
   'סופלה ביצים אוורירי שיש להגיש מיד',
   'An airy egg soufflé that waits for nobody'),

  ('חלה לשבת קלועה',
   'חלה קלועה ומוברשת בביצה, לשולחן של ליל שבת',
   'Braided and egg-glazed, for the Friday night table'),

  ('מלבי שמנת אסלי',
   'קינוח חלב קר ורך, בניחוח מי ורדים',
   'A cool, trembling milk pudding scented with rosewater'),

  ('תמצית ג''ינג''ר מרוכזת (להקפאה)',
   'תמצית ג''ינג''ר מצומצמת, קופאת לקוביות לחליטה',
   'Reduced ginger essence, frozen into cubes for tea')
) as v(title, he, en)
where recipes.title = v.title
  and recipes.deleted_at is null;

-- Check: every recipe should now carry both.
select count(*) filter (where description_he is not null) as with_hebrew,
       count(*) filter (where description_en is not null) as with_english,
       count(*)                                           as total
from recipes where deleted_at is null;
