/* Pure values and types — no server imports, so client components can use these
 * without dragging `next/headers` into the browser bundle. That is exactly what
 * happened when CATEGORIES lived in queries.ts: the edit form imported it and the
 * whole server client came along, failing the build.
 *
 * Rule of thumb: if a client component needs it, it belongs here. */

export const CATEGORIES = [
  { key: 'entrees',  fr: 'Entrées',         emoji: '🥗' },
  { key: 'soups',    fr: 'Soupes',          emoji: '🥣' },
  { key: 'salads',   fr: 'Salades',         emoji: '🥬' },
  { key: 'mains',    fr: 'Plat Principal',  emoji: '🍗' },
  { key: 'sides',    fr: 'Accompagnements', emoji: '🥔' },
  { key: 'breads',   fr: 'Boulangerie',     emoji: '🥖' },
  { key: 'desserts', fr: 'Desserts',        emoji: '🍰' },
  { key: 'kids',     fr: "Kids' Table",     emoji: '🧸' },
  { key: 'other',    fr: 'Divers',          emoji: '🫙' },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]['key'];

export const categoryLabel = (key: string) =>
  CATEGORIES.find((c) => c.key === key) ?? { key, fr: key, emoji: '🍽' };

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
  category: string; photo_url: string | null;
  servings: number | null; yield_text: string | null;
  prep_minutes: number | null; cook_minutes: number | null;
  source_name: string | null;
};

export type Recipe = RecipeSummary & {
  /* The edit form must round-trip these, not just display their names. Loading
     only source_name meant saving silently wiped "Savta's recipe". */
  source_member_id: string | null;
  meal_type: string | null;
  description_en: string | null; description_he: string | null;
  story: string | null; serving_suggestions: string | null;
  updated_at: string; updated_by_name: string | null;
  ingredients: Ingredient[]; steps: Step[];
};

/* ── menu courses ──────────────────────────────────────────────────────────
   Course ORDER is defined here, not by the database: a dessert row must never
   print above the main, whatever order the rows came back in. Lives in constants
   for the same reason CATEGORIES does — the menu builder is a client component. */

export const COURSES = [
  { key: 'aperitif', fr: 'Apéritif' },
  { key: 'entree',   fr: 'Entrée' },
  { key: 'main',     fr: 'Plat Principal' },
  { key: 'sides',    fr: 'Accompagnements' },
  { key: 'dessert',  fr: 'Dessert' },
] as const;

export type CourseKey = (typeof COURSES)[number]['key'];

export const courseLabel = (key: string) =>
  COURSES.find((c) => c.key === key)?.fr ?? key;

export const courseIndex = (key: string) =>
  COURSES.findIndex((c) => c.key === key);

/* ── the kids' week ────────────────────────────────────────────────────────
   Pure values and date helpers. The planner is a client component, so these
   cannot live beside the Supabase queries — the third time this rule has come
   up, and the reason lib/constants.ts exists at all. */

export const ANIMALS = [
  { weekday: 1, animal: '🧸', host: 'Teddy',   colour: '#f4a6c0', shadow: '#d97fa0' },
  { weekday: 2, animal: '🐶', host: 'Buddy',   colour: '#f4c95d', shadow: '#d6a833' },
  { weekday: 3, animal: '🐱', host: 'Mimi',    colour: '#8fb8e8', shadow: '#6b95c9' },
  { weekday: 4, animal: '🐘', host: 'Ellie',   colour: '#a8d5ba', shadow: '#7bbf9e' },
  { weekday: 5, animal: '🐰', host: 'Bunny',   colour: '#d6b8e8', shadow: '#b492cc' },
] as const;

export const MEALS = [
  { key: 'breakfast', label: 'Breakfast', colour: '#f4c95d' },
  { key: 'lunch',     label: 'Lunch',     colour: '#7bbf9e' },
  { key: 'dinner',    label: 'Dinner',    colour: '#8fb8e8' },
] as const;

export type MealKey = (typeof MEALS)[number]['key'];

export type KidsMeal = {
  id: string;
  weekday: number;
  meal: MealKey;
  recipe_id: string;
  chef_member_id: string | null;
  recipe: { id: string; title: string; title_en: string | null } | null;
  chef: { name: string } | null;
};


/** The Monday of the week containing `date`. */
export function mondayOf(date = new Date()): string {
  const d = new Date(date);
  // getDay(): 0 = Sunday. Sunday belongs to the week that STARTED six days ago,
  // not the one about to begin — otherwise a Sunday plan lands on the wrong week.
  const delta = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - delta);
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
  end.setDate(end.getDate() + 4);
  const month = end.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  return `${start.getDate()} – ${end.getDate()} ${month}`;
}

