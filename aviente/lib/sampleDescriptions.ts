/* Sample menu-card descriptions for the 13 seeded recipes.
 *
 * These lived in a .sql file until pasting them broke: Hebrew interleaved with
 * SQL string quotes gets reordered by the editor's bidirectional handling, and a
 * line arrived truncated mid-word. Text this shape should never travel through a
 * clipboard into a SQL console.
 *
 * Here they are data in the app, applied by a server action over the same client
 * everything else uses — so RLS applies, no service-role key is involved, and the
 * Hebrew is never re-parsed by anything.
 *
 * They describe what each dish IS rather than how good it is. A menu card is not
 * an advertisement.
 */
export const SAMPLE_DESCRIPTIONS: { title: string; he: string; en: string }[] = [
  {
    title: "חלוז צ'רקסי עם גבינה",
    he: 'כיסוני בצק דקים במילוי גבינה צ׳רקסית, מטוגנים עד הזהבה',
    en: 'Thin pastry crescents filled with Circassian cheese, fried golden',
  },
  {
    title: 'לחם ללא לישה',
    he: 'לחם כפרי בקרום פריך, תפיחה ארוכה בלילה',
    en: 'A crusty country loaf, risen slowly overnight',
  },
  {
    title: 'לחמניות באו מאודות',
    he: 'לחמניות רכות ואווריריות, מאודות ולא אפויות',
    en: 'Soft, cloud-light buns — steamed rather than baked',
  },
  {
    title: 'עוגת שיש קלאסית',
    he: 'עוגה בחושה בשני צבעים, וניל ושוקולד',
    en: 'The two-tone loaf cake, vanilla marbled through chocolate',
  },
  {
    title: 'אושפלאו בוכרי מסורתי',
    he: 'אורז, בשר וגזר בסיר אחד, כמו שעושים בבוכרה',
    en: 'Rice, meat and carrot in one pot, the Bukharan way',
  },
  {
    title: 'מרק תפוחי אדמה גרמני',
    he: 'מרק סמיך של תפוחי אדמה וכרישה, על בסיס חמאה',
    en: 'A thick potato and leek soup, built on butter',
  },
  {
    title: 'גזלמה תרד וגבינות',
    he: 'עלה בצק דק במילוי תרד וגבינות, על הפלנצ׳ה',
    en: 'Thin flatbread folded over spinach and cheese, off the griddle',
  },
  {
    title: 'עוגת תפוחים צרפתית עשירה',
    he: 'יותר תפוחים מבצק, אפויה עד שהיא כמעט נמסה',
    en: 'More apple than batter, baked until it almost melts',
  },
  {
    title: 'קרם פלאן קלאסי',
    he: 'קרם ביצים אפוי באמבט מים, עם קרמל נוזלי',
    en: 'Baked custard in a water bath, under its own caramel',
  },
  {
    title: 'זלצבורגר נוקרל',
    he: 'סופלה ביצים אוורירי שיש להגיש מיד',
    en: 'An airy egg soufflé that waits for nobody',
  },
  {
    title: 'חלה לשבת קלועה',
    he: 'חלה קלועה ומוברשת בביצה, לשולחן של ליל שבת',
    en: 'Braided and egg-glazed, for the Friday night table',
  },
  {
    title: 'מלבי שמנת אסלי',
    he: 'קינוח חלב קר ורך, בניחוח מי ורדים',
    en: 'A cool, trembling milk pudding scented with rosewater',
  },
  {
    title: "תמצית ג'ינג'ר מרוכזת (להקפאה)",
    he: 'תמצית ג׳ינג׳ר מצומצמת, קופאת לקוביות לחליטה',
    en: 'Reduced ginger essence, frozen into cubes for tea',
  },
];
