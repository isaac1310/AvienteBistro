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
