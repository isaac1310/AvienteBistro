/* Aviente — normalizing recipe parser.
 *
 * One implementation, three callers: the seed script (tools/seed-from-source.mjs),
 * the paste-import dialog (§3.9), and the ChatGPT migration (§3.10). Keep it
 * dependency-free and side-effect-free so all three can share it.
 *
 * The bias is deliberate: NEVER throw away a recipe. Every rule below degrades to
 * a null field rather than a rejection, because losing Savta's recipe to a parser
 * is worse than importing it messy. Unparsed detail survives in `raw`.
 *
 * Every rule here was derived from the real source files in ../../ -- see §3.9 of
 * the build spec. Nothing is speculative.
 */

export const SCHEMA_VERSION = 1;

export const UNITS = ['kg', 'g', 'ml', 'l', 'cup', 'pcs', 'tbsp', 'tsp', 'pinch', 'to taste'];

export const CATEGORIES = [
  'entrees', 'soups', 'salads', 'mains', 'sides',
  'breads', 'desserts', 'kids', 'sauces', 'other',
];

/* Hebrew category names seen in the sources → enum. Breads absorbs every baked
   good; without it five of the twelve sample recipes land in `other`. */
const CATEGORY_MAP = {
  'מנות עיקריות': 'mains',
  'עיקריות': 'mains',
  'מרקים': 'soups',
  'מרק': 'soups',
  'סלטים': 'salads',
  'סלט': 'salads',
  'ראשונות': 'entrees',
  'מתאבנים': 'entrees',
  'תוספות': 'sides',
  'לחמים': 'breads',
  'מאפים מסורתיים': 'breads',
  'מאפים ואסייתי': 'breads',
  'מאפים': 'breads',
  'קינוחים ועוגות': 'desserts',
  'קינוחים': 'desserts',
  'עוגות': 'desserts',
  'ילדים': 'kids',
  /* Sauces and spreads, as a stated CATEGORY name from a source. This map answers
     "the source said this category" — the anchored title guesses live in
     tools/parse-markdown-book.mjs and are a different question. */
  'רטבים': 'sauces',
  'רטבים וממרחים': 'sauces',
  'ממרחים': 'sauces',
  'רוטב': 'sauces',
  /* Baked goods all land in breads, which is now labelled מאפים / Breads & Baking. */
  'פשטידות': 'breads',
  'מאפים ופשטידות': 'breads',
};

/* Hebrew measure words → unit enum. Plural and singular both appear. */
const UNIT_MAP = {
  /* The written book uses geresh/gershayim abbreviations (גר׳, ק״ג, מ״ל) that a
     plain-word list misses entirely — 500 גר׳ was parsing as 500 PIECES of a
     thing called "גר׳ נטו דג ים טחון". Both the straight and typographic marks
     appear, sometimes in the same table. */
  'גרם': 'g', 'ג': 'g', 'גר': 'g', 'גר׳': 'g', "גר'": 'g', 'ג׳': 'g',
  'ק"ג': 'kg', 'ק״ג': 'kg', 'קג': 'kg', 'קילו': 'kg', 'קילוגרם': 'kg',
  'מ"ל': 'ml', 'מ״ל': 'ml', 'מל': 'ml', 'מיליליטר': 'ml',
  'ליטר': 'l', 'ל׳': 'l',
  /* Countables the book uses as units. They are pieces of a thing, and `pcs`
     is what the app already renders without a unit label. */
  'שן': 'pcs', 'שיניים': 'pcs', 'שיני': 'pcs',
  'קופסא': 'pcs', 'קופסה': 'pcs', 'חבילה': 'pcs', 'שקית': 'pcs',
  'צרור': 'pcs', 'חופן': 'pcs', 'ראש': 'pcs',
  'כוס': 'cup', 'כוסות': 'cup',
  'כף': 'tbsp', 'כפות': 'tbsp',
  'כפית': 'tsp', 'כפיות': 'tsp',
  'קורט': 'pinch',
  'יחידה': 'pcs', 'יחידות': 'pcs', "יח'": 'pcs', 'יח': 'pcs', 'יח׳': 'pcs',
};

/* "לפי הטעם" and friends are a statement about seasoning, not a missing amount. */
const TO_TASTE = ['לפי הטעם', 'לפי טעם', 'טעם', 'to taste'];

/* Written-out fractions. "חצי כפית מלח" is a normal way to write a recipe and
   was parsing to no quantity at all. */
const WORD_NUMBERS = {
  'חצי': 0.5, 'מחצית': 0.5,
  'רבע': 0.25, 'שליש': 1 / 3, 'שלישית': 1 / 3,
  'שלושת': 3, 'שני': 2, 'שתי': 2, 'אחד': 1, 'אחת': 1,
};

const FRACTIONS = {
  '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

/* ── small helpers ─────────────────────────────────────────────────────────── */

const clean = (v) => (typeof v === 'string' ? v.trim() : v == null ? null : String(v).trim());
const nonEmpty = (v) => { const s = clean(v); return s ? s : null; };

/** First present key among aliases — the sources disagree on nearly every name. */
function pick(obj, ...keys) {
  for (const k of keys) if (obj?.[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  return null;
}

/** "1½" → 1.5, "½" → 0.5, "1/2" → 0.5, "1.2" → 1.2. null when not a number. */
export function parseNumber(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let s = String(raw).trim().replace(/[־–—]/g, '-');
  if (!s) return null;

  /* A leading Hebrew number word, e.g. "חצי כפית". */
  const word = s.match(/^(\S+)/);
  if (word && WORD_NUMBERS[word[1]] != null) return WORD_NUMBERS[word[1]];

  /* A bare fraction like 1/4 must be read as a fraction, NOT as the integer 1
     followed by unparsed junk — which is what happened, turning ¼ צרור into a
     whole bunch. Checked before the leading-integer branch for that reason. */
  const bare = s.match(/^(\d+)\s*\/\s*(\d+)(?!\d)/);
  if (bare) {
    const d = parseInt(bare[2], 10);
    if (d) return Math.round((parseInt(bare[1], 10) / d) * 1000) / 1000;
  }

  let total = 0, matched = false;
  // leading integer part
  const lead = s.match(/^(\d+(?:[.,]\d+)?)/);
  if (lead) { total += parseFloat(lead[1].replace(',', '.')); s = s.slice(lead[0].length).trim(); matched = true; }
  // ASCII fraction "1/2"
  const ascii = s.match(/^(\d+)\s*\/\s*(\d+)/);
  if (ascii) {
    const d = parseInt(ascii[2], 10);
    if (d) { total += parseInt(ascii[1], 10) / d; s = s.slice(ascii[0].length).trim(); matched = true; }
  }
  // vulgar fraction glyph, possibly following an integer ("1½")
  const glyph = [...s][0];
  if (glyph && FRACTIONS[glyph]) { total += FRACTIONS[glyph]; matched = true; }

  return matched ? Math.round(total * 1000) / 1000 : null;
}

/** "400-500" → {amount: 400, amountMax: 500}; "500" → {amount: 500, amountMax: null}. */
export function parseAmount(raw) {
  if (raw == null || raw === '') return { amount: null, amountMax: null };
  const s = String(raw).trim();
  if (TO_TASTE.some((t) => s.includes(t))) return { amount: null, amountMax: null, toTaste: true };

  const range = s.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (range) {
    const lo = parseNumber(range[1]), hi = parseNumber(range[2]);
    if (lo != null && hi != null) {
      return hi >= lo ? { amount: lo, amountMax: hi } : { amount: hi, amountMax: lo };
    }
  }
  return { amount: parseNumber(s), amountMax: null };
}

function mapUnit(token) {
  if (!token) return null;
  const t = String(token).trim().replace(/[.,;:]$/, '');
  if (UNITS.includes(t)) return t;
  return UNIT_MAP[t] ?? null;
}

/* ── ingredients ───────────────────────────────────────────────────────────── */

/**
 * Parse one free-form ingredient line, e.g.
 *   "500 גרם קמח לבן"            → 500 g קמח לבן
 *   "400-500 גרם ג'ינג'ר טרי"     → 400–500 g ג'ינג'ר טרי
 *   "1 כף שמן זית"                → 1 tbsp שמן זית
 *   "כף שמיר"                     → 1 tbsp שמיר        (bare unit means one)
 *   "4 ביצים"                     → 4 pcs ביצים        (the noun IS the ingredient)
 *   "קורט פלפל שחור גרוס"          → pinch פלפל שחור גרוס
 *   "בצל ירוק"                    → no amount at all, kept as-is
 *   "מלח לפי הטעם"                → 'to taste'
 */
export function parseIngredientLine(line) {
  const raw = clean(line);
  if (!raw) return null;

  const out = { name: raw, amount: null, amountMax: null, unit: null, note: null, raw };

  // A trailing parenthetical is a note, not part of the name.
  const paren = raw.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  let body = raw;
  if (paren && paren[2].trim()) { body = paren[1].trim(); out.note = paren[2].trim(); }

  if (TO_TASTE.some((t) => body.includes(t))) {
    out.unit = 'to taste';
    out.name = body.replace(new RegExp(`\\s*(${TO_TASTE.join('|')})\\s*`), ' ').trim() || body;
    return out;
  }

  // [number or range] [unit-or-noun] [rest]
  const m = body.match(/^([\d.,/½¼¾⅓⅔⅛⅜⅝⅞]+(?:\s*[-–—]\s*[\d.,/]+)?)\s*(\S+)?\s*(.*)$/);
  if (m) {
    const { amount, amountMax } = parseAmount(m[1]);
    if (amount != null) {
      const unit = mapUnit(m[2]);
      if (unit) {
        // "500 גרם קמח לבן"
        out.amount = amount; out.amountMax = amountMax; out.unit = unit;
        out.name = clean(m[3]) || clean(m[2]);
      } else {
        // "4 ביצים" — the token after the number is the ingredient itself, so it
        // is countable: pcs of that noun.
        out.amount = amount; out.amountMax = amountMax; out.unit = 'pcs';
        out.name = [m[2], m[3]].filter(Boolean).join(' ').trim();
      }
      return out;
    }
  }

  // No number. A leading measure word still implies exactly one ("כף שמיר").
  const lead = body.match(/^(\S+)\s+(.*)$/);
  if (lead) {
    const unit = mapUnit(lead[1]);
    if (unit) {
      out.unit = unit;
      out.amount = unit === 'pinch' ? null : 1;
      out.name = clean(lead[2]);
      return out;
    }
  }

  // "בצל ירוק" — a real ingredient with no quantity. Keep it; do not invent one,
  // and do not coerce to 'to taste', which says something different.
  out.name = body;
  return out;
}

/**
 * Parse an amount cell that stands apart from the name — a table gives you the
 * two separately, and joining them back into one string only to re-split it
 * throws away the structure and mangles the name. Returns what the cell says
 * about quantity and nothing about the ingredient.
 */
export function parseAmountCell(cell) {
  const raw = clean(cell);
  if (!raw) return { amount: null, amountMax: null, unit: null, note: null };

  if (TO_TASTE.some((t) => raw.includes(t))) {
    return { amount: null, amountMax: null, unit: 'to taste', note: null };
  }

  /* Anything after the quantity is a qualifier, not part of it: "500 גר׳ נטו",
     "½ כוס או תפח״א 1". Keep it as a note rather than discarding it. */
  const m = raw.match(/^([\d.,/½¼¾⅓⅔⅛⅜⅝⅞]+(?:\s*[-–—]\s*[\d.,/]+)?|\S+)\s*(\S+)?\s*(.*)$/);
  if (!m) return { amount: null, amountMax: null, unit: null, note: raw };

  const { amount, amountMax } = parseAmount(m[1]);
  if (amount == null) {
    // No number at all: a bare measure word still means one ("כף").
    const unit = mapUnit(m[1]);
    return unit
      ? { amount: unit === 'pinch' ? null : 1, amountMax: null, unit, note: nonEmpty([m[2], m[3]].filter(Boolean).join(' ')) }
      : { amount: null, amountMax: null, unit: null, note: raw };
  }

  const unit = mapUnit(m[2]);
  const rest = [unit ? null : m[2], m[3]].filter(Boolean).join(' ').trim();
  return { amount, amountMax, unit, note: nonEmpty(rest) };
}

/** Accepts either a structured object or a bare string. */
export function normalizeIngredient(input) {
  if (input == null) return null;
  if (typeof input === 'string') return parseIngredientLine(input);

  const name = nonEmpty(pick(input, 'name', 'ingredient', 'item'));
  const rawAmount = pick(input, 'amount', 'qty', 'quantity');
  const rawUnit = pick(input, 'unit', 'units', 'measure');
  const note = nonEmpty(pick(input, 'note', 'notes', 'remark'));

  // Some rows carry everything in `name` even in the "structured" file.
  if (!name) return null;
  const { amount, amountMax: parsedMax, toTaste } = parseAmount(rawAmount);
  let unit = mapUnit(rawUnit);
  if (!unit && toTaste) unit = 'to taste';

  /* An explicit amountMax on a structured input WINS over anything parsed out of
     the amount field. Without this, an export→import round trip silently dropped
     the upper bound of every range: 400–500 g came back as 400 g. Same class of
     loss as the group label, in the same function. */
  const amountMax = pick(input, 'amountMax', 'amount_max') != null
    ? parseNumber(pick(input, 'amountMax', 'amount_max'))
    : parsedMax ?? null;

  return {
    name, amount, amountMax, unit, note,
    /* The sub-group label must survive normalisation. It did not: the markdown
       converter emitted `group` on every row and this function rebuilt the object
       without it, so 23 ingredients imported correctly and every "לרוטב" heading
       vanished between the file and the database. */
    group: nonEmpty(pick(input, 'group', 'group_label', 'groupLabel')),
    raw: [rawAmount, rawUnit, name].filter(Boolean).join(' '),
  };
}

/* ── steps ─────────────────────────────────────────────────────────────────── */

/** Accepts "text", {step, title, description}, or {heading, body}. */
export function normalizeStep(input) {
  if (input == null) return null;
  if (typeof input === 'string') {
    const body = clean(input);
    if (!body) return null;
    // "**הכנת הבצק:** בקערה..." — markdown-bolded lead-in is a heading.
    const bold = body.match(/^\*\*(.+?)\*\*[:：]?\s*(.+)$/s);
    if (bold) return { heading: bold[1].trim(), body: bold[2].trim() };
    return { heading: null, body };
  }
  const heading = nonEmpty(pick(input, 'heading', 'title', 'name'));
  const body = nonEmpty(pick(input, 'body', 'description', 'text', 'instruction'));
  if (!body) return heading ? { heading: null, body: heading } : null;
  return { heading, body };
}

/* ── whole recipe ──────────────────────────────────────────────────────────── */

export function mapCategory(raw) {
  const s = clean(raw);
  if (!s) return { category: 'other', resolved: false };
  if (CATEGORIES.includes(s)) return { category: s, resolved: true };
  if (CATEGORY_MAP[s]) return { category: CATEGORY_MAP[s], resolved: true };
  // partial match — "מאפים ואסייתי" style compounds
  for (const [he, en] of Object.entries(CATEGORY_MAP)) {
    if (s.includes(he)) return { category: en, resolved: true };
  }
  return { category: 'other', resolved: false };
}

/** "חלוז צ'רקסי עם גבינה (Khaluz)" → title + title_en, but only for Latin script. */
export function splitTitle(raw) {
  const s = clean(raw) ?? '';
  const m = s.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  // Latin script including diacritics -- "Gözleme" must qualify, so an ASCII-only
  // test is too narrow. Requires at least one letter, and no non-Latin letters.
  if (m && /\p{Script=Latin}/u.test(m[2]) && !/\p{Letter}/u.test(m[2].replace(/\p{Script=Latin}/gu, ''))) {
    return { title: m[1].trim(), titleEn: m[2].trim() };
  }
  return { title: s, titleEn: null };
}

/**
 * Normalize one source recipe of any known shape into the canonical §3.9 object.
 * Returns { recipe, warnings } — warnings are for the import preview, never fatal.
 */
export function normalizeRecipe(input, opts = {}) {
  const warnings = [];
  const { title, titleEn: derivedEn } = splitTitle(pick(input, 'title', 'name'));
  if (!title) return { recipe: null, warnings: ['no title — cannot import'] };

  /* An explicit titleEn wins over one derived from parentheses in the title.
     splitTitle exists for source documents that write "חלוז (Khaluz)"; a backup
     already has the field separately, and letting the derivation win discarded it
     whenever the title had no parentheses. */
  const titleEn = nonEmpty(pick(input, 'titleEn', 'title_en')) ?? derivedEn;

  const { category, resolved } = mapCategory(input.category);
  if (!resolved && input.category) warnings.push(`category "${input.category}" unrecognised → other`);
  else if (!input.category) warnings.push('no category → other');

  const servings = parseNumber(pick(input, 'servings', 'portions'));
  const yieldText = nonEmpty(pick(input, 'yieldText', 'yield', 'makes'));

  const rawIngredients = pick(input, 'ingredients', 'items') ?? [];
  const ingredients = (Array.isArray(rawIngredients) ? rawIngredients : [rawIngredients])
    .map(normalizeIngredient).filter(Boolean)
    .map((ing, i) => ({ ...ing, position: i }));
  if (!ingredients.length) warnings.push('no ingredients parsed');

  const rawSteps = pick(input, 'steps', 'instructions', 'directions') ?? [];
  const steps = (Array.isArray(rawSteps) ? rawSteps : [rawSteps])
    .map(normalizeStep).filter(Boolean)
    .map((s, i) => ({ ...s, position: i }));
  if (!steps.length) warnings.push('no steps parsed');

  // `usage_recommendations` is an array of serving suggestions; `notes` is a
  // free remark. They are different things and rev 1 conflated them.
  const usage = pick(input, 'servingSuggestions', 'usage_recommendations', 'usageRecommendations');
  const servingSuggestions = Array.isArray(usage) ? usage.join('\n') : nonEmpty(usage);

  const recipe = {
    schemaVersion: SCHEMA_VERSION,
    title, titleEn,
    category,
    mealType: category === 'kids' ? nonEmpty(pick(input, 'mealType', 'meal_type')) : null,
    descriptionHe: nonEmpty(pick(input, 'descriptionHe', 'description_he')),
    descriptionEn: nonEmpty(pick(input, 'descriptionEn', 'description_en', 'description')),
    story: nonEmpty(pick(input, 'story', 'notes', 'note')),
    servingSuggestions,
    prepMinutes: parseNumber(pick(input, 'prepMinutes', 'prep_time_min', 'prep_time_minutes')),
    cookMinutes: parseNumber(pick(input, 'cookMinutes', 'cook_time_min', 'cook_time_minutes')),
    // A recipe is portioned OR measured by output. Prefer an explicit count; fall
    // back to the yield text; if neither exists the DB check would reject the row,
    // so record that as a warning and let the importer ask.
    servings: servings ?? null,
    yieldText: servings ? null : yieldText,
    source: nonEmpty(pick(input, 'source', 'author', 'from')),
    /* Where the photograph lives in Storage, when a backup document carries one.
       This function rebuilds the object field by field, so anything not named here is
       silently dropped — which is exactly how `group` and `amountMax` were lost
       before. A backup that records photoPath and an importer that discards it is a
       round trip that quietly loses every picture. */
    photoPath: nonEmpty(pick(input, 'photoPath', 'photo_path')),
    externalRef: nonEmpty(pick(input, 'externalRef', 'external_ref', 'id')) ?? null,
    ingredients, steps,
  };

  if (recipe.servings == null && recipe.yieldText == null) {
    warnings.push('neither servings nor yield — needs one before saving');
  }
  if (opts.batchId) recipe.importBatchId = opts.batchId;
  return { recipe, warnings };
}

/**
 * Entry point for a whole pasted/exported document. Accepts a bare array, a
 * {recipes: [...]} wrapper, or a single recipe object. Refuses an unknown
 * schemaVersion rather than guessing (the price-tracker rule).
 */
export function normalizeDocument(input, opts = {}) {
  if (input == null) return { recipes: [], errors: ['nothing to import'] };

  const v = input.schemaVersion ?? input.version;
  if (v != null && Number(v) !== SCHEMA_VERSION) {
    return { recipes: [], errors: [`unknown schemaVersion ${v} — refusing to guess`] };
  }

  const list = Array.isArray(input) ? input
    : Array.isArray(input.recipes) ? input.recipes
    : [input];

  const recipes = [], errors = [];
  for (const [i, item] of list.entries()) {
    const { recipe, warnings } = normalizeRecipe(item, opts);
    if (!recipe) { errors.push(`#${i + 1}: ${warnings.join('; ')}`); continue; }
    recipes.push({ ...recipe, warnings });
  }
  return { recipes, errors };
}

/** Tolerant of stray prose and code fences, as the pasted answer usually has both. */
export function parsePastedJson(text) {
  if (!text || !String(text).trim()) return { error: 'nothing to paste' };
  const raw = String(text).replace(/```[a-z]*/gi, '').trim();
  const first = Math.min(...['{', '['].map((c) => { const i = raw.indexOf(c); return i === -1 ? Infinity : i; }));
  const last = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
  if (!Number.isFinite(first) || last < first) return { error: 'no JSON found in that text' };
  try {
    return { data: JSON.parse(raw.slice(first, last + 1)) };
  } catch (e) {
    return { error: `that JSON is not valid — ${e.message}` };
  }
}
