'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MovePhoto from './MovePhoto';
import PhotoField from './PhotoField';
import BusyButton from './BusyButton';
import { useT } from './LangProvider';
import { saveRecipe, softDeleteRecipe, type RecipeInput } from '@/lib/mutations';
import { CATEGORIES, type Recipe, type Unit } from '@/lib/constants';
import styles from './RecipeForm.module.css';

/* §3.4 — everything inline, EXPLICIT SAVE. No autosave: on a kitchen connection
 * it races with itself, produces a "saved ✓" that can lie, and has no defined
 * offline behaviour. A Save button with a dirty guard removes all three at once.
 */

const UNITS: (Unit | '')[] = ['', 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'pcs', 'pinch', 'to taste'];

/**
 * Contiguous runs of ingredients that share a part name.
 *
 * The database stores group_label per ingredient, and the recipe page already
 * renders a heading whenever the label CHANGES — so a part is, in both places, a
 * consecutive run. This turns that flat list into the runs the editor shows, and is
 * the reason the change needed no migration.
 *
 * `null` means the unnamed run: the ingredients that belong to no part.
 */
function groupRuns(rows: Row[]): { group: string | null; rows: Row[] }[] {
  const runs: { group: string | null; rows: Row[] }[] = [];
  for (const r of rows) {
    const g = r.group.trim() === '' ? null : r.group;
    const last = runs[runs.length - 1];
    if (last && last.group === g) last.rows.push(r);
    else runs.push({ group: g, rows: [r] });
  }
  /* An empty recipe still needs one run to render into, or the form shows no
     ingredient fields at all. */
  return runs.length ? runs : [{ group: null, rows: [] }];
}

/** Rename every row in a run. Blank clears the heading. */
function renameRun(rows: Row[], run: { rows: Row[] }, name: string): Row[] {
  const keys = new Set(run.rows.map((r) => r.key));
  return rows.map((r) => (keys.has(r.key) ? { ...r, group: name } : r));
}

/** Append a blank ingredient to the END of a run, inheriting its part name. */
function addToRun(rows: Row[], run: { group: string | null; rows: Row[] }): Row[] {
  const blank: Row = {
    key: uid(), name: '', amount: '', amountMax: '', unit: '', note: '',
    group: run.group ?? '',
  };
  const lastKey = run.rows[run.rows.length - 1]?.key;
  if (!lastKey) return [...rows, blank];
  const at = rows.findIndex((r) => r.key === lastKey);
  /* Inserted after the run's last row rather than at the end of the list, so parts
     stay contiguous — which is the only thing that makes them parts. */
  return [...rows.slice(0, at + 1), blank, ...rows.slice(at + 1)];
}

type Row = { key: string; name: string; amount: string; amountMax: string; unit: string; note: string; group: string };
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

  const [rows, setRows] = useState<Row[]>(
    recipe?.ingredients.map((i) => ({
      key: i.id, name: i.name,
      amount: i.amount == null ? '' : String(i.amount),
      amountMax: i.amount_max == null ? '' : String(i.amount_max),
      unit: i.unit ?? '', note: i.note ?? '', group: i.group_label ?? '',
    })) ?? [{ key: uid(), name: '', amount: '', amountMax: '', unit: '', note: '', group: '' }],
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

  /* Reordering with buttons, not just drag: §3.4 requires a keyboard path, and
     drag-only reordering is unusable for anyone not using a mouse. */
  function move<T>(list: T[], from: number, to: number): T[] {
    if (to < 0 || to >= list.length) return list;
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  }

  /**
   * Move an ingredient, and let it JOIN the part it lands in.
   *
   * Plain `move` splices positions and never touches `group`, and sections are
   * DERIVED from contiguous equal labels — so a row crossing a boundary kept its old
   * label, which did two wrong things at once: it did not join the destination, and
   * it split the destination's heading in two with a foreign row wedged between.
   *
   * The rule: a moved row adopts the label of whichever row it now sits beside.
   * Preferring the row it displaced (`to`) makes dragging INTO a section mean what it
   * looks like. Both the ↑↓ buttons and the drag handle come through here, so the two
   * mechanisms cannot drift apart — one invariant, two ways to reach it.
   */
  function moveIngredient(list: Row[], from: number, to: number): Row[] {
    if (to < 0 || to >= list.length || from === to) return list;
    const reordered = move(list, from, to);
    /* The neighbour that decides the part. Moving DOWN, the row now sits after the
       one it passed, so that one's label is the section it entered; moving UP, the
       row below it. Falling back to the other side covers the ends of the list. */
    const behind = reordered[to - 1]?.group;
    const ahead = reordered[to + 1]?.group;
    const adopt = (to > from ? behind : ahead) ?? behind ?? ahead;
    if (adopt === undefined) return reordered;
    return reordered.map((r, i) => (i === to ? { ...r, group: adopt } : r));
  }

  /** Send a row to the END of a named run — what dropping onto a heading means. */
  function moveIngredientToRun(list: Row[], key: string, group: string | null): Row[] {
    const from = list.findIndex((r) => r.key === key);
    if (from < 0) return list;
    const target = list.map((r, i) => ({ r, i }))
      .filter(({ r }) => (r.group.trim() === '' ? null : r.group) === group && r.key !== key);
    if (!target.length) return list;
    const lastOfRun = target[target.length - 1].i;
    const to = from < lastOfRun ? lastOfRun : lastOfRun + 1;
    const reordered = move(list, from, to);
    const landed = reordered.findIndex((r) => r.key === key);
    return reordered.map((r, i) => (i === landed ? { ...r, group: group ?? '' } : r));
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
      router.push(`/recipes/${category}/${id}`);
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
            key={run.rows[0].key}
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
            {run.group === null && !drafting.has(run.rows[0].key) ? (
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
                onClick={() => setDrafting(new Set(drafting).add(run.rows[0].key))}>
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
                    /* Focused on arrival, so naming a part is one action. The
                       callback ref runs on mount, which is exactly when a freshly
                       drafted heading appears. */
                    ref={(el) => {
                      if (el && drafting.has(run.rows[0].key) && document.activeElement !== el) {
                        el.focus();
                      }
                    }}
                    /* Renames every row in the run at once — the point of the
                       change. */
                    onChange={(e) => touch(setRows)(renameRun(rows, run, e.target.value))}
                    /* Left empty, it was never a part. Drop back to the offer rather
                       than leaving a nameless heading on screen. */
                    onBlur={(e) => {
                      if (e.target.value.trim() === '') {
                        const next = new Set(drafting);
                        next.delete(run.rows[0].key);
                        setDrafting(next);
                      }
                    }}
                  />
                </label>
                <button type="button" className={styles.unname}
                  aria-label={t('form.removeHeadingLabel')}
                  onClick={() => {
                    const next = new Set(drafting);
                    next.delete(run.rows[0].key);
                    setDrafting(next);
                    touch(setRows)(renameRun(rows, run, ''));
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
              onClick={() => touch(setRows)(addToRun(rows, run))}>
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
            }]);
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
