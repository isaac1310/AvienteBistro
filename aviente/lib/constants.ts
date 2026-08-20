/* Pure values and types — no server imports, so client components can use these
 * without dragging `next/headers` into the browser bundle. That is exactly what
 * happened when CATEGORIES lived in queries.ts: the edit form imported it and the
 * whole server client came along, failing the build.
 *
 * Rule of thumb: if a client component needs it, it belongs here. */

/* The APP is in English (recipe content is Hebrew). French appears in exactly one
   place — the course names on the printed menu card — because that is a
   convention of the artifact, not of the software. Category names are app chrome
   and so are English. */
/* No `emoji` field. It shipped as DATA long after the blueprint plates replaced it on
   every screen — nine emoji travelling through the app that nothing rendered. Removed
   rather than left "in case": anything that still wanted one now fails to compile,
   which is the only reliable way to find out. Drawings live in design/blueprints. */
export const CATEGORIES = [
  { key: 'entrees',  en: 'Starters',    he: 'ראשונות' },
  { key: 'soups',    en: 'Soups',       he: 'מרקים' },
  { key: 'salads',   en: 'Salads',      he: 'סלטים' },
  { key: 'mains',    en: 'Mains',       he: 'עיקריות' },
  { key: 'sides',    en: 'Sides',       he: 'תוספות' },
  /* Widened by LABEL, not by key: pastries, pies and muffins live here now.
     A separate Boulangerie category would compete with both this one and `desserts`
     for the same recipes — a muffin is a מאפה AND a dessert, a quiche is a מאפה AND a
     main — so neither boundary earns itself. The importer already routed
     "מאפים מסורתיים" here, so the Hebrew word was effectively claimed already. */
  { key: 'breads',   en: 'Breads & Baking', he: 'מאפים' },
  { key: 'desserts', en: 'Desserts',    he: 'קינוחים' },
  { key: 'kids',     en: "Kids' Table", he: 'ילדים' },
  /* Sauces and spreads. Evidence, not a hunch: `other` held seven recipes and three
     were sauces (ממרח חומוס ביתי, רוטב בוטנים, רוטב סאטה). Placed before `other`
     because `other` is the end of the list by meaning, not by accident. */
  { key: 'sauces',   en: 'Sauces & Spreads', he: 'רטבים וממרחים' },
  { key: 'other',    en: 'Other',       he: 'שונות' },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]['key'];

export const categoryLabel = (key: string) =>
  CATEGORIES.find((c) => c.key === key) ?? { key, en: key, he: key };

export type Unit =
  | 'kg' | 'g' | 'ml' | 'l' | 'cup' | 'pcs' | 'tbsp' | 'tsp' | 'pinch' | 'to taste';

export type Ingredient = {
  id: string; position: number; name: string;
  amount: number | null; amount_max: number | null;
  unit: Unit | null; note: string | null;
  /* Optional sub-heading, e.g. "לרוטב". Consecutive rows sharing a label render
     under one heading; null rows sit directly under the ingredients title. */
  group_label: string | null;
};

export type Step = { id: string; position: number; heading: string | null; body: string };

export type RecipeSummary = {
  id: string; title: string; title_en: string | null;
  category: string;
  /* photo_path is where the object lives; photo_url is what the server signed for
     THIS request. Components only ever want the second. See lib/photos.ts. */
  photo_path?: string | null;
  photo_url: string | null;
  servings: number | null; yield_text: string | null;
  prep_minutes: number | null; cook_minutes: number | null;
  source_name: string | null;
  /* Only the sort control needs these, and only the list query selects them —
     optional so nothing else has to pretend to have them. */
  updated_at?: string | null;
  created_at?: string | null;
};

export type Recipe = RecipeSummary & {
  /* The edit form must round-trip these, not just display their names. Loading
     only source_name meant saving silently wiped "Savta's recipe". */
  source_member_id: string | null;
  meal_type: string | null;
  description_en: string | null; description_he: string | null;
  story: string | null; serving_suggestions: string | null;
  updated_at: string;
  /* Null only until migration 0013 has run. */
  created_at?: string | null; updated_by_name: string | null;
  ingredients: Ingredient[]; steps: Step[];
};

/* ── menu courses ──────────────────────────────────────────────────────────
   Course ORDER is defined here, not by the database: a dessert row must never
   print above the main, whatever order the rows came back in. Lives in constants
   for the same reason CATEGORIES does — the menu builder is a client component. */

/* Courses carry BOTH: `fr` is printed on the menu card, which is a French bistro
   artifact by design; `en` is what the builder shows, because the builder is app
   chrome. Kids' meals never use these — that section has its own vocabulary. */
export const COURSES = [
  { key: 'aperitif', fr: 'Apéritif',         en: 'Aperitif' },
  { key: 'entree',   fr: 'Entrée',           en: 'Starter' },
  /* Pain de Table. The sample card has a bread course and ours could not reproduce
     it — a focaccia had to be filed under Sides. Courses and categories answer
     different questions: a category is where a recipe is filed in the book, a course
     is where a dish sits in the running order of one printed meal. */
  { key: 'pain',     fr: 'Pain de Table',    en: 'Bread' },
  { key: 'main',     fr: 'Plat Principal',   en: 'Main' },
  { key: 'sides',    fr: 'Accompagnements',  en: 'Sides' },
  { key: 'dessert',  fr: 'Dessert',          en: 'Dessert' },
] as const;

export type CourseKey = (typeof COURSES)[number]['key'];

/** French — for the printed card only. */
export const courseLabel = (key: string) =>
  COURSES.find((c) => c.key === key)?.fr ?? key;

/** English — for the builder and anywhere else in the app. */
export const courseLabelEn = (key: string) =>
  COURSES.find((c) => c.key === key)?.en ?? key;

export const courseIndex = (key: string) =>
  COURSES.findIndex((c) => c.key === key);

/**
 * The running order a menu gets when it has not chosen one.
 *
 * COURSES is now a CATALOGUE, not an order: the arrangement is per menu, in
 * `menus.course_order`. A Friday dinner opens with challah and runs six courses; a
 * Tuesday lunch is a main and a salad, and the app already knows which is being
 * planned.
 *
 * This default is the Shabbat shape, because Friday dinner is what this book is
 * mostly for and the challah opens that meal. Deliberately NOT the sample card's
 * order, which puts the green starter after the main — a French service convention
 * that reads oddly on a family table. The sample is reproducible exactly by
 * reordering that one menu.
 */
export const DEFAULT_COURSE_ORDER: CourseKey[] =
  ['aperitif', 'pain', 'entree', 'main', 'sides', 'dessert'];

/**
 * The courses a menu prints, in order.
 *
 * The safety rule lives here rather than in each caller: a course HOLDING DISHES
 * always renders, even when it is not in the chosen order — appended at the end
 * rather than silently dropped. Hiding a section is not deleting its dishes, and a
 * card that quietly omits a dish somebody planned is the worst failure this app
 * could have.
 */
export function coursesForMenu(
  order: string[] | null | undefined, occupied: Iterable<string>,
): CourseKey[] {
  const chosen = (order?.length ? order : DEFAULT_COURSE_ORDER)
    .filter((k): k is CourseKey => COURSES.some((c) => c.key === k));
  const extra = [...occupied]
    .filter((k): k is CourseKey => COURSES.some((c) => c.key === k) && !chosen.includes(k as CourseKey))
    /* Catalogue order for the appended ones, so two hidden-but-occupied courses do
       not print in whatever order the dishes happened to be read in. */
    .sort((a, b) => courseIndex(a) - courseIndex(b));
  return [...chosen, ...extra];
}

import { todayAnchor } from './today';

/* ── the kids' week ────────────────────────────────────────────────────────
   Pure values and date helpers. The planner is a client component, so these
   cannot live beside the Supabase queries — the third time this rule has come
   up, and the reason lib/constants.ts exists at all. */

/* One host per day, Sunday through Saturday.
 *
 * `weekday` is JavaScript's getDay(): 0 = Sunday … 6 = Saturday. That is also what
 * kids_meals.weekday stores, and it is why widening from five days to seven needed no
 * data migration — Mon..Fri were already 1..5 under both schemes.
 *
 * `art` names a drawing in design/kids, not an emoji. These were 🧸 🐶 🐱 🐘 🐰, which
 * render differently on every platform and, in the butterflies' case, not at all on a
 * Samsung Ultra.
 *
 * `day` is written out because the animal is a decoration, not a label: nobody can be
 * expected to know that the elephant means Wednesday. */
/* `day` and `dayShort` carry both languages; the HOST NAMES do not. Teddy and Bunny
   are the animals' names — a child calls them the same thing in either language, the
   way a pet's name does not translate. */
export const ANIMALS = [
  { weekday: 0, day: 'Sunday',    dayHe: 'ראשון',  shortHe: 'א׳', art: 'bear',     host: 'Teddy', colour: '#f4a6c0', shadow: '#d97fa0' },
  { weekday: 1, day: 'Monday',    dayHe: 'שני',    shortHe: 'ב׳', art: 'dog',      host: 'Buddy', colour: '#f4c95d', shadow: '#d6a833' },
  { weekday: 2, day: 'Tuesday',   dayHe: 'שלישי',  shortHe: 'ג׳', art: 'cat',      host: 'Mimi',  colour: '#8fb8e8', shadow: '#6b95c9' },
  { weekday: 3, day: 'Wednesday', dayHe: 'רביעי',  shortHe: 'ד׳', art: 'elephant', host: 'Ellie', colour: '#a8d5ba', shadow: '#7bbf9e' },
  { weekday: 4, day: 'Thursday',  dayHe: 'חמישי',  shortHe: 'ה׳', art: 'rabbit',   host: 'Bunny', colour: '#d6b8e8', shadow: '#b492cc' },
  { weekday: 5, day: 'Friday',    dayHe: 'שישי',   shortHe: 'ו׳', art: 'fox',      host: 'Foxy',  colour: '#f2b48c', shadow: '#d18d63' },
  { weekday: 6, day: 'Saturday',  dayHe: 'שבת',    shortHe: 'ש׳', art: 'owl',      host: 'Ollie', colour: '#b9c7e8', shadow: '#8fa2cc' },
] as const;

export const MEALS = [
  { key: 'breakfast', label: 'Breakfast', labelHe: 'בוקר',   colour: '#f4c95d' },
  { key: 'lunch',     label: 'Lunch',     labelHe: 'צהריים', colour: '#7bbf9e' },
  { key: 'dinner',    label: 'Dinner',    labelHe: 'ערב',    colour: '#8fb8e8' },
] as const;

export type MealKey = (typeof MEALS)[number]['key'];

export type KidsMeal = {
  id: string;
  weekday: number;
  meal: MealKey;
  /* NULLABLE since migration 17, and the type mattered: it was `string`, while both
     the planner and the fridge sheet wrapped the title in a Link to
     /recipes/kids/{recipe_id}. A free-text dish would have linked to
     /recipes/kids/null — a 404 on a row that is working exactly as intended. */
  recipe_id: string | null;
  /** A dish with no recipe. Exactly one of recipe_id / free_text is set. */
  free_text: string | null;
  /** Order within its slot. Maintained by the kids_* functions, never by hand. */
  position: number;
  chef_member_id: string | null;
  recipe: { id: string; title: string; title_en: string | null } | null;
  chef: { name: string; display_name: string | null } | null;
};

/**
 * What to write on a dish, whichever kind it is.
 *
 * Shared rather than repeated, because there are four places that answer this
 * question — the planner, the fridge sheet, and (once menus use the same idea) the
 * builder and the card. Four copies of "recipe title, or the free text" is four
 * places for a free-text dish to render blank.
 */
export function dishLabel(row: {
  free_text?: string | null;
  recipe?: { title: string; title_en?: string | null } | null;
}): string {
  return row.free_text?.trim() || row.recipe?.title || '';
}


/**
 * The Sunday of the week containing `date`.
 *
 * The week here runs Sunday to Saturday. It used to run Monday to Friday, which is a
 * European school week; migration 0010 moves the stored week_start dates to match.
 *
 * Named `sundayOf` rather than left as `mondayOf` deliberately: a helper whose name
 * says Monday while it returns a Sunday is the kind of thing that reads as correct in
 * a diff for years.
 */
export function sundayOf(date?: Date | string): string {
  /* Defaults to today IN JERUSALEM, not on the server's clock. Between midnight and
     03:00 local a UTC server still reports yesterday, so the planner opened on last
     week for three hours every night. See lib/today.ts. */
  const d = date === undefined
    ? todayAnchor()
    : new Date(typeof date === 'string' ? `${date}T12:00:00` : date);
  d.setDate(d.getDate() - d.getDay());   // getDay(): 0 = Sunday
  return d.toISOString().slice(0, 10);
}

export function addWeeks(weekStart: string, n: number): string {
  const d = new Date(`${weekStart}T12:00:00`);
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

/** Pretty week label, e.g. "10 – 14 AUG". */
export function weekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start);
  // +6, not +4: the week is Sunday to Saturday now, so a five-day span would print
  // "2 – 6 AUG" for a week that runs to the 8th.
  end.setDate(end.getDate() + 6);
  const month = end.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  return `${start.getDate()} – ${end.getDate()} ${month}`;
}

