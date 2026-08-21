import { attachPhotoUrl, attachPhotoUrls } from './photos';
import { supabaseServer } from './supabase/server';

/* Every read the app does, in one place.
 *
 * Two rules hold throughout:
 *   — `deleted_at is null` on every recipe query. Soft delete is only a delete if
 *     nothing forgets to filter it.
 *   — Order child rows by `position`, never by insertion. Ingredient and step order
 *     is meaning, not presentation.
 */

/* Types and category constants live in ./constants so client components can
   import them without pulling next/headers into the browser bundle. */
export * from './constants';
import type { Ingredient, Recipe, RecipeSummary, Step } from './constants';
import { CATEGORIES } from './constants';

/** Counts per category, for the homepage grid. Categories with none still appear. */
export async function categoryCounts(): Promise<Record<string, number>> {
  const db = await supabaseServer();
  const { data, error } = await db
    .from('recipes')
    .select('category')
    .is('deleted_at', null);

  if (error) throw new Error(`categoryCounts: ${error.message}`);

  const counts: Record<string, number> = {};
  for (const c of CATEGORIES) counts[c.key] = 0;
  for (const row of data ?? []) counts[row.category] = (counts[row.category] ?? 0) + 1;
  return counts;
}

/* The source member is a join; Supabase returns it as a nested object, so it is
   flattened here rather than leaking the shape into every component. */
const SUMMARY_COLUMNS =
  'id, title, title_en, category, photo_url, photo_path, servings, yield_text, ' +
  'prep_minutes, cook_minutes, updated_at, created_at, ' +
  'source:family_members!recipes_source_member_id_fkey(name)';

type SummaryRow = Omit<RecipeSummary, 'source_name'> & { source: { name: string } | null };

/**
 * Run a select, and survive a column the database does not have yet.
 *
 * This exists because it has now happened three times: `menus.meal_time` took /menus
 * down in production, `recipes.photo_path` took every recipe page down, and
 * `recipes.created_at` took the edit page down while this very fix was being written.
 * Each time the code was correct and merged, the migration simply had not run — and
 * each time the app's answer was a 500 rather than a page missing one field.
 *
 * On Postgres 42703 the missing column's NAME is in the message, so it is removed
 * from the list and the query is retried. The result is a page that renders without
 * the new field instead of a page that does not render. Reads only: a WRITE must
 * still fail loudly, because silently dropping what someone typed is not degrading,
 * it is losing.
 *
 * Bounded to a handful of attempts so a genuinely broken query cannot loop.
 */
async function selectTolerant<T>(
  label: string,
  columns: string,
  run: (columns: string) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>,
): Promise<{ rows: T[]; dropped: string[] }> {
  let cols = columns;
  const dropped: string[] = [];

  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await run(cols);
    if (!error) return { rows: (data ?? []) as T[], dropped };

    /* "column recipes.created_at does not exist" → created_at. Quoted forms appear
       too, depending on how the column was written. */
    const missing = error.code === '42703'
      ? error.message.match(/column\s+"?(?:[\w]+\.)?"?([\w]+)"?\s+does not exist/i)?.[1]
      : undefined;
    if (!missing) throw new Error(`${label}: ${error.message}`);

    const next = cols
      .split(',')
      .filter((c) => c.trim() !== missing && !c.trim().startsWith(`${missing}:`))
      .join(',');
    /* If the name is not in the list it is inside an embed we cannot safely edit —
       better to fail with the real message than to loop. */
    if (next === cols) throw new Error(`${label}: ${error.message}`);

    dropped.push(missing);
    cols = next;
  }
  throw new Error(`${label}: too many missing columns to recover`);
}

const flatten = (r: SummaryRow): RecipeSummary => {
  const { source, ...rest } = r;
  return { ...rest, source_name: source?.name ?? null };
};

/**
 * How a category page can be ordered.
 *
 * Deliberately three, and deliberately not "by chef": the chef is a NESTED join
 * (`source:family_members(name)`), not a column on `recipes`, so `.order('chef')`
 * would not fail at build — it would fail at runtime, on the page, for the one
 * person using it. Ordering by a joined table needs PostgREST's referencedTable
 * form and is worth doing once these three are proven.
 *
 * The keys are what appear in the URL, so they are part of the app's surface: a
 * bookmarked ?sort= has to keep meaning the same thing.
 */
export const SORTS = {
  title:   { column: 'title',      ascending: true },
  updated: { column: 'updated_at', ascending: false },
  created: { column: 'created_at', ascending: false },
} as const;

export type SortKey = keyof typeof SORTS;

export function isSortKey(v: string | undefined): v is SortKey {
  return !!v && v in SORTS;
}

/**
 * Hebrew alphabetical order, א to ת.
 *
 * Postgres sorted these and could not be told how: PostgREST's `order` exposes no
 * collation, the column is a bare `text` with the database's default collation, and
 * that default is not Hebrew-aware. Two things went wrong at once — Latin titles
 * clumped away from Hebrew ones (code points, not letters), and the Hebrew block was
 * not in א-ת order within itself.
 *
 * So the ordering moved here, where `Intl.Collator('he')` knows the alphabet. At ~80
 * recipes the cost is nothing; the day the corpus is large enough to care, the fix is
 * a Postgres index on `title COLLATE "he-IL-x-icu"` and an RPC, not this.
 *
 * `numeric` so "מרק 2" follows "מרק 1" rather than preceding "מרק 10".
 */
const hebrew = new Intl.Collator('he', { numeric: true, sensitivity: 'base' });

/** Sort by title, in place-safe fashion, using the Hebrew alphabet. */
export function byTitle<T extends { title: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => hebrew.compare(a.title, b.title));
}

/**
 * Keep a date order, but settle its ties in Hebrew.
 *
 * Every recipe from one import shares a timestamp to the second, so "recently added"
 * is mostly one enormous tie — and a tie Postgres breaks by whatever it feels like
 * returning. Sorting the whole list by title instead would discard the date, which is
 * the obvious wrong fix. So: walk the rows, and reorder only the runs that share a
 * timestamp.
 */
function tiebreakByTitle<T extends { title: string }>(
  rows: T[], column: 'updated_at' | 'created_at',
): T[] {
  const stamp = (r: T) => (r as unknown as Record<string, string | null>)[column] ?? '';
  const out: T[] = [];
  let run: T[] = [];
  for (const row of rows) {
    if (run.length && stamp(run[0]) === stamp(row)) run.push(row);
    else { out.push(...byTitle(run)); run = [row]; }
  }
  out.push(...byTitle(run));
  return out;
}

export async function recipesInCategory(
  category: string, sort: SortKey = 'title',
): Promise<RecipeSummary[]> {
  const db = await supabaseServer();
  const order = SORTS[sort] ?? SORTS.title;
  const { rows } = await selectTolerant<SummaryRow>('recipesInCategory', SUMMARY_COLUMNS,
    (cols) => {
      let q = db
        .from('recipes')
        .select(cols)
        .eq('category', category)
        .is('deleted_at', null);
      /* By NAME, the database does not order at all — see byTitle. Asking Postgres
         for `.order('title')` here and then re-sorting would only cost a sort. */
      if (sort !== 'title') {
        /* Title second, always. Ordering by a date alone leaves rows with the same
           timestamp — every recipe from one import — in whatever order Postgres
           happens to return, which changes between requests and makes the list look
           like it is shuffling itself. The tiebreak is applied in Hebrew below; this
           one only has to be STABLE. */
        q = q
          .order(order.column, { ascending: order.ascending, nullsFirst: false })
          .order('title');
      }
      return q;
    });

  const flat = rows.map(flatten);

  /* The date orders stay as Postgres returned them; only their TIEBREAK is redone in
     Hebrew, on runs of equal timestamps. Sorting the whole list by title here would
     throw the dates away — which is the trap in "just sort it in the app". */
  const ordered = sort === 'title'
    ? byTitle(flat)
    : tiebreakByTitle(flat, order.column as 'updated_at' | 'created_at');

  /* Sign the stored paths for this request. See lib/photos.ts — the alternative was
     a one-year signed URL frozen into the row at upload time. */
  return attachPhotoUrls(db, ordered);
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const db = await supabaseServer();
  const DETAIL_COLUMNS =
      `${SUMMARY_COLUMNS}, source_member_id, meal_type,
       description_en, description_he, story, serving_suggestions,
       updated_at, created_at,
       editor:family_members!recipes_updated_by_fkey(name),
       ingredients(id, position, name, amount, amount_max, unit, note, group_label),
       steps(id, position, heading, body)`;

  const { rows } = await selectTolerant<Record<string, unknown>>('getRecipe', DETAIL_COLUMNS,
    (cols) => db
      .from('recipes')
      .select(cols)
      .eq('id', id)
      .is('deleted_at', null)
      .limit(1));
  const data = rows[0] ?? null;

  if (!data) return null;

  const row = data as unknown as SummaryRow & {
    source_member_id: string | null; meal_type: string | null;
    description_en: string | null; description_he: string | null;
    story: string | null; serving_suggestions: string | null;
    updated_at: string; created_at: string | null; editor: { name: string } | null;
    ingredients: Ingredient[]; steps: Step[];
  };

  return attachPhotoUrl(db, {
    ...flatten(row),
    source_member_id: row.source_member_id,
    meal_type: row.meal_type,
    description_en: row.description_en,
    description_he: row.description_he,
    story: row.story,
    serving_suggestions: row.serving_suggestions,
    updated_at: row.updated_at,
    created_at: row.created_at,
    updated_by_name: row.editor?.name ?? null,
    // Sort here rather than in the query: PostgREST cannot order embedded rows
    // reliably across versions, and getting this wrong scrambles a recipe.
    ingredients: [...(row.ingredients ?? [])].sort((a, b) => a.position - b.position),
    steps: [...(row.steps ?? [])].sort((a, b) => a.position - b.position),
  });
}

/** Trigram search over title, title_en, ingredient names and both descriptions. */
export async function searchRecipes(query: string): Promise<RecipeSummary[]> {
  const q = query.trim();
  if (!q) return [];
  const db = await supabaseServer();
  const { rows } = await selectTolerant<SummaryRow>('searchRecipes', SUMMARY_COLUMNS,
    (cols) => db
      .from('recipes')
      .select(cols)
      .is('deleted_at', null)
      .ilike('search_text', `%${q}%`)
      /* No .order('title') — see byTitle. And the limit is the WHOLE corpus with room
         to spare, not 50: cutting at 50 in the database and then sorting those 50 in
         Hebrew gives the wrong first fifty, because the rows that would have sorted
         first may be among the ones already dropped. At ~80 recipes "fetch all the
         matches" is the honest answer; a real limit belongs with a real collated
         index. */
      .limit(500));

  return attachPhotoUrls(db, byTitle(rows.map(flatten)));
}
