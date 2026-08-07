'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { importRecipes, undoImport, type ImportResult } from '@/lib/importMutations';
import { normalizeDocument, parsePastedJson } from '@/lib/recipeParse.mjs';
import { categoryLabel, CATEGORIES } from '@/lib/constants';
import type { RecipeInput } from '@/lib/mutations';
import styles from './ImportPaste.module.css';

type ParsedIngredient = {
  name: string; amount?: number | null; amountMax?: number | null;
  unit?: string | null; note?: string | null;
};
type ParsedStep = { heading?: string | null; body?: string };

/* §3.9 — paste what an AI made of a photograph.
 *
 * The shape is Vault-Mart's, which works: a read-only prompt you copy out, a box
 * you paste into, tolerant parsing, and a live preview before anything is
 * written. Nothing is saved until IMPORT is pressed.
 */

const PROMPT = `קרא את המתכון בתמונה והחזר JSON בלבד, בלי טקסט נוסף, במבנה הזה:

{"schemaVersion":1,"title":"שם המתכון","titleEn":"Latin name or null",
 "category":"mains|soups|salads|entrees|sides|breads|desserts|kids|other",
 "servings":6,"yieldText":null,"prepMinutes":20,"cookMinutes":40,
 "descriptionHe":"תיאור קצר לתפריט","story":null,
 "servingSuggestions":"איך להגיש",
 "ingredients":[{"name":"קמח","amount":500,"unit":"g","note":null}],
 "steps":[{"heading":null,"body":"..."}]}

unit חייב להיות אחד מ: g, kg, ml, l, cup, tbsp, tsp, pcs, pinch, to taste.
לטווח כמויות השתמש ב-amount ו-amountMax. אם אין כמות, השמט את amount.
אפשר להחזיר מערך של כמה מתכונים.`;

export default function ImportPaste({
  members,
}: { members: { id: string; name: string }[] }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  /* Parsed live as you type, so mistakes show before anything is written. */
  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    const got = parsePastedJson(text);
    if (got.error) return { error: got.error, recipes: [] as never[], errors: [] as string[] };
    return { error: null as string | null, ...normalizeDocument(got.data) };
  }, [text]);

  async function onImport() {
    if (!parsed?.recipes.length) return;
    setBusy(true);
    try {
      const inputs: RecipeInput[] = parsed.recipes.map((r, i) => ({
        title: r.title,
        title_en: r.titleEn,
        category: overrides[i] ?? r.category,
        meal_type: r.mealType,
        description_he: r.descriptionHe,
        description_en: r.descriptionEn,
        story: r.story,
        serving_suggestions: r.servingSuggestions,
        prep_minutes: r.prepMinutes,
        cook_minutes: r.cookMinutes,
        servings: r.servings,
        yield_text: r.yieldText,
        source_member_id: source || null,
        photo_url: null,
        /* recipeParse.mjs is plain JavaScript, so its output arrives loosely
           typed. Normalise at this boundary rather than asserting it is already
           exact — a missing field becomes null here instead of `undefined`
           reaching Postgres. */
        ingredients: (r.ingredients as ParsedIngredient[]).map((i) => ({
          name: i.name,
          amount: i.amount ?? null,
          amount_max: i.amountMax ?? null,
          unit: (i.unit ?? null) as RecipeInput['ingredients'][number]['unit'],
          note: i.note ?? null,
        })),
        steps: (r.steps as ParsedStep[]).map((s) => ({
          heading: s.heading ?? null,
          body: s.body ?? '',
        })).filter((s) => s.body),
      }));
      setResult(await importRecipes(inputs));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.h1}>Imported</h1>
        <p className={styles.summary}>
          {result.imported.length} added
          {result.skipped.length > 0 && ` · ${result.skipped.length} skipped`}
          {result.failed.length > 0 && ` · ${result.failed.length} failed`}
        </p>

        {result.imported.length > 0 && (
          <ul className={styles.report}>
            {result.imported.map((r) => (
              <li key={r.id}><span className={styles.ok}>added</span> <span lang="he">{r.title}</span></li>
            ))}
          </ul>
        )}
        {/* Skips and failures are listed individually. A count alone hides which
            recipe did not make it, which is the only thing worth knowing. */}
        {result.skipped.map((r) => (
          <p key={r.title} className={styles.line}>
            <span className={styles.skip}>skipped</span> <span lang="he">{r.title}</span> — {r.why}
          </p>
        ))}
        {result.failed.map((r) => (
          <p key={r.title} className={styles.line}>
            <span className={styles.fail}>failed</span> <span lang="he">{r.title}</span> — {r.why}
          </p>
        ))}

        <div className={styles.actions}>
          <button className="btn" onClick={() => { setResult(null); setText(''); }}>
            Import more
          </button>
          <button className="btn btn--ghost" disabled={busy}
            onClick={async () => { setBusy(true); await undoImport(result.batchId); setResult(null); setText(''); setBusy(false); router.refresh(); }}>
            Undo this import
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <p className="eyebrow">Importer</p>
      <h1 className={styles.h1}>Paste from an AI</h1>

      <section className={styles.step}>
        <h2 className={styles.h2}>1 · Give this to ChatGPT or Claude</h2>
        <p className={styles.hint}>
          Photograph the recipe, attach it, and paste this underneath.
        </p>
        <textarea className={styles.prompt} readOnly rows={6} value={PROMPT} />
        <button type="button" className={styles.copy}
          onClick={async () => { await navigator.clipboard.writeText(PROMPT); setCopied(true); }}>
          {copied ? '✓ Copied' : '📋 Copy the prompt'}
        </button>
      </section>

      <section className={styles.step}>
        <h2 className={styles.h2}>2 · Paste the answer here</h2>
        <textarea className={styles.paste} rows={8} value={text} lang="he"
          placeholder={'{"schemaVersion":1,"title":"…"}'}
          onChange={(e) => setText(e.target.value)} />
      </section>

      {parsed?.error && <p className={styles.error}>{parsed.error}</p>}
      {parsed && !parsed.error && parsed.errors.length > 0 &&
        parsed.errors.map((e: string) => <p key={e} className={styles.error}>{e}</p>)}

      {parsed && !parsed.error && parsed.recipes.length > 0 && (
        <section className={styles.step}>
          <h2 className={styles.h2}>3 · Check, then import</h2>

          <label className={styles.field}>
            <span className={styles.label}>Whose recipes are these?</span>
            <select className={styles.select} value={source}
              onChange={(e) => setSource(e.target.value)}>
              <option value="">—</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>

          <ul className={styles.preview}>
            {parsed.recipes.map((r, i: number) => {
              const cat = overrides[i] ?? r.category;
              /* An unrecognised category lands in `other` and says so, with a
                 dropdown right there — never a silent misfiling. */
              const unsure = r.warnings?.some((w: string) => w.includes('category'));
              return (
                <li key={i} className={`card ${styles.row}`}>
                  <div>
                    <p className={styles.title} lang="he">{r.title}</p>
                    <p className={styles.meta}>
                      {r.ingredients.length} ingredients · {r.steps.length} steps
                      {r.servings ? ` · serves ${r.servings}` : r.yieldText ? ` · ${r.yieldText}` : ''}
                    </p>
                    {r.warnings?.map((w: string) => (
                      <p key={w} className={styles.warn}>⚠ {w}</p>
                    ))}
                  </div>
                  <select
                    className={`${styles.select} ${unsure ? styles.unsure : ''}`}
                    value={cat}
                    onChange={(e) => setOverrides({ ...overrides, [i]: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{categoryLabel(c.key).fr}</option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>

          <button className="btn" onClick={onImport} disabled={busy}>
            {busy ? 'Importing…' : `Import ${parsed.recipes.length} ${parsed.recipes.length === 1 ? 'recipe' : 'recipes'}`}
          </button>
        </section>
      )}
    </div>
  );
}
