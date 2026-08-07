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
  description_en: string | null; description_he: string | null;
  story: string | null; serving_suggestions: string | null;
  updated_at: string; updated_by_name: string | null;
  ingredients: Ingredient[]; steps: Step[];
};
