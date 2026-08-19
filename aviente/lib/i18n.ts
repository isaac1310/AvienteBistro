import type { ReactNode } from 'react';

/**
 * Two dictionaries and a lookup. No library.
 *
 * `next-intl` and friends bring routed locales, middleware and message compilation —
 * machinery for a site with many languages and many pages. This is a two-language app
 * for two people, and a plain object is legible in a diff: when a key is missing from
 * one language, TypeScript says so at build time, which is the only guarantee that
 * actually matters here.
 *
 * Hebrew is FIRST in every entry because Hebrew is the default. That ordering is not
 * cosmetic — it is a reminder while editing that `he` is the string most people will
 * read, not the translation of the English one.
 *
 * What is deliberately NOT in here:
 *  - **The menu card.** It keeps French course titles with Hebrew dish text, by
 *    decision. It is a printed object that has already been shared; changing its
 *    language would change cards people were sent.
 *  - **The wordmark.** AVIENTE / The Family Recipes Cookbook / EST. 2018 stays Latin
 *    in both languages, the way a logo does.
 *  - **Recipe content.** Titles, ingredients, steps and notes are the family's own
 *    words in their own language; translating them is not this app's business.
 */

export type Lang = 'he' | 'en';

export const DEFAULT_LANG: Lang = 'he';

/** Every string the interface says, keyed by meaning rather than by English text. */
const DICT = {
  // ── navigation and shell ────────────────────────────────────────────────
  'nav.home':        { he: 'בית',        en: 'Home' },
  'nav.recipes':     { he: 'מתכונים',    en: 'Recipes' },
  'nav.menus':       { he: 'תפריטים',    en: 'Menus' },
  'nav.add':         { he: 'הוספה',      en: 'Add' },
  'nav.main':        { he: 'ניווט ראשי', en: 'Main' },

  // ── the homepage ────────────────────────────────────────────────────────
  'home.greeting':          { he: 'שלום, {name}',  en: 'Hello, {name}' },
  'home.count.one':         { he: 'מתכון אחד בספר', en: '1 recipe in the book' },
  'home.count.many':        { he: '{n} מתכונים בספר', en: '{n} recipes in the book' },
  'home.search':            { he: 'חיפוש מתכון או מרכיב…', en: 'Search a dish or an ingredient…' },
  'home.search.label':      { he: 'חיפוש מתכונים', en: 'Search recipes' },
  'home.kids':              { he: 'שולחן הילדים',  en: 'Kids’ table' },
  'home.kids.hint':         { he: 'תכנון השבוע',   en: 'Plan the week' },
  'home.menu':              { he: 'יצירת תפריט',   en: 'Create a menu' },
  'home.menu.hint':         { he: 'לארוחה או לחג', en: 'For a meal or a holiday' },
  'home.add':               { he: 'הוספת מתכון',   en: 'Add a recipe' },
  'home.add.hint':          { he: 'לכתוב או להדביק', en: 'Write one in, or paste it' },
  'home.settings':          { he: 'הגדרות',        en: 'Settings' },
  'home.settings.hint':     { he: 'צבע, שפה, גיבוי', en: 'Colour, language, backup' },

  // ── the book ────────────────────────────────────────────────────────────
  'book.eyebrow':      { he: 'הספר',        en: 'The Book' },
  'book.title':        { he: 'מתכונים',     en: 'Recipes' },
  'book.back':         { he: '← לספר',      en: '← The Book' },
  'book.empty':        { he: 'אין כאן כלום עדיין', en: 'Nothing here yet' },
  'book.noRecipes':    { he: 'אין מתכונים', en: 'no recipes yet' },
  'book.count.one':    { he: 'מתכון אחד',   en: '1 recipe' },
  'book.count.many':   { he: '{n} מתכונים', en: '{n} recipes' },
  'book.select':       { he: '✓ בחירה לתפריט', en: '✓ Select for a menu' },
  'book.selected':     { he: '{n} נבחרו',   en: '{n} selected' },
  'book.buildMenu':    { he: 'בניית תפריט →', en: 'Build menu →' },
  'book.here':         { he: '{n} כאן · אפשר להמשיך בקטגוריה אחרת',
                         en: '{n} here · keep going in another category' },
  'book.cancel':       { he: 'ביטול',       en: 'Cancel' },

  // ── a recipe ────────────────────────────────────────────────────────────
  'recipe.ingredients':   { he: 'מרכיבים',   en: 'Ingredients' },
  'recipe.amount':        { he: 'כמות',      en: 'Amount' },
  'recipe.ingredient':    { he: 'מרכיב',     en: 'Ingredient' },
  'recipe.method':        { he: 'אופן ההכנה', en: 'Method' },
  'recipe.notes':         { he: 'הערות',     en: 'Notes' },
  'recipe.serve':         { he: 'להגשה',     en: 'To Serve' },
  'recipe.addToMenu':     { he: 'הוספה לתפריט', en: 'Add to menu' },
  'recipe.exportPdf':     { he: 'ייצוא PDF', en: 'Export PDF' },
  'recipe.attribution':   { he: 'המתכון של {name}', en: '{name}’s recipe' },
  'recipe.since':         { he: 'במשפחה מאז {date}', en: 'in the family since {date}' },
  'recipe.editedBy':      { he: 'עודכן על ידי {name} · {ago}', en: 'last edited by {name} · {ago}' },
  'recipe.edited':        { he: 'עודכן {ago}', en: 'last edited {ago}' },
  'recipe.lastUpdate':    { he: 'עדכון אחרון {date}', en: 'last update {date}' },
  'recipe.edit':          { he: 'עריכה',     en: 'Edit' },
  'recipe.servings':      { he: '{n} מנות',  en: '{n} SERVINGS' },
  'recipe.serving':       { he: 'מנה אחת',   en: '1 SERVING' },
  'recipe.prep':          { he: 'הכנה {n} דק׳', en: 'PREP {n} min' },
  'recipe.cook':          { he: 'בישול {n} דק׳', en: 'COOK {n} min' },
  'recipe.for':           { he: 'לכמה',      en: 'pour' },
  'recipe.scaleLabel':    { he: 'התאמת כמויות למספר אנשים', en: 'Scale for how many people' },
  'recipe.scaled':        { he: 'הכמויות הותאמו ל־{n}. ההוראות עצמן עדיין מצטטות את המקור.',
                            en: 'Amounts scaled for {n}. The written steps still quote the original.' },
  'recipe.history':       { he: '⟲ גרסאות קודמות', en: '⟲ Earlier versions' },

  // ── the recipe form ─────────────────────────────────────────────────────
  'form.editing':      { he: 'עריכה',        en: 'Editing' },
  'form.unsaved':      { he: 'לא נשמר',      en: 'unsaved' },
  'form.save':         { he: 'שמירה',        en: 'Save' },
  'form.saving':       { he: 'שומר…',        en: 'Saving…' },
  'form.cancel':       { he: 'ביטול',        en: 'Cancel' },
  'form.name':         { he: 'שם',           en: 'Name' },
  'form.nameLatin':    { he: 'שם באותיות לטיניות', en: 'Name in Latin letters' },
  'form.category':     { he: 'קטגוריה',      en: 'Category' },
  'form.serves':       { he: 'מספר מנות',    en: 'Serves' },
  'form.orMakes':      { he: '…או מניב',     en: '…or makes' },
  'form.prep':         { he: 'הכנה (דק׳)',   en: 'Prep (min)' },
  'form.cook':         { he: 'בישול (דק׳)',  en: 'Cook (min)' },
  'form.whose':        { he: 'המתכון של מי', en: 'Whose recipe' },
  'form.ingredients':  { he: 'מרכיבים',      en: 'Ingredients' },
  'form.ingredient':   { he: 'מרכיב',        en: 'ingredient' },
  'form.amt':          { he: 'כמות',         en: 'amt' },
  'form.max':          { he: '–עד',          en: '–max' },
  'form.note':         { he: 'הערה (לא חובה)', en: 'note (optional)' },
  'form.steps':        { he: 'שלבים',        en: 'Steps' },
  'form.step':         { he: 'שלב',          en: 'step' },
  'form.stepHead':     { he: 'כותרת (לא חובה)', en: 'heading (optional)' },
  'form.addIngredient':      { he: '＋ הוספת מרכיב', en: '＋ Add ingredient' },
  'form.addIngredientTo':    { he: '＋ הוספת מרכיב ל{part}', en: '＋ Add ingredient to {part}' },
  'form.addStep':            { he: '＋ הוספת שלב', en: '＋ Add step' },
  'form.part':               { he: 'חלק',     en: 'Part' },
  'form.partName':           { he: 'שם החלק במתכון', en: 'Name of this part of the recipe' },
  'form.partPlaceholder':    { he: 'לדוגמה: לרוטב', en: 'e.g. לרוטב' },
  'form.nameThisPart':       { he: '＋ מתן שם לקבוצה', en: '＋ Give this group a name' },
  'form.removeHeading':      { he: '✕ כותרת', en: '✕ heading' },
  'form.removeHeadingLabel': { he: 'הסרת כותרת החלק', en: 'Remove this part heading' },
  'form.addPart':            { he: '＋ הוספת חלק (רוטב, מילוי…)', en: '＋ Add another part (sauce, filling…)' },
  'form.moveUp':             { he: 'העלאה',   en: 'Move up' },
  'form.moveDown':           { he: 'הורדה',   en: 'Move down' },
  'form.removeIngredient':   { he: 'הסרת מרכיב', en: 'Remove ingredient' },
  'form.removeStep':         { he: 'הסרת שלב', en: 'Remove step' },
  'form.takePhoto':          { he: '📷 צילום', en: '📷 Take photo' },
  'form.fromGallery':        { he: '🖼 מהגלריה', en: '🖼 From gallery' },
  'form.removePhoto':        { he: 'הסרה',    en: 'Remove' },
  'form.movePhoto':          { he: '↗ העברת התמונה למתכון אחר', en: '↗ Move this photo to another recipe' },
  'form.uploading':          { he: '📷 מעלה…', en: '📷 Uploading…' },
  'form.discard':            { he: 'לבטל את השינויים?', en: 'Discard your changes?' },
  'form.meal':               { he: 'ארוחה',   en: 'Meal' },
  'form.breakfast':          { he: 'בוקר',    en: 'Breakfast' },
  'form.lunch':              { he: 'צהריים',  en: 'Lunch' },
  'form.dinner':             { he: 'ערב',     en: 'Dinner' },
  'form.cardDescription':    { he: 'תיאור לכרטיס התפריט', en: 'Menu card description' },
  'form.toServe':            { he: 'להגשה — שורה לכל הצעה', en: 'To serve — one per line' },
  'form.story':              { he: 'הערות ומקור', en: 'Notes and story' },

  // ── the menu builder ────────────────────────────────────────────────────
  // The CARD itself stays French/Hebrew by decision; these are the controls around it.
  'menu.build':        { he: 'בניית תפריט',  en: 'Build a menu' },
  'menu.edit':         { he: 'עריכת תפריט',  en: 'Edit menu' },
  'menu.save':         { he: 'שמירת תפריט',  en: 'Save menu' },
  'menu.saving':       { he: 'שומר…',        en: 'Saving…' },
  'menu.onTheCard':    { he: 'על הכרטיס',    en: 'On the card' },
  'menu.date':         { he: 'תאריך',        en: 'Date' },
  'menu.eaten':        { he: 'נאכל',         en: 'Eaten' },
  'menu.daytime':      { he: 'ביום',         en: 'Daytime' },
  'menu.evening':      { he: 'בערב',         en: 'Evening' },
  'menu.timeOfDay':    { he: 'שעת הארוחה',   en: 'Time of day' },
  'menu.title':        { he: 'כותרת',        en: 'Title' },
  'menu.untitled':     { he: 'ללא כותרת',    en: 'Untitled' },
  'menu.cardLang':     { he: 'תיאורים על הכרטיס', en: 'Card descriptions in' },
  'menu.chefNotes':    { he: 'הערות השף',    en: 'Chef’s notes' },
  'menu.addDish':      { he: '＋ הוספת מנה', en: '＋ Add a dish' },
  'menu.chooseDish':   { he: 'בחירת מנה',    en: 'Choose a dish' },
  'menu.changeDish':   { he: 'החלפת המנה',   en: 'Change this dish' },
  'menu.removeDish':   { he: 'הסרת המנה',    en: 'Remove dish' },
  'menu.dishes.one':   { he: 'מנה אחת',      en: '1 dish' },
  'menu.dishes.many':  { he: '{n} מנות',     en: '{n} dishes' },
  'menu.needsDish':    { he: 'תפריט צריך מנה אחת לפחות.', en: 'A menu needs at least one dish.' },
  'menu.leave':        { he: 'לצאת בלי לשמור? המנות שבחרת יאבדו.',
                          en: 'Leave without saving? The dishes you picked will be lost.' },
  'menu.cantSave':     { he: 'לא ניתן לשמור.', en: 'Could not save.' },
  /* The three states of an untitled card. Each says WHY it is untitled, because a
     blank title on a Friday looks like a bug unless the screen explains itself. */
  'menu.willUse':      { he: 'ללא כותרת — הכרטיס ישתמש ב״{title}״, לפי התאריך',
                          en: 'Untitled — the card will use “{title}”, from the date' },
  'menu.noneAtLunch':  { he: 'ללא כותרת — אין מועד בצהריים. בערב זה היה ״{title}״.',
                          en: 'Untitled — no occasion at lunch. This evening it would be “{title}”.' },
  'menu.nameIt':       { he: 'ללא כותרת — אפשר לתת שם למעלה',
                          en: 'Untitled — give it a name above' },
  'menu.addTo':        { he: 'הוספה ל{course}', en: 'Add to {course}' },

  // ── the kids' table ─────────────────────────────────────────────────────
  'kids.title':        { he: 'שולחן הילדים', en: 'The Kids’ Table' },
  'kids.pickDishes':   { he: '＋ בחירת מנות', en: '＋ Pick dishes' },
  'kids.pickForWeek':  { he: 'בחירת מנות לשבוע', en: 'Pick dishes for the week' },
  'kids.fillWeek':     { he: '✨ מילוי השבוע', en: '✨ Fill the week' },
  'kids.prevWeek':     { he: 'שבוע קודם',    en: 'Previous week' },
  'kids.nextWeek':     { he: 'שבוע הבא',     en: 'Next week' },
  'kids.addSomething': { he: '＋ להוסיף משהו', en: '＋ add something' },
  'kids.whoCooks':     { he: 'מי מבשל',      en: 'Who is cooking' },
  'kids.swapMeal':     { he: 'החלפת הארוחה', en: 'Swap this meal' },
  'kids.clearMeal':    { he: 'ניקוי הארוחה', en: 'Clear this meal' },
  'kids.removeFromTray': { he: 'הסרה מהמגש', en: 'Remove from tray' },
  'kids.done':         { he: 'סיום',         en: 'Done' },
  'kids.pickFor':      { he: 'בחירת מנה ל{meal}', en: 'Pick something for {meal}' },
  'kids.print':        { he: 'הדפסה למקרר',  en: 'Print for the fridge' },
  'kids.takeOut':      { he: 'להוציא את {day} מהשבוע? {n} ארוחות ינוקו.',
                          en: 'Take {day} out of the week? Its {n} meals will be cleared.' },

  // ── settings ────────────────────────────────────────────────────────────
  'settings.eyebrow':      { he: 'הגדרות',     en: 'Settings' },
  'settings.title':        { he: 'איך האפליקציה מתנהגת', en: 'How the app behaves' },
  'settings.displayName':  { he: 'איך לקרוא לך', en: 'What the app calls you' },
  'settings.displayHint':  { he: 'מופיע בברכה בדף הבית', en: 'Used in the greeting on the homepage.' },
  'settings.colour':       { he: 'צבע',         en: 'Colour' },
  'settings.colourHint':   { he: 'שלך בלבד — לא משנה למורן', en: 'Yours only — it does not change Moran’s.' },
  'settings.green':        { he: 'ירוק',        en: 'Green' },
  'settings.burgundy':     { he: 'בורדו',       en: 'Burgundy' },
  'settings.language':     { he: 'שפת האפליקציה', en: 'App language' },
  'settings.languageHint': { he: 'שלך בלבד. כרטיס התפריט שומר על שמות המנות בצרפתית.',
                              en: 'Yours only. The menu card keeps its French course names.' },
  'settings.backup':       { he: 'גיבוי',       en: 'Backup' },
  'settings.download':     { he: '⤓ הורדת גיבוי', en: '⤓ Download a backup' },
  'settings.restore':      { he: '⤒ שחזור מגיבוי', en: '⤒ Restore from a backup' },
  'settings.blueprints':   { he: 'שרטוטי הצלחות', en: 'The no-photo plate blueprints' },

  // ── the schema banner ───────────────────────────────────────────────────
  // Written for the person who CANNOT fix it: Moran has no Supabase access, so the
  // headline must tell her nothing is lost rather than name a file.
  'schema.needsUpdate': { he: 'האפליקציה זקוקה לעדכון בסיס נתונים.',
                           en: 'The app needs a database update.' },
  'schema.reassure':    { he: 'שום דבר לא אבד ואפשר להמשיך לעיין — לאיציק יש את ההוראות.',
                           en: 'Nothing is lost and browsing still works — Itzik has the steps.' },
  'schema.partial':     { he: 'חלק מהדפים לא יעבדו עד שהעדכון ירוץ — שום דבר לא אבד, ולאיציק יש את ההוראות.',
                           en: 'Some pages may not work until it runs — nothing is lost, and Itzik has the steps.' },

  // ── shared ──────────────────────────────────────────────────────────────
  'common.back':      { he: 'חזרה',   en: 'Back' },
  'common.browse':    { he: 'לעיין בספר במקום', en: 'Browse instead' },
  'search.title':     { he: 'חיפוש',   en: 'Search' },
  'import.eyebrow':   { he: 'ייבוא',   en: 'Import' },
  'import.done':      { he: 'יובאו',   en: 'Imported' },
  'import.onDuplicate': { he: 'אם המתכון כבר בספר', en: 'If a recipe is already in the book' },
  'restore.eyebrow':  { he: 'שחזור',   en: 'Restore' },
  'restore.title':    { he: 'שחזור הספר מגיבוי', en: 'Restore the cookbook from a backup' },
  'restore.notYours': { he: 'הדלת הזאת של המנהל', en: 'This door is the admin’s' },
  'menu.editDishes':  { he: 'עריכת המנות', en: 'Edit dishes' },
  'history.title':    { he: '⟲ גרסאות קודמות', en: '⟲ Earlier versions' },
  'photo.move':       { he: 'העברת תמונה', en: 'Move photo' },
  'brand.eyebrow':    { he: 'שרטוטים', en: 'Blueprints' },
  'settings.prefs':   { he: 'העדפות',  en: 'Preferences' },
  'login.email':      { he: 'האימייל שלך', en: 'Your email' },
  'guest.gone':       { he: 'התפריט הזה אינו זמין', en: 'This menu is not available' },
  'guest.savePdf':    { he: 'שמירה כ־PDF', en: 'Save as PDF' },
  'brand.title':      { he: 'הצלחות ללא תמונה', en: 'The no-photo plates' },
  'common.backToPlanner': { he: '← חזרה לתכנון', en: '← Back to the planner' },
  'common.print':     { he: 'הדפסה',  en: 'Print' },
  'menus.title':      { he: 'תפריטים', en: 'Menus' },
  'menus.history':    { he: 'היסטוריית תפריטים', en: 'Menu history' },
  'menus.new':        { he: '＋ תפריט חדש', en: '＋ New menu' },
  'menus.comingUp':   { he: 'בקרוב',   en: 'Coming up' },
  'menus.kept':       { he: '★ שמורים', en: '★ Kept' },
  'menus.all':        { he: 'כל התפריטים', en: 'All menus' },
  'menus.worth':      { he: 'שווה לתכנן', en: 'Worth planning' },
  'menus.planAhead':  { he: 'תכנון מראש', en: 'plan ahead' },
  'menus.showAll':    { he: 'להציג את כל התפריטים', en: 'show all menus' },
  'menus.showKept':   { he: 'להציג רק את השמורים', en: 'show only the ones we kept' },
  'menus.none':       { he: 'אין תפריטים עדיין', en: 'No menus yet' },
  'add.eyebrow':      { he: 'הוספה',   en: 'Add' },
  'add.title':        { he: 'מתכון חדש', en: 'A new recipe' },
  'add.typeIt':       { he: 'לכתוב בעצמי', en: 'Type it out' },
  'add.paste':        { he: 'להדביק מ־AI', en: 'Paste from an AI' },
  'common.close':     { he: 'סגירה',  en: 'Close' },
  'common.search':    { he: 'חיפוש…', en: 'Search…' },
  'common.loading':   { he: 'טוען',   en: 'Loading' },
  'common.noMatch':   { he: 'אין התאמה', en: 'Nothing matches that.' },
} as const;

export type Key = keyof typeof DICT;

/**
 * Look up a string, substituting `{name}`-style placeholders.
 *
 * Falls back to English when a Hebrew entry is somehow empty — never to the key
 * itself, because a raw `recipe.ingredients` on screen is worse than the wrong
 * language.
 */
export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  const entry = DICT[key];
  const raw = (lang === 'he' ? entry.he : entry.en) || entry.en;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`);
}

/** A bound `t` for one language, so components read `t('recipe.method')`. */
export function dictionary(lang: Lang) {
  return (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

export type T = ReturnType<typeof dictionary>;

/**
 * A category's name in the reader's language.
 *
 * CATEGORIES has carried `en` and `he` since the beginning and only `en` was ever
 * read, so a Hebrew interface said "SOUPS" over מרק סלק. The data was already there;
 * nothing but the lookup was missing.
 */
export function categoryName(cat: { en: string; he: string }, lang: Lang): string {
  return lang === 'he' ? cat.he : cat.en;
}

/** Plural helper: Hebrew and English both need "1 recipe" vs "N recipes". */
export function count(t: T, n: number, one: Key, many: Key): ReactNode {
  return n === 1 ? t(one) : t(many, { n });
}
