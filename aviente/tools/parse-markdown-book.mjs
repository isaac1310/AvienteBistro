/* Convert מתכונים.md into the canonical §3.9 JSON.
 *
 *   node tools/parse-markdown-book.mjs            # dry run — prints a report
 *   node tools/parse-markdown-book.mjs --json     # emit the JSON to stdout
 *
 * Dry-run by default, like every other importer here: the report is the point,
 * because a bad rule should be visible before it reaches the database.
 *
 * Reuses lib/recipeParse.mjs for quantities, so `500 גר׳`, `½ כוס`, `¼ צרור` and
 * `3 שיניים` are handled by the same code the paste importer and the seed script
 * use — and covered by the same selftest assertions.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAmountCell, splitTitle, SCHEMA_VERSION } from '../lib/recipeParse.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(root, '../מתכונים.md');

/* The document spaces out its section headers (ר כ י ב י ם), so they are matched
   with the spaces stripped rather than literally. */
const compact = (s) => s.replace(/\s+/g, '');
const isIngredientsHeader = (l) => compact(l) === 'רכיבים';
const isStepsHeader = (l) => compact(l) === 'הוראותהכנה';
const isNotesHeader = (l) => compact(l) === 'הערות';

/* A light guess at the category from the dish name, falling back to `other`.
 *
 * The document states no category anywhere, and 22 dropdowns is a chore. These
 * patterns only fire on words that are unambiguous in a recipe title — מרק is
 * always a soup, עוגה is always a cake. Anything else becomes `other` and gets
 * flagged, so the import screen shows a dropdown rather than a silent guess.
 * A wrong guess is worse than no guess, so the list stays deliberately short. */
const CATEGORY_HINTS = [
  [/\bמרק\b/,                              'soups'],
  [/סלט/,                                    'salads'],
  [/עוגה|עוגת|קינוח|מלבי|מוס|פאי|טארט|בראוני/, 'desserts'],
  [/לחם|חלה|לחמני|פיתה|מאפה|בורקס|פוקצ/,      'breads'],
  [/פירה|אורז|תוספת|ירקות בתנור/,             'sides'],
  [/רוטב|ממרח|מטבל/,                          'other'],
];

function guessCategory(title) {
  for (const [re, key] of CATEGORY_HINTS) if (re.test(title)) return { category: key, guessed: true };
  return { category: 'other', guessed: false };
}

/** `| a | b | c |` → ['a','b','c'], or null for separator rows. */
function cells(line) {
  if (!line.trim().startsWith('|')) return null;
  const parts = line.split('|').slice(1, -1).map((c) => c.trim());
  if (parts.every((c) => /^-*$/.test(c))) return null;   // |---|---|---|
  return parts;
}

function parseRecipe(block) {
  const lines = block.split('\n');
  const rawTitle = lines[0].replace(/^#+/, '').trim();
  const { title, titleEn } = splitTitle(rawTitle);
  const { category, guessed } = guessCategory(title);

  const ingredients = [];
  const stepLines = [];
  const noteLines = [];
  let section = null;
  let group = null;          // the current **sub-group** label
  const warnings = [];

  for (const line of lines.slice(1)) {
    const bare = line.trim();
    if (!bare || bare === '---') continue;

    if (isIngredientsHeader(bare)) { section = 'ing'; continue; }
    if (isStepsHeader(bare)) { section = 'steps'; continue; }
    if (isNotesHeader(bare)) { section = 'notes'; continue; }

    if (section === 'ing') {
      const c = cells(line);
      if (!c) continue;
      const [name, amount, note] = [c[0] ?? '', c[1] ?? '', c[2] ?? ''];
      if (compact(name) === 'רכיב') continue;             // the header row

      /* A bold name with empty amount and note is a sub-group heading, not an
         ingredient: | **לרוטב** |  |  | */
      const bold = name.match(/^\*\*(.+?)\*\*$/);
      if (bold && !amount && !note) { group = bold[1].trim(); continue; }
      if (!name) continue;

      /* The table already separates quantity from name, so parse the amount cell
         alone and keep the name cell as the name. Joining them back into one
         string and re-splitting threw the structure away and mangled both —
         "500 גר׳ נטו" + "דג ים טחון" became 500 PIECES of "גר׳ נטו דג ים טחון". */
      const q = parseAmountCell(amount);
      const cleanName = name.replace(/\*\*/g, '').trim();
      if (!cleanName) continue;
      ingredients.push({
        name: cleanName,
        amount: q.amount,
        amountMax: q.amountMax,
        unit: q.unit,
        /* The notes column wins; a qualifier left over from the amount cell
           ("נטו", "או תפח״א 1") is appended rather than dropped. */
        note: [note, q.note].filter(Boolean).join(' · ') || null,
        group: group || null,
      });
      continue;
    }

    if (section === 'steps') { stepLines.push(line); continue; }
    if (section === 'notes') { noteLines.push(bare); continue; }
  }

  /* Steps: a bold lead-in starts a new step with a heading; otherwise each
     non-empty line is its own step. Markdown line-break spaces are stripped. */
  const steps = [];
  let heading = null;
  for (const raw of stepLines) {
    const line = raw.replace(/\s+$/, '').replace(/\\$/, '').trim();
    if (!line) continue;
    const head = line.match(/^\*\*(.+?)\*\*\s*:?\s*(.*)$/);
    if (head) {
      heading = head[1].trim().replace(/:$/, '');
      if (head[2]) { steps.push({ heading, body: head[2].trim() }); heading = null; }
      continue;
    }
    steps.push({ heading, body: line });
    heading = null;
  }

  if (!guessed) warnings.push('category not obvious from the name → other');
  if (!ingredients.length) warnings.push('no ingredients');
  if (!steps.length) warnings.push('no steps');
  if (ingredients.some((i) => i.amount == null && !i.unit)) {
    warnings.push(`${ingredients.filter((i) => i.amount == null && !i.unit).length} ingredient(s) with no quantity`);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    title, titleEn,
    /* Guessed where the title is unambiguous, `other` otherwise — never left
       null, so nothing can slip through uncategorised. Either way the import
       screen shows a dropdown, so a guess is a starting point, not a decision. */
    category,
    servings: null,
    yieldText: null,
    prepMinutes: null,
    cookMinutes: null,
    descriptionHe: null,
    story: noteLines.join('\n') || null,
    servingSuggestions: null,
    externalRef: `מתכונים.md#${title}`,
    categoryGuessed: guessed,
    ingredients,
    steps,
    warnings,
  };
}

/* ── run ──────────────────────────────────────────────────────────────────── */

const text = readFileSync(SOURCE, 'utf8');
const blocks = text.split(/\n(?=#\s)/).filter((b) => b.trim().startsWith('#'));

const recipes = blocks
  .map(parseRecipe)
  // The document opens with a blank template ("שם מתכון") — skip anything with
  // no ingredients AND no steps rather than importing an empty shell.
  .filter((r) => r.title && r.title !== 'שם מתכון' && (r.ingredients.length || r.steps.length));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ schemaVersion: SCHEMA_VERSION, recipes }, null, 2));
} else {
  console.log(`${'─'.repeat(74)}\n${recipes.length} recipes parsed from מתכונים.md\n`);
  const groups = recipes.filter((r) => r.ingredients.some((i) => i.group));
  console.log(`with ingredient sub-groups: ${groups.length}`);
  console.log(`total ingredients: ${recipes.reduce((a, r) => a + r.ingredients.length, 0)}`);
  console.log(`total steps:       ${recipes.reduce((a, r) => a + r.steps.length, 0)}`);
  console.log(`with notes:        ${recipes.filter((r) => r.story).length}`);
  const byCat = {};
  for (const r of recipes) byCat[r.category] = (byCat[r.category] ?? 0) + 1;
  console.log('categories:', byCat);
  console.log(`guessed from the name: ${recipes.filter((r) => r.categoryGuessed).length}`
    + ` · defaulted to other: ${recipes.filter((r) => !r.categoryGuessed).length}\n`);

  for (const r of recipes) {
    const g = [...new Set(r.ingredients.map((i) => i.group).filter(Boolean))];
    console.log(`  ${r.title}`);
    console.log(`    ${r.ingredients.length} ingredients${g.length ? ` in ${g.length} groups (${g.join(', ')})` : ''} · ${r.steps.length} steps`);
    for (const w of r.warnings) console.log(`    ⚠ ${w}`);
  }
  console.log(`\n(dry run — pass --json to emit, then paste into /import)`);
}
