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
  'nav.kids':        { he: 'ילדים',      en: 'Kids' },
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
  /* No arrows in translation strings. They were '← לספר' and '← The Book' — one
     glyph serving two reading directions, and a Hebrew reader was told to go BACK by
     an arrow pointing forwards. The glyph is now the Arrow component's job. */
  'book.back':         { he: 'לספר',        en: 'The Book' },
  'book.empty':        { he: 'אין כאן כלום עדיין', en: 'Nothing here yet' },
  'book.noRecipes':    { he: 'אין מתכונים', en: 'no recipes yet' },
  'book.count.one':    { he: 'מתכון אחד',   en: '1 recipe' },
  'book.count.many':   { he: '{n} מתכונים', en: '{n} recipes' },
  'book.select':       { he: '✓ בחירה לתפריט', en: '✓ Select for a menu' },
  'book.emptyBody':    { he: 'אין עדיין {category} בספר. אפשר להוסיף את הראשון, או להדביק מתכון מצילום במסך הייבוא.',
                          en: 'No {category} in the book yet. Add the first one, or paste a recipe from a photo on the import screen.' },
  'book.selected':     { he: '{n} נבחרו',   en: '{n} selected' },
  'book.buildMenu':    { he: 'בניית תפריט', en: 'Build menu' },
  'book.here':         { he: '{n} כאן · אפשר להמשיך בקטגוריה אחרת',
                         en: '{n} here · keep going in another category' },
  'book.cancel':       { he: 'ביטול',       en: 'Cancel' },
  'book.add':          { he: '＋ הוספת מתכון', en: '＋ Add a recipe' },
  /* The card meta in select mode — "Savta's · serves 6". Two entries rather than one
     sentence, because either half can be missing. */
  'book.whose':        { he: 'של {name}',    en: '{name}’s' },
  'book.serves':       { he: '{n} מנות',     en: 'serves {n}' },

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
  /* Cook mode. Ticking an ingredient off is what keeps your place in a list of
     fourteen while your hands are busy. */
  'recipe.used':          { he: 'סימון ש{name} נוסף', en: 'Mark {name} as used' },
  'recipe.usedCol':       { he: 'נוסף',      en: 'Used' },
  'recipe.clearUsed':     { he: 'ניקוי הסימונים ({n})', en: 'Clear {n} ticked' },
  /* Cooking mode replaced the separate keep-awake button and the always-on ticks:
     one screen, held awake, ticks on, guarded exit. */
  'recipe.cookMode':      { he: 'מצב בישול',     en: 'Cooking mode' },
  'recipe.cooking':       { he: 'מבשלים',        en: 'Cooking' },
  'recipe.exitCook':      { he: 'יציאה',          en: 'Exit' },
  'recipe.exitCookConfirm': { he: 'לצאת ממצב בישול? הסימונים יימחקו.',
                              en: 'Leave cooking mode? Your ticks will be cleared.' },

  // ── earlier versions ────────────────────────────────────────────────────
  // The whole sheet used to be hardcoded English, including the confirm — an
  // English question on a Hebrew-first screen, about the one action that
  // overwrites a recipe.
  'history.hint':          { he: 'גרסה נשמרת בכל פעם שמישהו שומר. שחזור שומר גם את הגרסה הנוכחית, כך שאף פעם לא הולך משהו לאיבוד מלהסתכל.',
                              en: 'A version is kept every time anyone saves. Restoring keeps the current one too, so nothing is ever lost by looking.' },
  'history.beforeLastSave': { he: 'לפני השמירה האחרונה', en: 'before the last save' },
  'history.savedOverBy':   { he: 'נדרס על ידי {name}', en: 'saved over by {name}' },
  'history.empty':         { he: 'אין עוד גרסאות — זה נשמר רק פעם אחת.',
                              en: 'No earlier versions yet — this has only been saved once.' },
  'history.putBackRecipe': { he: 'להחזיר את המתכון לגרסה הזאת? הגרסה הנוכחית נשמרת גם.',
                              en: 'Put this recipe back to this version? The current one is kept too.' },
  'history.putBackMenu':   { he: 'להחזיר את התפריט לגרסה הזאת? הגרסה הנוכחית נשמרת גם.',
                              en: 'Put this menu back to this version? The current one is kept too.' },
  'history.putBack':       { he: 'להחזיר',   en: 'Put it back' },
  'history.loadFailed':    { he: 'לא ניתן לטעון גרסאות קודמות.', en: 'Could not load earlier versions.' },
  'history.restoreFailed': { he: 'לא ניתן לשחזר.', en: 'Could not restore.' },

  // Relative times. Singular and plural are separate entries, not an English
  // `n === 1 ? 'hour' : 'hours'` — Hebrew does not inflect the same way.
  'time.justNow':  { he: 'ממש עכשיו',    en: 'just now' },
  'time.minsAgo':  { he: 'לפני {n} דק׳', en: '{n} min ago' },
  'time.hourAgo':  { he: 'לפני שעה',     en: '1 hour ago' },
  'time.hoursAgo': { he: 'לפני {n} שעות', en: '{n} hours ago' },
  'time.dayAgo':   { he: 'לפני יום',     en: '1 day ago' },
  'time.daysAgo':  { he: 'לפני {n} ימים', en: '{n} days ago' },
  'time.monthAgo': { he: 'לפני חודש',    en: '1 month ago' },
  'time.monthsAgo': { he: 'לפני {n} חודשים', en: '{n} months ago' },

  // ── the recipe form ─────────────────────────────────────────────────────
  'form.editing':      { he: 'עריכה',        en: 'Editing' },
  /* A new recipe is not being EDITED. Coming from "write it myself", the sticky bar
     announced you were editing something that did not exist yet. */
  'form.newRecipe':    { he: 'מתכון חדש',    en: 'New recipe' },
  'form.unsaved':      { he: 'לא נשמר',      en: 'unsaved' },
  'form.save':         { he: 'שמירה',        en: 'Save' },
  'form.saving':       { he: 'שומר…',        en: 'Saving…' },
  'form.cancel':       { he: 'ביטול',        en: 'Cancel' },
  'form.name':         { he: 'שם',           en: 'Name' },
  'form.nameLatin':    { he: 'שם באותיות לטיניות', en: 'Name in Latin letters' },
  /* An EXAMPLE, marked as one. It used to be the bare word "Khaluz", which reads as
     a value somebody already typed rather than as a hint. */
  'form.nameLatinHint': { he: 'לדוגמה: Khaluz', en: 'e.g. Khaluz' },
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
  'form.deleteRecipe':       { he: 'מחיקת המתכון', en: 'Delete this recipe' },
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
  'form.takePhoto':          { he: 'צילום',    en: 'Take photo' },
  'form.fromGallery':        { he: 'מהגלריה',  en: 'From gallery' },
  'form.removePhoto':        { he: 'הסרה',    en: 'Remove' },
  'form.movePhoto':          { he: '↗ העברת התמונה למתכון אחר', en: '↗ Move this photo to another recipe' },
  'form.uploading':          { he: 'מעלה…',     en: 'Uploading…' },
  'form.photoSaved':         { he: 'התמונה הועלתה — לשמור את המתכון כדי לצרף אותה',
                                en: 'Photo uploaded — save the recipe to attach it' },
  'form.discard':            { he: 'לבטל את השינויים?', en: 'Discard your changes?' },
  'form.waitForPhoto':       { he: 'רגע, התמונה עולה…', en: 'Waiting for the photo…' },
  'form.meal':               { he: 'ארוחה',   en: 'Meal' },
  'form.breakfast':          { he: 'בוקר',    en: 'Breakfast' },
  'form.lunch':              { he: 'צהריים',  en: 'Lunch' },
  'form.dinner':             { he: 'ערב',     en: 'Dinner' },
  'form.cardDescription':    { he: 'תיאור לכרטיס התפריט', en: 'Menu card description' },
  'form.toServe':            { he: 'להגשה — שורה לכל הצעה', en: 'To serve — one per line' },
  'form.story':              { he: 'הערות ומקור', en: 'Notes and story' },
  'form.stepBody':           { he: 'מה עושים', en: 'what to do' },
  /* The two things a save refuses over. They were thrown as English Error messages
     and shown verbatim, so the only sentence in the form that stops you was the one
     sentence not in the reader's language. */
  'form.needsName':          { he: 'למתכון צריך שם.', en: 'A recipe needs a name.' },
  'form.needsServings':      { he: 'צריך לכתוב כמה מנות, או מה יוצא מזה (למשל «ליטר אחד»).',
                               en: 'Give either a number of servings or what it makes (e.g. “1 litre”).' },
  /* The generic fallbacks. They were the last two hardcoded English sentences the
     form could show, and they show exactly when someone is already frustrated. */
  'form.cantSave':           { he: 'השמירה לא עברה.', en: 'Could not save.' },
  'form.cantDelete':         { he: 'המחיקה לא עברה.', en: 'Could not delete.' },
  /* After refiling a recipe: the banner on the saved recipe, in its new category. */
  'recipe.movedTo':          { he: 'הועבר אל {category}', en: 'Moved to {category}' },
  'recipe.backToPrevious':   { he: 'חזרה לקטגוריה הקודמת', en: 'Back to the previous category' },

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
  /* The loader. 'STILL BAKING' is the artboard's line; the Hebrew is the same idea
     said the way it would be said out loud, not a gloss of the English. */
  'loading':           { he: 'טוען',           en: 'Loading' },
  'loading.baking':    { he: 'באפייה עוד רגע..', en: 'STILL BAKING' },
  /* The PDF export. The route boots headless Chromium, so the wait is real and the
     failure modes are worth naming rather than saying "that did not work". */
  /* Icon-only buttons, so the label is the only thing a screen reader has — it names
     the recipe, because "delete" on a list of forty is not an action anyone can
     confirm blind. */
  /* The delete toast was English on a Hebrew screen, which mattered more once
     deleting became one tap from every card rather than a trip into the edit form. */
  'import.editTitle':  { he: 'שם המתכון',      en: 'Recipe name' },
  'import.goToRecipe': { he: 'למתכון',       en: 'Go to the recipe' },
  /* Ten seconds, said out loud. The confirm promised the recipe "can be restored
     afterwards", which is true of the DATABASE and not of anything on screen: the
     undo toast lasts ten seconds and after that there is no restore UI at all. A
     promise the app cannot keep is worse than a blunt warning. A trash list would
     make the original sentence true; until then, this. */
  /* Print-sheet chrome. The Print button was hardcoded English on a Hebrew-first
     app, and only the kids sheet had a way out at all — the recipe and menu sheets
     were dead ends in the installed PWA, which has no browser Back. */
  /* /print is public — it must be, or a guest tapping "save as PDF" on a shared menu
     hits a login screen. Recipes are still refused by RLS, so an anonymous visitor
     gets nothing; they just got nothing SILENTLY, sitting on a loader forever, where
     the menu sheet has always said so plainly. */
  'print.notAvailable': { he: 'המתכון הזה לא זמין.', en: 'This recipe is not available.' },
  'print.menuNotAvailable': { he: 'התפריט הזה לא זמין.', en: 'Menu not available.' },
  'print.print':        { he: 'הדפסה',          en: 'Print' },
  'print.backToRecipe': { he: 'חזרה למתכון',    en: 'Back to the recipe' },
  'print.backToMenu':   { he: 'חזרה לתפריט',    en: 'Back to the menu' },
  /* The trash exists now, so the original promise — "can be restored afterwards" —
     finally became true and the blunt ten-second warning could be retired. */
  'form.deleteConfirm': {
    he: 'למחוק את «{title}»? אפשר לשחזר אחר כך מסל המחזור.',
    en: 'Delete “{title}”? It can be restored later from the trash.',
  },
  'undo.deleted':      { he: 'נמחק.',           en: 'Deleted.' },
  'undo.undo':         { he: 'ביטול',           en: 'Undo' },
  'card.edit':         { he: 'עריכת {title}',   en: 'Edit {title}' },
  'card.delete':       { he: 'מחיקת {title}',   en: 'Delete {title}' },
  /* The kids planner, once a slot holds several dishes. */
  /* Busy and finished states, in the dictionary at last. Three of these were
     hardcoded English on a Hebrew-first app — visible only to whoever happened to be
     importing at the time, which is why they survived four releases. */
  /* The menu actions were English throughout on a Hebrew-first app, and every one of
     them went `disabled` with no other sign it was working. */
  /* The prompt assumed a photograph. A recipe that arrives as text — pasted from a
     chat, a message, a website — needed no photograph at all, and the instructions
     told you to take one. */
  'import.howto':      { he: 'להדביק את המתכון כטקסט, או לצלם אותו ולצרף את התמונה — ואז להדביק את ההוראות שמתחת.',
                          en: 'Paste the recipe as text, or photograph it and attach the picture — then paste the instructions below.' },
  'book.categories':   { he: 'קטגוריות',        en: 'Categories' },
  'history.earlier':   { he: '⟲ גרסאות קודמות',  en: '⟲ Earlier versions' },
  'history.loading':   { he: 'טוענים גרסאות…',   en: 'Loading versions…' },
  /* MovePhoto: the trigger loads a list over the network with no sign it is doing so. */
  'photo.moveThis':    { he: '↗ העברת התמונה למתכון אחר', en: '↗ Move this photo to another recipe' },
  'photo.loading':     { he: 'טוענים מתכונים…',   en: 'Loading recipes…' },
  'photo.moving':      { he: 'מעבירים…',          en: 'Moving…' },
  'photo.whichRecipe': { he: 'של איזה מתכון התמונה הזאת?', en: 'Which recipe is this a photo of?' },
  'photo.onlyEmpty':   { he: 'מוצגים רק מתכונים בלי תמונה — תמונה שייכת למנה אחת, כך שדבר לא נדרס.',
                          en: 'Only recipes without a photo are listed — a photograph belongs to one dish, so nothing is overwritten.' },
  'photo.allHave':     { he: 'לכל שאר המתכונים יש כבר תמונה.',
                          en: 'Every other recipe already has a photo.' },
  'photo.loadFailed':  { he: 'לא הצלחנו לטעון את המתכונים.', en: 'Could not load recipes.' },
  'photo.moveFailed':  { he: 'לא הצלחנו להעביר את התמונה.', en: 'Could not move the photo.' },
  'menu.kept':         { he: '★ נשמר',          en: '★ Kept' },
  'menu.keepThis':     { he: '☆ לשמור את זה',    en: '☆ Keep this one' },
  'menu.duplicate':    { he: 'שכפול',            en: 'Duplicate' },
  'menu.actionFailed': { he: 'זה לא עבד.',        en: 'That did not work.' },
  /* One rule for destructive actions. These three were a bare ✕ or a single tap with
     no guard at all, while deleting a person got a written panel and a recipe card
     got an undo toast — three treatments for the same kind of act. */
  'menu.removeDishConfirm': { he: 'להסיר את «{dish}» מהתפריט?', en: 'Remove “{dish}” from the menu?' },
  'menu.unshareConfirm':    { he: 'להפסיק לשתף? כל קישור שנשלח עד עכשיו יפסיק לעבוד — גם למי שכבר קיבל אותו.',
                               en: 'Stop sharing? Every link handed out so far stops working — including for people who already have it.' },
  'menu.unshareYes':        { he: 'כן, להפסיק',    en: 'Yes, stop sharing' },
  'menu.working':      { he: 'רגע…',             en: 'Working…' },
  'menu.copied':       { he: 'הועתק',            en: 'Copied' },
  'menu.copy':         { he: 'העתקה',            en: 'Copy' },
  'menu.shareNote':    { he: 'כל מי שיש לו את הקישור יראה את התפריט הזה — ולא שום דבר אחר בספר.',
                          en: 'Anyone with this link can see this menu — nothing else in the cookbook.' },
  'menu.copyDate':     { he: 'להעתיק את התפריט לאיזה תאריך?',
                          en: 'Copy this menu onto which date?' },
  'import.importing':  { he: 'מייבאים…',        en: 'Importing…' },
  'import.imported':   { he: 'יובאו',           en: 'Imported' },
  'import.importN':    { he: 'ייבוא {n} מתכונים', en: 'Import {n} recipes' },
  'import.importOne':  { he: 'ייבוא מתכון אחד',  en: 'Import one recipe' },
  'import.more':       { he: 'ייבוא נוסף',       en: 'Import more' },
  'import.undoing':    { he: 'מבטלים…',          en: 'Undoing…' },
  'import.undoNew':    { he: 'ביטול — יוסרו {n} החדשים', en: 'Undo — removes the {n} new ones' },
  'import.undoAll':    { he: 'ביטול הייבוא',     en: 'Undo this import' },
  'import.undoAdded':  { he: 'ביטול {n} שנוספו', en: 'Undo the {n} added' },
  'restore.restoring': { he: 'משחזרים…',         en: 'Restoring…' },
  'restore.restored':  { he: 'שוחזר',            en: 'Restored' },
  'restore.overwrite': { he: 'שחזור — דריסה של עד {n} מתכונים',
                          en: 'Restore — overwrite up to {n} recipes' },
  'fill.filling':      { he: 'ממלאים…',          en: 'Filling…' },
  'fill.filled':       { he: 'מולא',             en: 'Filled' },
  'fill.action':       { he: 'מילוי תיאורים חסרים לתפריט',
                          en: 'Fill in missing menu descriptions' },
  'kids.working':      { he: 'רגע…',            en: 'Working…' },
  'kids.chefName':     { he: 'שף {name}',       en: 'Chef {name}' },
  'kids.addAnother':   { he: '＋ עוד משהו',     en: '＋ Something else' },
  'kids.removeDish':   { he: 'הסרת המנה',       en: 'Remove this dish' },
  'kids.moveDish':     { he: 'העבר ל…',          en: 'Move to…' },
  'kids.clearSlot':    { he: 'לרוקן את הארוחה',  en: 'Empty this meal' },
  'kids.orSomething':  { he: 'או משהו פשוט',     en: 'Or something simple' },
  'kids.freeTextHint': { he: 'לחם עם גבינה לבנה…', en: 'Bread with white cheese…' },
  'kids.addFreeText':  { he: 'הוספה',            en: 'Add it' },
  'kids.hereNow':      { he: 'כאן עכשיו',       en: 'here now' },
  'kids.moveWhere':    { he: 'להעביר את «{dish}» לאן?', en: 'Move “{dish}” where?' },
  'settings.downloadPhotos': { he: 'גיבוי התמונות', en: 'Download the photographs' },
  'sort.label':        { he: 'סדר',            en: 'Sort' },
  'sort.title':        { he: 'לפי שם',          en: 'By name' },
  'sort.updated':      { he: 'עודכנו לאחרונה',  en: 'Recently updated' },
  'sort.created':      { he: 'נוספו לאחרונה',   en: 'Recently added' },
  'pdf.working':       { he: 'מכינים PDF…',    en: 'Building the PDF…' },
  'pdf.failed':        { he: 'ה־PDF לא נוצר',  en: 'The PDF could not be made' },
  'pdf.timeout':       { he: 'לקח יותר מדי זמן. אפשר להשתמש בכפתור ההדפסה, שלא צריך שרת.',
                          en: 'It took too long. The Print button needs no server.' },
  /* Arranging the courses of one menu. The names on the CARD stay French; these are
     builder labels, where English/Hebrew is what the rest of the app speaks. */
  'menu.addCourse':    { he: 'הוספת מהלך',     en: 'Add a course' },
  'menu.courseUp':     { he: 'הזזת המהלך למעלה', en: 'Move this course up' },
  'menu.courseDown':   { he: 'הזזת המהלך למטה',  en: 'Move this course down' },
  'menu.courseOff':    { he: 'הסרת המהלך',     en: 'Turn this course off' },
  'menu.courseKept':   { he: 'מודפס בסוף',      en: 'printed at the end' },
  /* Two forms, because Hebrew counts: "יש 1 מנות" is wrong in a way that reads as
     machine-written, and this string appears at the moment someone is deciding
     whether to trust the app with their card. */
  'menu.courseHasDishes.one': {
    he: 'במהלך הזה יש מנה אחת. היא תמשיך להופיע בכרטיס, בסוף. להסיר את המהלך?',
    en: 'This course holds one dish. It will still print, at the end. Turn it off?',
  },
  'menu.courseHasDishes': {
    he: 'במהלך הזה יש {n} מנות. הן ימשיכו להופיע בכרטיס, בסוף. להסיר את המהלך?',
    en: 'This course holds {n} dishes. They will still print, at the end. Turn it off?',
  },
  'menu.dishNote':     { he: 'תיאור למנה על הכרטיס (לא חובה)',
                          en: 'How this dish reads on the card (optional)' },
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
  'kids.fillWeek':     { he: 'מילוי השבוע', en: 'Fill the week' },
  'kids.prevWeek':     { he: 'שבוע קודם',    en: 'Previous week' },
  'kids.nextWeek':     { he: 'שבוע הבא',     en: 'Next week' },
  'kids.addSomething': { he: '＋ להוסיף משהו', en: '＋ add something' },
  'kids.whoCooks':     { he: 'מי מבשל',      en: 'Who is cooking' },
  'kids.swapMeal':     { he: 'החלפת הארוחה', en: 'Swap this meal' },
  'kids.clearMeal':    { he: 'ניקוי הארוחה', en: 'Clear this meal' },
  'kids.removeFromTray': { he: 'הסרה מהמגש', en: 'Remove from tray' },
  'kids.done':         { he: 'סיום',         en: 'Done' },
  'kids.pickFor':      { he: 'בחירת מנה ל{meal}', en: 'Pick something for {meal}' },
  'kids.clearWeek':    { he: 'ניקוי השבוע', en: 'Clear week' },
  /* The blank option in the chef select. It read as an emoji plus "who?" — not a
     sentence in either language, and the emoji rendered differently per platform. */
  'kids.whoPlaceholder': { he: 'מי מבשל?', en: 'Who is cooking?' },
  'kids.clearWeekConfirm': { he: 'לנקות כל הארוחות בשבוע הזה?',
                             en: 'Clear every meal this week?' },
  /* The fallback when a mutation throws something that is not an Error. Named rather
     than a bare "something went wrong": the planner had NO error surface at all, so
     any wording here is an improvement, but a vague one wastes the fix. */
  /* SHORT visible labels beside the glyphs. The aria-labels were already correct, so
     assistive tech was fine — but a sighted reader had to guess the difference between
     "move to another day" and "swap this meal" from two similar arrows. */
  'kids.moveShort':  { he: 'העברה',  en: 'Move' },
  'kids.swapShort':  { he: 'החלפה',  en: 'Swap' },
  'kids.removeShort': { he: 'הסרה',  en: 'Remove' },
  'kids.removeDishConfirm': { he: 'להסיר את «{dish}»?', en: 'Remove “{dish}”?' },
  'kids.actionFailed': { he: 'הפעולה לא הושלמה. אפשר לנסות שוב.',
                          en: 'That did not go through. Try again.' },
  'kids.print':        { he: 'הדפסה למקרר',  en: 'Print for the fridge' },
  'kids.takeOut':      { he: 'להוציא את {day} מהשבוע? {n} ארוחות ינוקו.',
                          en: 'Take {day} out of the week? Its {n} meals will be cleared.' },
  /* One key, two places: the slot picker and the tray sheet say the same thing, and
     they were two copies of the same English sentence. */
  'kids.noneYet':      { he: 'אין עדיין מתכונים לילדים. אפשר להוסיף אחד ולסמן לו את הקטגוריה «שולחן הילדים».',
                          en: 'No kids’ recipes yet. Add one and set its category to Kids’ Table.' },

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
  'settings.backupBody':   { he: 'השכבה החינמית של Supabase לא מגבה אוטומטית, והמתכונים האלה לא קיימים בשום מקום אחר. הקובץ שלמטה מכיל כל מתכון — מרכיבים, חלקים, שלבים, הערות וייחוס — והייבוא קורא אותו בחזרה. תפריטים ושבועות הילדים אינם נכללים; אותם יהיה צריך לבנות מחדש.',
                              en: 'The free Supabase tier takes no automated backups, and these recipes exist nowhere else. The file below holds every recipe — ingredients, groups, steps, notes and attribution — and the importer reads it back. Menus and the kids’ weeks are not included; those would have to be rebuilt.' },
  'settings.download':     { he: '⤓ הורדת גיבוי', en: '⤓ Download a backup' },
  /* The panel warned that nothing is backed up automatically and then showed no
     state at all, so the question it raised was the one it could not answer. */
  'settings.lastBackup':   { he: 'הגיבוי האחרון: {date}', en: 'Last backup: {date}' },
  'settings.lastBackupNever': { he: 'עוד לא נלקח גיבוי מהאפליקציה.',
                                en: 'No backup has been taken from the app yet.' },
  'settings.lastBackupStale': { he: 'הגיבוי האחרון: {date} — עברו {days} ימים.',
                                en: 'Last backup: {date} — {days} days ago.' },
  'settings.restore':      { he: '⤒ שחזור מגיבוי', en: '⤒ Restore from a backup' },
  /* Each control writes at once and rolls the screen back when the write fails, so
     the failure has to say that it rolled back — otherwise the colour flicking
     backwards looks like a second bug. */
  'settings.colourFailed':   { he: 'לא הצלחנו לשמור את הצבע. הוא חזר למה שהיה.',
                                en: 'Could not save the colour. It is back to what it was.' },
  'settings.languageFailed': { he: 'לא הצלחנו לשמור את השפה. היא חזרה למה שהיתה.',
                                en: 'Could not save the language. It is back to what it was.' },
  'settings.nameFailed':     { he: 'לא הצלחנו לשמור את השם.', en: 'Could not save that name.' },
  'settings.blueprints':   { he: 'שרטוטי הצלחות', en: 'The no-photo plate blueprints' },
  'settings.people':       { he: 'ניהול בני המשפחה', en: 'Manage the family' },
  'settings.peopleBody':   { he: 'מי נמצא בספר: הוספת בני משפחה, כתובות אימייל לכניסה, ואנשים שמופיעים רק בקרדיט. מי שנוסף עם אימייל נכנס בעצמו — קישור קסם ראשון וזהו.',
                              en: 'Who is in the book: add family members, the emails allowed to sign in, and credit-only people. Anyone added with an email lets themselves in — first magic link and they are done.' },

  // ── people (admin) ─────────────────────────────────────────────────────
  'people.eyebrow':    { he: 'בני המשפחה', en: 'People' },
  'people.title':      { he: 'מי בספר',    en: 'Who is in the book' },
  'people.notYours':   { he: 'זה תפקיד של המנהל', en: 'This is the admin’s job' },
  'people.notYoursBody': { he: 'הוספה והסרה של בני משפחה משנה מי יכול להיכנס לספר כולו, ולכן היא של המנהל בלבד.',
                            en: 'Adding and removing people changes who can open the whole book, so it belongs to the admin alone.' },
  'people.name':       { he: 'שם',          en: 'Name' },
  'people.alias':      { he: 'כינוי',       en: 'Alias' },
  'people.aliasHint':  { he: 'לדוגמה: סבתא ממי', en: 'e.g. Savta Mami' },
  'people.email':      { he: 'אימייל לכניסה', en: 'Sign-in email' },
  'people.emailHint':  { he: 'ריק = קרדיט בלבד, בלי כניסה', en: 'Empty = credit only, no login' },
  'people.role':       { he: 'תפקיד',       en: 'Role' },
  'people.member':     { he: 'בן משפחה',    en: 'Member' },
  'people.admin':      { he: 'מנהל',        en: 'Admin' },
  /* These described the DATA MODEL, not what a person can do. "Credit only" reads
     as an accounting term; it means "appears as a recipe's author but cannot log in". */
  'people.signedUp':   { he: 'יכול/ה להיכנס', en: 'Can sign in' },
  'people.invited':    { he: 'הוזמן/ה — טרם נכנס/ה', en: 'Invited — not signed in yet' },
  'people.creditOnly': { he: 'שם בלבד, בלי כניסה', en: 'Name only, no login' },
  'people.save':       { he: 'שמירה',       en: 'Save' },
  'people.revoke':     { he: 'ביטול גישה',  en: 'Remove access' },
  'people.addOffer':   { he: '＋ הוספת אדם', en: '＋ Add a person' },
  'people.addTitle':   { he: 'אדם חדש',     en: 'A new person' },
  'people.addBody':    { he: 'עם אימייל — שולחים להם את כתובת האפליקציה, הם מקלידים את האימייל ונכנסים לבד. בלי אימייל — שם לקרדיט בלבד, כמו סבתא.',
                          en: 'With an email — send them the app’s address, they type the email and let themselves in. Without one — a name for credit only, like Savta.' },
  'people.add':        { he: 'הוספה',       en: 'Add' },
  'people.cancel':     { he: 'ביטול',       en: 'Cancel' },
  'people.delete':     { he: 'מחיקה',       en: 'Delete' },
  'people.deleteConfirm': { he: 'למחוק את {name} לגמרי? אם יש מתכונים על שמם — המחיקה תסורב.',
                             en: 'Delete {name} entirely? If any recipes carry their name, the delete will be refused.' },
  /* Offered INSIDE the panel. The old copy pointed at "Remove access" as the gentler
     alternative, and that control was not visible from where the advice was given. */
  'people.orRevoke':   { he: 'או רק לבטל את הגישה ולהשאיר את השם',
                          en: 'Or just take away their login and keep the name' },

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
  'search.prompt':    { he: 'להקליד משהו כדי לחפש', en: 'type something to search' },
  'search.results.one':  { he: 'תוצאה אחת',  en: '1 result' },
  'search.results.many': { he: '{n} תוצאות', en: '{n} results' },
  'search.noMatchBody': { he: 'החיפוש עובר על שמות מנות ועל מרכיבים, בעברית או באנגלית — לא על ההוראות עצמן. כדאי לנסות מרכיב אחד, כמו תבלין או קמח.',
                           en: 'Search covers dish names and ingredients, in Hebrew or English — not the written steps. Try a single ingredient, like תבלין or flour.' },
  'import.eyebrow':   { he: 'ייבוא',   en: 'Import' },
  'import.copyPrompt': { he: 'העתקת ההנחיה', en: 'Copy the prompt' },
  'import.copied':     { he: '✓ הועתק',      en: '✓ Copied' },
  'import.chooseFile': { he: 'בחירת קובץ JSON', en: 'Choose a .json file' },
  'import.done':      { he: 'יובאו',   en: 'Imported' },
  'import.onDuplicate': { he: 'אם המתכון כבר בספר', en: 'If a recipe is already in the book' },
  /* The three steps of the paste screen, and the choice inside step three. Each
     duplicate option carries its own consequence, because "Replace it" alone does
     not say that the previous version is kept. */
  'import.step1':     { he: '1 · לתת את זה ל־ChatGPT או ל־Claude', en: '1 · Give this to ChatGPT or Claude' },
  'import.step2':     { he: '2 · להדביק את התשובה, או לפתוח קובץ', en: '2 · Paste the answer, or open a file' },
  'import.step3':     { he: '3 · לבדוק, ואז לייבא', en: '3 · Check, then import' },
  'import.dupeSkip':        { he: 'לדלג', en: 'Skip it' },
  'import.dupeSkipWhy':     { he: 'להשאיר את מה שיש בספר כמו שהוא', en: 'leave what is there untouched' },
  'import.dupeReplace':     { he: 'להחליף', en: 'Replace it' },
  'import.dupeReplaceWhy':  { he: 'לדרוס — הגרסה הקודמת נשמרת תחת ⟲',
                               en: 'overwrite it — the old version is kept under ⟲' },
  'import.dupeAdd':         { he: 'להוסיף בכל זאת', en: 'Add anyway' },
  'import.dupeAddWhy':      { he: 'יהיו שניים בספר', en: 'end up with two of them' },
  'import.whose':     { he: 'של מי המתכונים האלה?', en: 'Whose recipes are these?' },
  'restore.eyebrow':  { he: 'שחזור',   en: 'Restore' },
  'restore.chooseFile': { he: 'בחירת קובץ גיבוי', en: 'Choose a backup file' },
  'restore.title':    { he: 'שחזור הספר מגיבוי', en: 'Restore the cookbook from a backup' },
  'restore.notYours': { he: 'הדלת הזאת של המנהל', en: 'This door is the admin’s' },
  'restore.notYoursBody': { he: 'שחזור מגיבוי מחליף את כל הספר בבת אחת. להוספה או לתיקון של מתכון אין בזה צורך — כל זה נמצא תחת «הוספת מתכון».',
                             en: 'Restoring a backup replaces the whole cookbook at once. Adding or fixing a recipe doesn’t need it — that all lives under “Add a recipe”.' },
  'restore.intro':    { he: 'הפעולה הזאת מחליפה את הספר בתוכן של קובץ גיבוי — כל מתכון בקובץ דורס את זה שנושא את אותו שם. זו הדלת לחזרה מאסון, לא להוספת מתכונים; להוספה יש «הוספת מתכון».',
                         en: 'This replaces the cookbook with the contents of a backup file — every recipe in the file overwrites its namesake in the book. It is the door for coming back from a disaster, not for adding recipes; that lives under “Add a recipe”.' },
  'restore.notBackup': { he: 'הקובץ הזה הוא לא גיבוי שהאפליקציה כתבה — הוא לא נקרא בכלל.',
                          en: 'That file is not a backup this app wrote — it does not parse.' },
  'restore.failed':   { he: 'השחזור לא עבר.', en: 'The restore failed.' },
  'restore.done':     { he: 'שוחזר.',  en: 'Restored.' },
  'restore.tally':    { he: '{replaced} נדרסו · {added} נוספו',
                         en: '{replaced} replaced · {added} added' },
  'restore.tallyFailed': { he: '{n} נכשלו', en: '{n} failed' },
  'restore.keptVersions': { he: 'לכל מתכון שנדרס נשמרה הגרסה הקודמת — ⟲ במתכון מחזיר אותה, אחד־אחד.',
                             en: 'Every replaced recipe kept its previous version — ⟲ on the recipe brings it back one at a time.' },
  'restore.exportedBy': { he: 'הגיבוי נעשה על ידי {name}', en: 'Exported by {name}' },
  'restore.exporterUnknown': { he: 'לא ידוע מי עשה את הגיבוי', en: 'Exporter unknown' },
  'menu.editDishes':  { he: 'עריכת המנות', en: 'Edit dishes' },
  'menu.shareLink':   { he: 'קישור לשיתוף', en: 'Share link' },
  'menu.stopSharing': { he: 'להפסיק לשתף',  en: 'Stop sharing' },
  'history.title':    { he: '⟲ גרסאות קודמות', en: '⟲ Earlier versions' },
  'photo.move':       { he: 'העברת תמונה', en: 'Move photo' },
  'brand.eyebrow':    { he: 'שרטוטים', en: 'Blueprints' },
  'settings.prefs':   { he: 'העדפות',  en: 'Preferences' },

  // ── login ───────────────────────────────────────────────────────────────
  // The whole screen was hardcoded English — the first screen a Hebrew reader
  // meets, and the one place a stuck person has no other screen to compare with.
  'login.email':      { he: 'האימייל שלך', en: 'Your email' },
  'login.checkEmail': { he: 'לבדוק את האימייל.', en: 'Check your email.' },
  'login.tapLink':    { he: 'ללחוץ על הקישור שבו — וזהו.', en: 'Tap the link in it and you are in.' },
  'login.sameBrowser': { he: 'לפתוח את הקישור כאן, באותו דפדפן — קישור נכנס רק בדפדפן שביקש אותו.',
                          en: 'Open it here, in this same browser — a link only signs in the browser that asked for it.' },
  'login.differentEmail': { he: 'להשתמש באימייל אחר', en: 'Use a different email' },
  'login.sending':    { he: 'שולח…', en: 'Sending…' },
  'login.sendLink':   { he: 'לשלוח לי קישור', en: 'Send me a link' },
  'login.hint':       { he: 'בלי סיסמה לזכור — נשלח לך קישור באימייל.',
                         en: 'No password to remember — we email you a link.' },
  'login.notOnList':  { he: 'האימייל הזה לא ברשימת המשפחה. קיימים רק שני חשבונות — כדאי לבדוק אם יש טעות הקלדה.',
                         en: 'That email is not on the family list. Only two accounts exist — check for a typo.' },
  'login.expired':    { he: 'הקישור פג, או שנפתח בדפדפן אחר. לבקש חדש ולפתוח אותו כאן.',
                         en: 'That link has expired, or it was opened in a different browser. Ask for a new one and open it here.' },
  'login.rateLimit':  { he: 'יותר מדי ניסיונות. לחכות דקה ולנסות שוב.',
                         en: 'Too many attempts just now. Wait a minute and try again.' },

  // ── list metadata that was hardcoded ────────────────────────────────────
  'menus.shared':     { he: 'משותף', en: 'shared' },
  'import.status.added':    { he: 'נוספו', en: 'added' },
  'import.status.replaced': { he: 'הוחלפו', en: 'replaced' },
  'import.status.skipped':  { he: 'דולגו', en: 'skipped' },
  'import.status.failed':   { he: 'נכשלו', en: 'failed' },
  'import.nIngredients':    { he: '{n} מרכיבים', en: '{n} ingredients' },
  'import.nSteps':          { he: '{n} שלבים', en: '{n} steps' },
  // ── the trash ───────────────────────────────────────────────────────────
  // Deletion was recoverable in the DATABASE from day one (soft delete), but the
  // only door was a ten-second toast. This is the durable door.
  'trash.title':     { he: 'סל המחזור', en: 'Trash' },
  'trash.link':      { he: 'מתכונים שנמחקו', en: 'Deleted recipes' },
  'trash.empty':     { he: 'אין מתכונים מחוקים. כל מה שנמחק אי פעם שוחזר.',
                        en: 'No deleted recipes. Everything ever deleted has been restored.' },
  'trash.hint':      { he: 'מתכון שנמחק נשאר כאן — שום דבר לא נעלם באמת. שחזור מחזיר אותו לקטגוריה שלו.',
                        en: 'A deleted recipe stays here — nothing is ever really gone. Restore puts it back in its category.' },
  'trash.restore':   { he: 'שחזור', en: 'Restore' },
  'trash.restoring': { he: 'משחזרים…', en: 'Restoring…' },
  'trash.deletedOn': { he: 'נמחק {date}', en: 'deleted {date}' },
  'trash.failed':    { he: 'השחזור לא עבר.', en: 'Could not restore.' },

  /* Clipboard can be denied (permissions) or missing (old WebView, http). The
     fallback is honest: the text is selected, finish the copy by hand. */
  'clipboard.failed':       { he: 'ההעתקה נחסמה — הטקסט מסומן, אפשר להעתיק ידנית.',
                               en: 'Copy was blocked — the text is selected, copy it by hand.' },
  'guest.gone':       { he: 'התפריט הזה אינו זמין', en: 'This menu is not available' },
  'guest.goneBody':   { he: 'אפשר שהשיתוף בוטל, ואפשר שהקישור חלקי — צריך את הכתובת כולה, כולל החלק שאחרי סימן השאלה.',
                         en: 'The link may have been withdrawn, or it may be incomplete — the address needs the whole thing, including the part after the question mark.' },
  'guest.savePdf':    { he: 'שמירה כ־PDF', en: 'Save as PDF' },
  'brand.title':      { he: 'הצלחות ללא תמונה', en: 'The no-photo plates' },
  'common.backToPlanner': { he: 'חזרה לתכנון', en: 'Back to the planner' },
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
  'menus.noneBody':   { he: 'אפשר לבנות אחד לשישי הקרוב והוא יישמר — תפריטים מסומנים בכוכב נשארים כאן כדי להעתיק אותם לתאריך אחר.',
                         en: 'Build one for this Friday and it will keep — starred menus stay here so you can copy them onto a new date later.' },
  'add.eyebrow':      { he: 'הוספה',   en: 'Add' },
  'add.title':        { he: 'מתכון חדש', en: 'A new recipe' },
  'add.typeIt':       { he: 'לכתוב בעצמי', en: 'Type it out' },
  'add.paste':        { he: 'להדביק מ־AI', en: 'Paste from an AI' },
  'add.typeItBody':   { he: 'טופס ריק — שם, מרכיבים, שלבים. הדרך הטובה כשהמתכון כתוב לפניך או שאתה יודע אותו בעל פה.',
                         en: 'A blank form — name, ingredients, steps. Best when you are looking at a written recipe or know it by heart.' },
  'add.pasteBody':    { he: 'לצלם את המתכון ב־ChatGPT או Claude, לבקש JSON ולהדביק כאן. מזהה כמויות בעברית, טווחים והערות.',
                         en: 'Photograph the recipe in ChatGPT or Claude, ask for JSON, paste the answer here. Handles Hebrew amounts, ranges and notes.' },
  'common.close':     { he: 'סגירה',  en: 'Close' },
  'common.cancel':    { he: 'ביטול',  en: 'Cancel' },
  /* Shared by every in-page confirm panel that DESTROYS something, so the answer
     button never reads the same as the question's own verb. */
  'common.confirmDelete': { he: 'כן, למחוק', en: 'Yes, delete' },
  'common.confirmRemove': { he: 'כן, להסיר', en: 'Yes, remove' },
  'common.discard':   { he: 'כן, לצאת',  en: 'Yes, discard' },
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
