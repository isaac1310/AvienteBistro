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
/* Prefix, not equality: one header reads "ר כ י ב י ם (30 יח)" and an exact match
   silently dropped all ten of that recipe's ingredients — the section never
   switched, so every table row was skipped. Found by the agent test pass. */
const isIngredientsHeader = (l) => compact(l).startsWith('רכיבים');
const isStepsHeader = (l) => compact(l).startsWith('הוראותהכנה');
const isNotesHeader = (l) => compact(l).startsWith('הערות');

/* Words the book uses as ingredient-section labels, with or without the optional
   leading ל ("for the…"). Deliberately a closed list: guessing from shape alone
   cost 116 real ingredients. */
const SECTION_WORDS =
  /^ל?(מילוי|רוטב|בצק|ציפוי|בלילה|קרם|תערובת|קציצות|סירופ|זיגוג|תבלינים|הגשה|קישוט)$/;

/** "(30 יח)" after the ingredients header is a yield, worth keeping. */
const yieldFromHeader = (l) => {
  const m = l.match(/\(([^)]+)\)/);
  return m ? m[1].trim() : null;
};

/* A light guess at the category from the dish name, falling back to `other`.
 *
 * The document states no category anywhere, and 22 dropdowns is a chore. These
 * patterns only fire on words that are unambiguous in a recipe title — מרק is
 * always a soup, עוגה is always a cake. Anything else becomes `other` and gets
 * flagged, so the import screen shows a dropdown rather than a silent guess.
 * A wrong guess is worse than no guess, so the list stays deliberately short. */
/* Order matters: first match wins, so specific beats general.
 *
 * Two traps, both hit on the first attempt:
 *
 *  - **No `\b` anywhere.** `\b` is defined against `\w` = `[A-Za-z0-9_]`, and Hebrew
 *    letters are not word characters, so `/\bמרק\b/` can never match a Hebrew title.
 *    It looked correct in the source and matched nothing, which is why five soups sat
 *    in `other` while the rule meant to catch them appeared to exist.
 *  - **Short patterns match inside longer words.** `/באו/` (bao buns) matches
 *    `באורז` — so "עוף באורז", chicken and rice, was filed as bread. Anything under
 *    four letters needs an anchor or a following space.
 *
 * A sauce is only a sauce when the title STARTS with one. "רוטב" appearing anywhere
 * hijacked every dish that merely comes with a sauce: fish patties in red sauce, and
 * yakitori in satay sauce, both became components.
 */
const CATEGORY_HINTS = [
  [/מרק|בורשט/,                                'soups'],
  // Anchored: a sauce FOR a salad is not a salad.
  [/^סלט|כבוש|חמוצים/,                          'salads'],
  [/עוגה|עוגת|קינוח|מלבי|מוס|פאי|טארט|בראוני|פלאן|נוקרל/, 'desserts'],
  [/לחם|חלה|לחמני|פיתה|מאפה|בורקס|פוקצ|גזלמה|באו\s/,      'breads'],
  /* Proteins outrank both sauces and starches: "in red sauce" must not beat "fish
     patties", and "עוף באורז" is a chicken dish, not a rice one. */
  [/עוף|בשר|אסאדו|סלמון|דג|קציצות|ממולא|קרפעלך|יקיטורי|אושפלאו|סופריטו|פרגיות/, 'mains'],
  [/פירה|אורז|תוספת|ירקות בתנור|אטריות/,        'sides'],
  // Components, and only when the title leads with one.
  [/^רוטב|^ממרח|^מטבל|^בלילה|^חלוז/,            'other'],
];

function guessCategory(title) {
  for (const [re, key] of CATEGORY_HINTS) if (re.test(title)) return { category: key, guessed: true };
  return { category: 'other', guessed: false };
}

/** `| a | b | c |` → ['a','b','c'], or null for separator rows. */
function cells(line) {
  if (!line.trim().startsWith('|')) return null;
  const parts = line.split('|').slice(1, -1).map((c) => c.trim());
  /* Alignment colons count. The old test was /^-*$/, which matched `|---|---|` but
     not `| :---: | :---: |` — so a centred table's alignment row arrived as an
     ingredient literally named ":---:". Requiring at least one dash also stops an
     all-empty row being read as a separator. */
  if (parts.every((c) => /^:?-+:?$/.test(c))) return null;
  return parts;
}

/* ── repeated ingredient tables ────────────────────────────────────────────
 * מתכונים.md re-prints ingredient tables under the wrong headings, in both
 * directions and at both ends:
 *   `# סלט בורגול`   own table FIRST,  then copies of סלמון and רוטב בוטנים
 *   `# מרק כתום`     a copy of פירה's FIRST, own table SECOND
 *   `# אסאדו ביין`   a copy of סופריטו, which appears 68 lines LATER
 *   `# עוף באורז`    its own table, twice
 * so neither "the first table is the real one" nor "later tables are repeats"
 * holds. Both were tried; the first silently cut מרק כתום from 15 ingredients to 4.
 *
 * What decides ownership instead is corroboration. A recipe's own steps talk about
 * its own ingredients: סלט בורגול's method mentions בורגול, מרק כתום's mentions
 * דלעת. So a table printed under several headings is awarded to the recipe whose
 * title and method mention the most of it, and dropped from the others.
 *
 * A table that appears under exactly one heading is never touched, and one that no
 * candidate corroborates is kept everywhere and flagged. Nothing is deleted on a
 * guess — the failure mode has to be a warning, because there is one database and it
 * holds the family's only copy of these recipes.
 */

const signature = (rows) => rows.map((r) => r.name).join('|');

const tablesOf = (ingredients) => {
  const by = new Map();
  for (const i of ingredients) {
    if (!by.has(i._table)) by.set(i._table, []);
    by.get(i._table).push(i);
  }
  return [...by.entries()].sort((a, b) => a[0] - b[0]);
};

/* Hebrew has no stemming worth the name here, so match on the longest word of each
   ingredient and allow the one-letter prefixes that turn a noun into "the/with/from
   the noun" — בורגול / הבורגול / לבורגול all have to count. */
const keyword = (name) => name.replace(/[^\u0590-\u05FF\s]/g, ' ').trim()
  .split(/\s+/).sort((a, b) => b.length - a.length)[0] ?? '';

function corroboration(rows, recipe) {
  const steps = recipe.steps.map((s) => `${s.heading ?? ''} ${s.body}`).join(' ');
  let hits = 0;
  for (const r of rows) {
    const k = keyword(r.name);
    if (k.length < 3) continue;
    const re = new RegExp(`[\\u0590-\\u05FF]?${k}`);
    /* The title counts for three. "רוטב בוטנים" naming its own peanut butter is far
       stronger evidence than another recipe's method happening to say "אורז" — and
       weighting them equally handed the peanut sauce to the rice dish on 2 hits
       against 1. */
    if (re.test(recipe.title)) hits += 3;
    if (re.test(steps)) hits += 1;
  }
  return hits;
}

function reconcileTables(recipes) {
  /* Who prints each table, and how convincingly. */
  const holders = new Map();   // signature → [{ recipe, index, rows }]
  for (const recipe of recipes) {
    for (const [index, rows] of tablesOf(recipe.ingredients)) {
      const sig = signature(rows);
      if (!holders.has(sig)) holders.set(sig, []);
      holders.get(sig).push({ recipe, index, rows });
    }
  }

  const drop = new Set();      // `${title}#${tableIndex}`
  for (const [sig, claims] of holders) {
    if (claims.length < 2) continue;

    /* The same table twice under one heading is a straight repeat: keep the first. */
    const byRecipe = new Map();
    for (const c of claims) {
      if (byRecipe.has(c.recipe.title)) {
        drop.add(`${c.recipe.title}#${c.index}`);
        c.recipe.warnings.push(`dropped ingredient table ${c.index}: it repeats this `
          + `recipe's own table (${c.rows.length} rows)`);
      } else byRecipe.set(c.recipe.title, c);
    }

    const contenders = [...byRecipe.values()];
    if (contenders.length < 2) continue;

    const scored = contenders.map((c) => ({ ...c, score: corroboration(c.rows, c.recipe) }));
    const best = Math.max(...scored.map((c) => c.score));
    const winners = scored.filter((c) => c.score === best);

    if (best === 0 || winners.length > 1) {
      for (const c of scored) {
        c.recipe.warnings.push(`ingredient table ${c.index} (${c.rows.length} rows) also `
          + `appears under ${scored.filter((o) => o !== c).map((o) => `"${o.recipe.title}"`).join(', ')}`
          + ` and the method does not settle which — kept, needs a look`);
      }
      continue;
    }

    const owner = winners[0];
    const tableCount = new Map(recipes.map((r) => [r.title, tablesOf(r.ingredients).length]));
    for (const c of scored) {
      if (c === owner) continue;
      /* Never take a recipe's only table. Scoring is a heuristic over short Hebrew
         methods, and it got this wrong: it awarded רוטב בוטנים's eleven rows — the
         whole of a recipe literally called "peanut sauce" — to a rice dish, leaving
         the sauce with nothing. A recipe printing one table is printing its own. */
      if ((tableCount.get(c.recipe.title) ?? 1) < 2) {
        c.recipe.warnings.push(`ingredient table ${c.index} also appears under `
          + `"${owner.recipe.title}", but it is this recipe's only table — kept`);
        continue;
      }
      drop.add(`${c.recipe.title}#${c.index}`);
      c.recipe.warnings.push(`dropped ingredient table ${c.index}: ${c.rows.length} rows that `
        + `belong to "${owner.recipe.title}", whose method mentions ${owner.score} of them `
        + `against ${c.score} here`);
    }
  }

  for (const recipe of recipes) {
    const kept = [];
    let n = 0;
    for (const [index, rows] of tablesOf(recipe.ingredients)) {
      if (drop.has(`${recipe.title}#${index}`)) continue;
      n += 1;
      /* Only label an extra table once it is certain it is being kept — labelling
         during the scan named groups that were then thrown away. */
      if (n > 1) rows.forEach((r) => { r.group = r.group ?? `טבלה ${n}`; });
      kept.push(...rows);
    }
    recipe.ingredients = kept;
    for (const r of kept) delete r._table;
  }
  return recipes;
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
  let group = null;          // the current sub-group label
  let tables = 0;            // ingredient tables seen under this one title
  let yieldText = null;
  const warnings = [];

  for (const line of lines.slice(1)) {
    const bare = line.trim();
    if (!bare || bare === '---') continue;

    if (isIngredientsHeader(bare)) {
      section = 'ing';
      yieldText = yieldText ?? yieldFromHeader(bare);
      continue;
    }
    if (isStepsHeader(bare)) { section = 'steps'; continue; }
    if (isNotesHeader(bare)) { section = 'notes'; continue; }

    if (section === 'ing') {
      const c = cells(line);
      if (!c) continue;
      const [name, amount, note] = [c[0] ?? '', c[1] ?? '', c[2] ?? ''];
      if (compact(name) === 'רכיב') {
        /* A second header row means a second table under the same title, with no
           label between them. Judged after the whole recipe is read — see
           dropDuplicateTables. */
        tables += 1;
        group = null;
        continue;
      }

      /* Sub-group headings. Bold is the reliable signal; the book also writes
         some plainly ("| מילוי |  |  |").
         But "empty amount and note" alone is NOT enough — plenty of real
         ingredients have no quantity ("עגבניות שרי", "פלפל שחור"), and treating
         those as headings silently swallowed 116 of 348 ingredients. So a plain
         row must ALSO be one of the words the book actually uses as a section. */
      const bold = name.match(/^\*\*(.+?)\*\*$/);
      const plain = name.trim();
      const looksLikeSection = SECTION_WORDS.test(plain);
      if (!amount && !note && (bold || looksLikeSection)) {
        group = (bold ? bold[1] : plain).trim();
        continue;
      }
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
        _table: tables,
      });
      continue;
    }

    if (section === 'steps') { stepLines.push(line); continue; }
    if (section === 'notes') { noteLines.push(bare); continue; }
  }

  /* Extra unlabelled tables are judged in a second pass — see reconcileTables.
     Each row still carries _table until then. */

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
    yieldText,
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

const recipes = reconcileTables(
  blocks
    .map(parseRecipe)
    // The document opens with a blank template ("שם מתכון") — skip anything with
    // no ingredients AND no steps rather than importing an empty shell.
    .filter((r) => r.title && r.title !== 'שם מתכון' && (r.ingredients.length || r.steps.length)),
);

/* Only the recipes a repair changed. The whole book cannot be re-imported with
   Replace without also overwriting categories and titles fixed by hand since the
   first import, so this narrows it to the ones with a dropped table. */
if (process.argv.includes('--json-repairs')) {
  const repaired = recipes.filter((r) => r.warnings.some((w) => w.startsWith('dropped ingredient table')));
  console.log(JSON.stringify({ schemaVersion: SCHEMA_VERSION, recipes: repaired }, null, 2));
  process.exit(0);
}

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
