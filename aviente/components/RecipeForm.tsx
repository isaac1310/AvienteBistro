'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import MovePhoto from './MovePhoto';
import PhotoField from './PhotoField';
import BusyButton from './BusyButton';
import { useT } from './LangProvider';
import { saveRecipe, softDeleteRecipe, type RecipeInput } from '@/lib/mutations';
import { CATEGORIES, type Recipe, type Unit } from '@/lib/constants';
/* The parts rules live in lib/ so the selftest can exercise them directly — two
   bugs have shipped from them, and neither was reachable from a read-only suite
   while they sat inside this component. */
import {
  type Row, groupRuns, renameRun, undraftRun, blankRow as newRow, addToRun,
  move, moveIngredient, moveIngredientToRun, runKeyOf,
} from '@/lib/parts';
import styles from './RecipeForm.module.css';

/* §3.4 — everything inline, EXPLICIT SAVE. No autosave: on a kitchen connection
 * it races with itself, produces a "saved ✓" that can lie, and has no defined
 * offline behaviour. A Save button with a dirty guard removes all three at once.
 */

const UNITS: (Unit | '')[] = ['', 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'pcs', 'pinch', 'to taste'];

type StepRow = { key: string; heading: string; body: string };

const uid = () => crypto.randomUUID();
const num = (s: string) => { const n = Number(s.replace(',', '.')); return s.trim() && isFinite(n) ? n : null; };

export default function RecipeForm({
  recipe, members,
}: {
  recipe: Recipe | null;
  members: { id: string; name: string }[];
}) {
  const t = useT();
  const router = useRouter();

  const [title, setTitle] = useState(recipe?.title ?? '');
  const [titleEn, setTitleEn] = useState(recipe?.title_en ?? '');
  const [category, setCategory] = useState(recipe?.category ?? 'mains');
  const [mealType, setMealType] = useState(recipe?.meal_type ?? '');
  /* The stored path. `recipe.photo_url` is the signed URL the server made for this
     render, and is only good for the preview. */
  const [photo, setPhoto] = useState<string | null>(recipe?.photo_path ?? null);
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

  /* `?? ` was not enough, and the difference crashed the page. A recipe with no
     ingredients has `ingredients: []`, not undefined — so `.map()` returned an empty
     array, `??` never fired, and `rows` was empty. groupRuns then produced its
     one-empty-run fallback, whose `rows[0]` does not exist, and the JSX reads
     `run.rows[0].key`. The whole edit form threw: "This page couldn't load", on both
     the dev server and the production build.
     Found with a fixture recipe created with no ingredients — the state you are in
     when you want to ADD some, which is exactly when this form has to work. The bug
     predates the parts rewrite (git log -S on that expression). `.length` is the
     check, not nullishness. */
  const [rows, setRows] = useState<Row[]>(
    recipe?.ingredients.length
      ? recipe.ingredients.map((i) => ({
        key: i.id, name: i.name,
        amount: i.amount == null ? '' : String(i.amount),
        amountMax: i.amount_max == null ? '' : String(i.amount_max),
        unit: i.unit ?? '', note: i.note ?? '', group: i.group_label ?? '',
      }))
      : [newRow(uid())],
  );

  /**
   * Runs whose heading is being typed, keyed by the run's first row.
   *
   * Editor state, never data: a part that exists only because someone pressed "name
   * this part" has no label yet, and `group_label = ''` cannot represent that —
   * groupRuns collapses blank to the unnamed run, which is the whole reason the old
   * fix of passing '' was a no-op. So "unnamed" and "being named" are two states
   * here, and only here. Nothing reaches a row until a character is typed, and
   * nothing about the saved shape changes.
   */
  const [drafting, setDrafting] = useState<Set<string>>(new Set());

  /**
   * The run key whose heading input should take focus on its next appearance.
   *
   * A ref, not state: focusing is a one-shot consequence of "a part was just
   * created", and the moment it is honoured it must stop being true. Held in
   * `drafting` instead, it was true for as long as the heading was being typed, so
   * the heading grabbed focus back on every keystroke anywhere in the form —
   * type one character into an ingredient, land in the part name.
   */
  const pendingFocus = useRef<string | null>(null);

  /** The row currently lifted by a drag, or null. */
  const [dragKey, setDragKey] = useState<string | null>(null);
  /** Where it would land: a row key, or a run's label for a drop onto a heading. */
  const [dropOn, setDropOn] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepRow[]>(
    recipe?.steps.map((s) => ({ key: s.id, heading: s.heading ?? '', body: s.body })) ??
      [{ key: uid(), heading: '', body: '' }],
  );

  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  /* True while PhotoField is uploading. Saving mid-upload is how a photo gets lost. */
  const [photoBusy, setPhotoBusy] = useState(false);
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
        source_member_id: source || null, photo_path: photo,
        ingredients: rows
          .filter((r) => r.name.trim())
          .map((r) => ({
            name: r.name.trim(),
            amount: num(r.amount),
            amount_max: num(r.amountMax),
            unit: (r.unit || null) as Unit | null,
            note: r.note.trim() || null,
            group_label: r.group.trim() || null,
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
      /* Refiling a recipe returns you to where you were WORKING, not to where the
         recipe went. Going through a category tidying things up, every move used to
         throw you into the destination category and leave you to navigate back — and
         `category` here is the form's NEW value, so it was the wrong list twice over.
         The delete path has always used `recipe.category`, the untouched prop; this
         borrows it. A new recipe has no origin, so it still opens. */
      const moved = recipe && category !== recipe.category;
      router.push(moved ? `/recipes/${recipe.category}` : `/recipes/${category}/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!recipe) return;
    if (!confirm(t('form.deleteConfirm', { title: recipe.title }))) return;
    setBusy(true);
    try {
      await softDeleteRecipe(recipe.id);
      setDirty(false);
      // ?undo= is what raises the toast on the page we land on.
      router.push(`/recipes/${recipe.category}?undo=${recipe.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete.');
      setBusy(false);
    }
  }

  return (
    <div className={styles.form}>
      <header className={styles.bar}>
        <span className={styles.editing}>
          {t('form.editing')}{dirty ? ` · ${t('form.unsaved')}` : ''}
        </span>
        <div className={styles.barActions}>
          <button type="button" className="btn btn--ghost" disabled={busy}
            onClick={() => (dirty && !confirm(t('form.discard')) ? null : router.back())}>
            {t('form.cancel')}
          </button>
          {/* photoBusy keeps Save disabled AND now shows the loader — the P0 from
              v11 was that you could save while a photograph was still uploading and
              it saved without it. Disabled with a changed label said so; the drawing
              says it while you are looking at the photo field rather than the button.
              No `done`: a successful save navigates to the recipe. */}
          <BusyButton busy={busy || photoBusy} onClick={onSave}
            busyLabel={photoBusy && !busy ? t('form.waitForPhoto') : t('form.saving')}>
            {t('form.save')}
          </BusyButton>
        </div>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {/* previewUrl is the signed URL the server minted for this render — the form
          cannot display a bucket path. It is only right while `photo` is unchanged;
          PhotoField signs its own after an upload. */}
      {/* onBusyChange is the fix for a lost photograph: Save used to be disabled on
          this form's own busy flag only, so it stayed live while a photo uploaded.
          Pressing it saved the recipe without the photo — which reads exactly like
          "I saved and the picture vanished". */}
      <PhotoField
        value={photo}
        previewUrl={photo === recipe?.photo_path ? recipe?.photo_url ?? null : null}
        onChange={touch(setPhoto)}
        onBusyChange={setPhotoBusy}
      />

      {/* Only offered once a photo exists and the recipe has been saved: moving
          needs both an id to move from and something to move. */}
      {recipe && photo && <MovePhoto recipeId={recipe.id} />}

      <label className={styles.field}>
        <span className={styles.label}>{t('form.name')}</span>
        <input className={styles.input} value={title} lang="he"
          onChange={(e) => touch(setTitle)(e.target.value)} />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{t('form.nameLatin')}</span>
        <input className={styles.input} value={titleEn} placeholder="Khaluz"
          onChange={(e) => touch(setTitleEn)(e.target.value)} />
      </label>

      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>{t('form.category')}</span>
          <select className={styles.input} value={category}
            onChange={(e) => touch(setCategory)(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.en}</option>)}
          </select>
        </label>

        {/* Meal type appears only for kids recipes — it is meaningless elsewhere
            and the DB constraint rejects it. */}
        {category === 'kids' && (
          <label className={styles.field}>
            <span className={styles.label}>{t('form.meal')}</span>
            <select className={styles.input} value={mealType}
              onChange={(e) => touch(setMealType)(e.target.value)}>
              <option value="">—</option>
              <option value="breakfast">{t('form.breakfast')}</option>
              <option value="lunch">{t('form.lunch')}</option>
              <option value="dinner">{t('form.dinner')}</option>
            </select>
          </label>
        )}
      </div>

      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>{t('form.serves')}</span>
          <input className={styles.input} inputMode="numeric" value={servings}
            onChange={(e) => touch(setServings)(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t('form.orMakes')}</span>
          <input className={styles.input} value={yieldText} lang="he"
            placeholder="כ-1 ליטר" disabled={!!servings.trim()}
            onChange={(e) => touch(setYieldText)(e.target.value)} />
        </label>
      </div>

      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>{t('form.prep')}</span>
          <input className={styles.input} inputMode="numeric" value={prep}
            onChange={(e) => touch(setPrep)(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t('form.cook')}</span>
          <input className={styles.input} inputMode="numeric" value={cook}
            onChange={(e) => touch(setCook)(e.target.value)} />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>{t('form.whose')}</span>
        <select className={styles.input} value={source}
          onChange={(e) => touch(setSource)(e.target.value)}>
          <option value="">—</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>

      {/* ── ingredients ─────────────────────────────────────────────────── */}
      {/* Sections are real here, not a field on every row.
          Each ingredient carried its own "part of…" text box, so "לקציצות" was
          retyped on all nine of its rows, the box had no label once it held a value
          (you could not tell what it was), and renaming a part meant editing every
          row that belonged to it. A part is a property of a RUN of ingredients.
          The stored shape is unchanged — group_label still lives on each row — so
          this is a change of interface, not of data: the header writes itself down
          to the rows underneath it. */}
      <section>
        <h2 className={styles.h2}>{t('form.ingredients')}</h2>

        {groupRuns(rows).map((run) => (
          <div
            key={runKeyOf(run)}
            className={`${styles.part} ${dropOn === `run:${run.group}` ? styles.partDrop : ''}`}
            /* Dropping onto the HEADING sends the row to the end of that part — the
               one gesture ↑↓ cannot express, because stepping a row into a part means
               passing through it. An EMPTY part cannot be a target: runs are derived
               from rows, so a part with nothing in it does not exist on screen. */
            onDragOver={(e) => {
              if (!dragKey) return;
              e.preventDefault();
              setDropOn(`run:${run.group}`);
            }}
            onDrop={(e) => {
              if (!dragKey) return;
              e.preventDefault();
              touch(setRows)(moveIngredientToRun(rows, dragKey, run.group));
              setDragKey(null); setDropOn(null);
            }}
          >
            {run.group === null && !drafting.has(runKeyOf(run)) ? (
              /* The unnamed run at the top: most recipes are only this. Offer the
                 name rather than demanding it. */
              /* This used to write the literal 'לקציצות' into every row of the run —
                 a real label, in real data, from a button press. Passing '' instead
                 does nothing at all: groupRuns coerces blank to null, so the run
                 stays unnamed and the input never appears. Empty and unnamed have to
                 be different states, and only in the FORM — so a DRAFTING set holds
                 the runs whose heading is being typed. Nothing is written to a row
                 until a character is. */
              <button type="button" className={styles.nameSection}
                onClick={() => {
                  const runKey = runKeyOf(run);
                  pendingFocus.current = runKey;
                  setDrafting(new Set(drafting).add(runKey));
                }}>
                {t('form.nameThisPart')}
              </button>
            ) : (
              <div className={styles.partHead}>
                <label className={styles.partLabel}>
                  <span className={styles.label}>{t('form.part')}</span>
                  <input
                    className={styles.input} value={run.group ?? ''} lang="he"
                    placeholder={t('form.partPlaceholder')}
                    aria-label={t('form.partName')}
                    /* Focused on arrival, so naming a part is one action — ONCE.
                       This used to focus whenever the run was in `drafting`, which
                       stole focus on every keystroke anywhere in the form: an inline
                       ref is a new function each render, so React re-attaches it on
                       every render, every render re-ran the condition, and `drafting`
                       stays set for as long as the heading is being typed. Typing one
                       character into an ingredient jumped the caret up to the part
                       heading. The request to focus is a ONE-SHOT EVENT — a part was
                       just created — not a property of the drafting state, so it is
                       held in a ref and consumed here. */
                    ref={(el) => {
                      const runKey = runKeyOf(run);
                      if (el && pendingFocus.current === runKey) {
                        pendingFocus.current = null;
                        el.focus();
                      }
                    }}
                    /* Renames every row in the run at once — the point of the
                       change. */
                    onChange={(e) => touch(setRows)(renameRun(rows, run, e.target.value))}
                    /* Left empty, it was never a part. Drop back to the offer rather
                       than leaving a nameless heading on screen.
                       Either way the part has stopped being CREATED, so the draft
                       break is released here and not one keystroke earlier: released
                       on change, deleting back to an empty name would collapse the
                       section out from under the caret; kept forever, two parts typed
                       with the same name would stay two boxes in the editor while the
                       recipe page rendered them as one heading. */
                    onBlur={(e) => {
                      const runKey = runKeyOf(run);
                      if (e.target.value.trim() === '') {
                        const next = new Set(drafting);
                        next.delete(runKey);
                        setDrafting(next);
                      }
                      if (run.rows.some((r) => r.draft)) touch(setRows)(undraftRun(rows, run));
                    }}
                  />
                </label>
                <button type="button" className={styles.unname}
                  aria-label={t('form.removeHeadingLabel')}
                  onClick={() => {
                    const next = new Set(drafting);
                    next.delete(runKeyOf(run));
                    setDrafting(next);
                    /* Clears the label AND the draft break, so the rows merge back
                       into the run above instead of leaving an unnamed box behind. */
                    touch(setRows)(undraftRun(renameRun(rows, run, ''), run));
                  }}>
                  {t('form.removeHeading')}
                </button>
              </div>
            )}

            <ul className={styles.rows}>
              {run.rows.map((r) => {
                const i = rows.findIndex((x) => x.key === r.key);
                return (
                  <li
                    key={r.key}
                    className={[
                      styles.row,
                      dragKey === r.key ? styles.rowLifted : '',
                      dropOn === r.key ? styles.rowDropTarget : '',
                    ].filter(Boolean).join(' ')}
                    /* The LI is draggable, not the inputs: a draggable input cannot
                       be selected with the mouse, so the handle below is what starts
                       a drag and the fields stay ordinary fields. */
                    onDragOver={(e) => {
                      if (!dragKey || dragKey === r.key) return;
                      e.preventDefault();
                      /* stopPropagation, or the run wrapper underneath also claims
                         the drop and "between two rows" becomes "end of the part". */
                      e.stopPropagation();
                      setDropOn(r.key);
                    }}
                    onDrop={(e) => {
                      if (!dragKey || dragKey === r.key) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const from = rows.findIndex((x) => x.key === dragKey);
                      touch(setRows)(moveIngredient(rows, from, i));
                      setDragKey(null); setDropOn(null);
                    }}
                  >
                    <div
                      className={styles.handle}
                      draggable
                      onDragStart={(e) => {
                        setDragKey(r.key);
                        /* Firefox refuses to start a drag with no payload. */
                        e.dataTransfer.setData('text/plain', r.key);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => { setDragKey(null); setDropOn(null); }}
                    >
                      {/* Both paths go through moveIngredient, so a row dragged into
                          a part and a row stepped into it with ↑↓ end up with the
                          same label. Two mechanisms, one invariant. The buttons stay
                          the guaranteed path: native drag does not fire on touch, and
                          §3.4 requires a keyboard route regardless. */}
                      <button type="button" aria-label={t('form.moveUp')} className={styles.move}
                        onClick={() => touch(setRows)(moveIngredient(rows, i, i - 1))}>↑</button>
                      <button type="button" aria-label={t('form.moveDown')} className={styles.move}
                        onClick={() => touch(setRows)(moveIngredient(rows, i, i + 1))}>↓</button>
                    </div>
                    <div className={styles.rowFields}>
                      <input className={styles.input} placeholder={t('form.ingredient')} value={r.name} lang="he"
                        onChange={(e) => touch(setRows)(rows.map((x) => x.key === r.key ? { ...x, name: e.target.value } : x))} />
                      <div className={styles.amounts}>
                        <input className={styles.small} inputMode="decimal" placeholder={t('form.amt')} value={r.amount}
                          onChange={(e) => touch(setRows)(rows.map((x) => x.key === r.key ? { ...x, amount: e.target.value } : x))} />
                        <input className={styles.small} inputMode="decimal" placeholder={t('form.max')} value={r.amountMax}
                          onChange={(e) => touch(setRows)(rows.map((x) => x.key === r.key ? { ...x, amountMax: e.target.value } : x))} />
                        <select className={styles.small} value={r.unit}
                          onChange={(e) => touch(setRows)(rows.map((x) => x.key === r.key ? { ...x, unit: e.target.value } : x))}>
                          {UNITS.map((u) => <option key={u} value={u}>{u || '—'}</option>)}
                        </select>
                      </div>
                      <input className={styles.input} placeholder={t('form.note')} value={r.note} lang="he"
                        onChange={(e) => touch(setRows)(rows.map((x) => x.key === r.key ? { ...x, note: e.target.value } : x))} />
                    </div>
                    <button type="button" aria-label={t('form.removeIngredient')} className={styles.del}
                      onClick={() => touch(setRows)(rows.filter((x) => x.key !== r.key))}>✕</button>
                  </li>
                );
              })}
            </ul>

            {/* Adds INTO this part, inheriting its name, so a section can be filled
                without touching a heading field at all. */}
            <button type="button" className={styles.add}
              onClick={() => touch(setRows)(addToRun(rows, run, uid()))}>
              {run.group ? t('form.addIngredientTo', { part: run.group }) : t('form.addIngredient')}
            </button>
          </div>
        ))}

        {/* A new part, at the end. This is what did not exist: there was no way to
            say "and now the sauce" without knowing to retype a label per row. */}
        {/* A new part starts with one blank row and NO label — the label is typed
            into the heading that appears. It used to arrive stamped 'לרוטב', a real
            Hebrew word written into real data by a button press, on an app whose
            interface might be in English. The row is added and its run is put
            straight into drafting, so the heading input is on screen and focused. */}
        <button type="button" className={styles.addPart}
          onClick={() => {
            const key = uid();
            touch(setRows)([...rows, {
              key, name: '', amount: '', amountMax: '', unit: '', note: '', group: '',
              /* Starts its own section immediately, even though it has no label yet. */
              draft: true,
            }]);
            pendingFocus.current = key;
            setDrafting(new Set(drafting).add(key));
          }}>
          {t('form.addPart')}
        </button>
      </section>

      {/* ── steps ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className={styles.h2}>{t('form.steps')}</h2>
        <ol className={styles.rows}>
          {steps.map((s, i) => (
            <li key={s.key} className={styles.row}>
              <div className={styles.handle}>
                <button type="button" aria-label={t('form.moveUp')} className={styles.move}
                  onClick={() => touch(setSteps)(move(steps, i, i - 1))}>↑</button>
                <button type="button" aria-label={t('form.moveDown')} className={styles.move}
                  onClick={() => touch(setSteps)(move(steps, i, i + 1))}>↓</button>
              </div>
              <div className={styles.rowFields}>
                <input className={styles.input} placeholder={t('form.stepHead')} value={s.heading} lang="he"
                  onChange={(e) => touch(setSteps)(steps.map((x) => x.key === s.key ? { ...x, heading: e.target.value } : x))} />
                <textarea className={styles.area} rows={3} placeholder="what to do" value={s.body} lang="he"
                  onChange={(e) => touch(setSteps)(steps.map((x) => x.key === s.key ? { ...x, body: e.target.value } : x))} />
              </div>
              <button type="button" aria-label={t('form.removeStep')} className={styles.del}
                onClick={() => touch(setSteps)(steps.filter((x) => x.key !== s.key))}>✕</button>
            </li>
          ))}
        </ol>
        <button type="button" className={styles.add}
          onClick={() => touch(setSteps)([...steps, { key: uid(), heading: '', body: '' }])}>
          {t('form.addStep')}
        </button>
      </section>

      {/* ── the menu-card description, per language ─────────────────────── */}
      <section>
        <h2 className={styles.h2}>{t('form.cardDescription')}</h2>
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
        <span className={styles.label}>{t('form.toServe')}</span>
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
