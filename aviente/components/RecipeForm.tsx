'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhotoField from './PhotoField';
import { saveRecipe, softDeleteRecipe, type RecipeInput } from '@/lib/mutations';
import { CATEGORIES, type Recipe, type Unit } from '@/lib/constants';
import styles from './RecipeForm.module.css';

/* §3.4 — everything inline, EXPLICIT SAVE. No autosave: on a kitchen connection
 * it races with itself, produces a "saved ✓" that can lie, and has no defined
 * offline behaviour. A Save button with a dirty guard removes all three at once.
 */

const UNITS: (Unit | '')[] = ['', 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'pcs', 'pinch', 'to taste'];

type Row = { key: string; name: string; amount: string; amountMax: string; unit: string; note: string };
type StepRow = { key: string; heading: string; body: string };

const uid = () => crypto.randomUUID();
const num = (s: string) => { const n = Number(s.replace(',', '.')); return s.trim() && isFinite(n) ? n : null; };

export default function RecipeForm({
  recipe, members,
}: {
  recipe: Recipe | null;
  members: { id: string; name: string }[];
}) {
  const router = useRouter();

  const [title, setTitle] = useState(recipe?.title ?? '');
  const [titleEn, setTitleEn] = useState(recipe?.title_en ?? '');
  const [category, setCategory] = useState(recipe?.category ?? 'mains');
  const [mealType, setMealType] = useState(recipe?.meal_type ?? '');
  const [photo, setPhoto] = useState<string | null>(recipe?.photo_url ?? null);
  const [servings, setServings] = useState(recipe?.servings ? String(recipe.servings) : '');
  const [yieldText, setYieldText] = useState(recipe?.yield_text ?? '');
  const [prep, setPrep] = useState(recipe?.prep_minutes ? String(recipe.prep_minutes) : '');
  const [cook, setCook] = useState(recipe?.cook_minutes ? String(recipe.cook_minutes) : '');
  const [source, setSource] = useState(recipe?.source_member_id ?? '');
  const [story, setStory] = useState(recipe?.story ?? '');
  const [serveWith, setServeWith] = useState(recipe?.serving_suggestions ?? '');
  const [descHe, setDescHe] = useState(recipe?.description_he ?? '');
  const [descEn, setDescEn] = useState(recipe?.description_en ?? '');
  const [lang, setLang] = useState<'he' | 'en'>('he');

  const [rows, setRows] = useState<Row[]>(
    recipe?.ingredients.map((i) => ({
      key: i.id, name: i.name,
      amount: i.amount == null ? '' : String(i.amount),
      amountMax: i.amount_max == null ? '' : String(i.amount_max),
      unit: i.unit ?? '', note: i.note ?? '',
    })) ?? [{ key: uid(), name: '', amount: '', amountMax: '', unit: '', note: '' }],
  );
  const [steps, setSteps] = useState<StepRow[]>(
    recipe?.steps.map((s) => ({ key: s.id, heading: s.heading ?? '', body: s.body })) ??
      [{ key: uid(), heading: '', body: '' }],
  );

  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* The dirty guard. Without it, a mistyped back-swipe on a phone silently
     discards an evening of typing. */
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const touch = <T,>(setter: (v: T) => void) => (v: T) => { setDirty(true); setter(v); };

  /* Reordering with buttons, not just drag: §3.4 requires a keyboard path, and
     drag-only reordering is unusable for anyone not using a mouse. */
  function move<T>(list: T[], from: number, to: number): T[] {
    if (to < 0 || to >= list.length) return list;
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  }

  async function onSave() {
    setBusy(true); setError(null);
    try {
      const input: RecipeInput = {
        id: recipe?.id,
        title, title_en: titleEn || null, category,
        meal_type: mealType || null,
        description_he: descHe || null, description_en: descEn || null,
        story: story || null, serving_suggestions: serveWith || null,
        prep_minutes: num(prep), cook_minutes: num(cook),
        servings: num(servings), yield_text: yieldText || null,
        source_member_id: source || null, photo_url: photo,
        ingredients: rows
          .filter((r) => r.name.trim())
          .map((r) => ({
            name: r.name.trim(),
            amount: num(r.amount),
            amount_max: num(r.amountMax),
            unit: (r.unit || null) as Unit | null,
            note: r.note.trim() || null,
          })),
        steps: steps
          .filter((s) => s.body.trim())
          .map((s) => ({ heading: s.heading.trim() || null, body: s.body.trim() })),
      };
      if (!input.title.trim()) throw new Error('A recipe needs a name.');
      if (!input.servings && !input.yield_text) {
        throw new Error('Give either a number of servings or what it makes (e.g. "1 litre").');
      }
      const id = await saveRecipe(input);
      setDirty(false);
      router.push(`/recipes/${category}/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!recipe) return;
    if (!confirm(`Delete "${recipe.title}"? It can be restored afterwards.`)) return;
    setBusy(true);
    try {
      await softDeleteRecipe(recipe.id);
      setDirty(false);
      router.push(`/recipes/${recipe.category}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete.');
      setBusy(false);
    }
  }

  return (
    <div className={styles.form}>
      <header className={styles.bar}>
        <span className={styles.editing}>Editing{dirty ? ' · unsaved' : ''}</span>
        <div className={styles.barActions}>
          <button type="button" className="btn btn--ghost" disabled={busy}
            onClick={() => (dirty && !confirm('Discard your changes?') ? null : router.back())}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={onSave} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <PhotoField value={photo} onChange={touch(setPhoto)} />

      <label className={styles.field}>
        <span className={styles.label}>Name</span>
        <input className={styles.input} value={title} lang="he"
          onChange={(e) => touch(setTitle)(e.target.value)} />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Name in Latin letters</span>
        <input className={styles.input} value={titleEn} placeholder="Khaluz"
          onChange={(e) => touch(setTitleEn)(e.target.value)} />
      </label>

      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>Category</span>
          <select className={styles.input} value={category}
            onChange={(e) => touch(setCategory)(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.fr}</option>)}
          </select>
        </label>

        {/* Meal type appears only for kids recipes — it is meaningless elsewhere
            and the DB constraint rejects it. */}
        {category === 'kids' && (
          <label className={styles.field}>
            <span className={styles.label}>Meal</span>
            <select className={styles.input} value={mealType}
              onChange={(e) => touch(setMealType)(e.target.value)}>
              <option value="">—</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
          </label>
        )}
      </div>

      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>Serves</span>
          <input className={styles.input} inputMode="numeric" value={servings}
            onChange={(e) => touch(setServings)(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>…or makes</span>
          <input className={styles.input} value={yieldText} lang="he"
            placeholder="כ-1 ליטר" disabled={!!servings.trim()}
            onChange={(e) => touch(setYieldText)(e.target.value)} />
        </label>
      </div>

      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>Prep (min)</span>
          <input className={styles.input} inputMode="numeric" value={prep}
            onChange={(e) => touch(setPrep)(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Cook (min)</span>
          <input className={styles.input} inputMode="numeric" value={cook}
            onChange={(e) => touch(setCook)(e.target.value)} />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Whose recipe</span>
        <select className={styles.input} value={source}
          onChange={(e) => touch(setSource)(e.target.value)}>
          <option value="">—</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>

      {/* ── ingredients ─────────────────────────────────────────────────── */}
      <section>
        <h2 className={styles.h2}>Ingredients</h2>
        <ul className={styles.rows}>
          {rows.map((r, i) => (
            <li key={r.key} className={styles.row}>
              <div className={styles.handle}>
                <button type="button" aria-label="Move up" className={styles.move}
                  onClick={() => touch(setRows)(move(rows, i, i - 1))}>↑</button>
                <button type="button" aria-label="Move down" className={styles.move}
                  onClick={() => touch(setRows)(move(rows, i, i + 1))}>↓</button>
              </div>
              <div className={styles.rowFields}>
                <input className={styles.input} placeholder="ingredient" value={r.name} lang="he"
                  onChange={(e) => touch(setRows)(rows.map((x) => x.key === r.key ? { ...x, name: e.target.value } : x))} />
                <div className={styles.amounts}>
                  <input className={styles.small} inputMode="decimal" placeholder="amt" value={r.amount}
                    onChange={(e) => touch(setRows)(rows.map((x) => x.key === r.key ? { ...x, amount: e.target.value } : x))} />
                  <input className={styles.small} inputMode="decimal" placeholder="–max" value={r.amountMax}
                    onChange={(e) => touch(setRows)(rows.map((x) => x.key === r.key ? { ...x, amountMax: e.target.value } : x))} />
                  <select className={styles.small} value={r.unit}
                    onChange={(e) => touch(setRows)(rows.map((x) => x.key === r.key ? { ...x, unit: e.target.value } : x))}>
                    {UNITS.map((u) => <option key={u} value={u}>{u || '—'}</option>)}
                  </select>
                </div>
                <input className={styles.input} placeholder="note (optional)" value={r.note} lang="he"
                  onChange={(e) => touch(setRows)(rows.map((x) => x.key === r.key ? { ...x, note: e.target.value } : x))} />
              </div>
              <button type="button" aria-label="Remove ingredient" className={styles.del}
                onClick={() => touch(setRows)(rows.filter((x) => x.key !== r.key))}>✕</button>
            </li>
          ))}
        </ul>
        <button type="button" className={styles.add}
          onClick={() => touch(setRows)([...rows, { key: uid(), name: '', amount: '', amountMax: '', unit: '', note: '' }])}>
          ＋ Add ingredient
        </button>
      </section>

      {/* ── steps ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className={styles.h2}>Steps</h2>
        <ol className={styles.rows}>
          {steps.map((s, i) => (
            <li key={s.key} className={styles.row}>
              <div className={styles.handle}>
                <button type="button" aria-label="Move up" className={styles.move}
                  onClick={() => touch(setSteps)(move(steps, i, i - 1))}>↑</button>
                <button type="button" aria-label="Move down" className={styles.move}
                  onClick={() => touch(setSteps)(move(steps, i, i + 1))}>↓</button>
              </div>
              <div className={styles.rowFields}>
                <input className={styles.input} placeholder="heading (optional)" value={s.heading} lang="he"
                  onChange={(e) => touch(setSteps)(steps.map((x) => x.key === s.key ? { ...x, heading: e.target.value } : x))} />
                <textarea className={styles.area} rows={3} placeholder="what to do" value={s.body} lang="he"
                  onChange={(e) => touch(setSteps)(steps.map((x) => x.key === s.key ? { ...x, body: e.target.value } : x))} />
              </div>
              <button type="button" aria-label="Remove step" className={styles.del}
                onClick={() => touch(setSteps)(steps.filter((x) => x.key !== s.key))}>✕</button>
            </li>
          ))}
        </ol>
        <button type="button" className={styles.add}
          onClick={() => touch(setSteps)([...steps, { key: uid(), heading: '', body: '' }])}>
          ＋ Add step
        </button>
      </section>

      {/* ── the menu-card description, per language ─────────────────────── */}
      <section>
        <h2 className={styles.h2}>Menu card description</h2>
        <div className={styles.tabs}>
          <button type="button" className={lang === 'he' ? styles.tabOn : styles.tab}
            onClick={() => setLang('he')}>עב</button>
          <button type="button" className={lang === 'en' ? styles.tabOn : styles.tab}
            onClick={() => setLang('en')}>EN</button>
        </div>
        {lang === 'he'
          ? <textarea className={styles.area} rows={2} value={descHe} lang="he"
              onChange={(e) => touch(setDescHe)(e.target.value)} />
          : <textarea className={styles.area} rows={2} value={descEn}
              onChange={(e) => touch(setDescEn)(e.target.value)} />}
      </section>

      <label className={styles.field}>
        <span className={styles.label}>Story / notes</span>
        <textarea className={styles.area} rows={3} value={story} lang="he"
          onChange={(e) => touch(setStory)(e.target.value)} />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>To serve — one per line</span>
        <textarea className={styles.area} rows={3} value={serveWith} lang="he"
          onChange={(e) => touch(setServeWith)(e.target.value)} />
      </label>

      {recipe && (
        <button type="button" className={styles.delete} onClick={onDelete} disabled={busy}>
          Delete this recipe
        </button>
      )}
    </div>
  );
}
