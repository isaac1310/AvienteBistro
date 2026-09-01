'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { occasionFor, saveMenu } from '@/lib/menuMutations';
import { COURSES, DEFAULT_COURSE_ORDER, STARTING_COURSE_ORDER, categoryLabel, courseLabelIn, coursesForMenu, type CourseKey, type RecipeSummary } from '@/lib/constants';
import { cardDate } from '@/lib/occasion';
import BusyButton from './BusyButton';
import Confirm from './Confirm';
import { useLang, useT } from './LangProvider';
import styles from './MenuBuilder.module.css';

/* §3.5 — the menu builder. */

type Row = {
  key: string;
  recipe: RecipeSummary;
  course: CourseKey;
  /** The italic line under the dish on the card. Per-meal, not per-recipe. */
  note: string;
};

export default function MenuBuilder({
  recipes, initial, occasion, cancelTo,
}: {
  recipes: RecipeSummary[];
  initial: {
    id?: string; date: string; meal_time: 'evening' | 'day'; title: string | null;
    language: 'en' | 'he'; chef_notes: string | null;
    course_order: CourseKey[] | null;
    items: { recipe_id: string; course: CourseKey; note?: string | null }[];
  };
  /* The occasion for this date, resolved BOTH ways on the server. A Jewish day
     begins at sundown, so the same Friday is Shabbat in the evening and an ordinary
     Friday at lunch — two different answers for one date. */
  occasion: { evening: string | null; day: string | null };
  /* Where Cancel lands when the builder was entered from a recipe page or a
     category selection. Already validated by the server page (safeNext). */
  cancelTo?: string | null;
}) {
  const t = useT();
  /* The INTERFACE language. `language` below is the CARD's, which stays French for
     course titles by decision — these labels are the builder's own. */
  const uiLang = useLang();
  const router = useRouter();
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const [date, setDate] = useState(initial.date);
  const [mealTime, setMealTime] = useState<'evening' | 'day'>(initial.meal_time);
  const [title, setTitle] = useState(initial.title ?? '');
  const [language, setLanguage] = useState<'en' | 'he'>(initial.language);
  const [notes, setNotes] = useState(initial.chef_notes ?? '');
  const [rows, setRows] = useState<Row[]>(
    initial.items
      .map((i) => ({
        key: crypto.randomUUID(), recipe: byId.get(i.recipe_id)!, course: i.course,
        note: i.note ?? '',
      }))
      .filter((r) => r.recipe),
  );
  /* Which courses this menu runs, in order. A Friday dinner opens with challah and
     runs six; a Tuesday lunch is a main and a salad. The app already knows which is
     being planned, so it stopped being a global decision. */
  const [order, setOrder] = useState<CourseKey[]>(
    /* An EXISTING menu keeps its own order. A NEW one starts with three courses
       rather than six empty ones — see STARTING_COURSE_ORDER. `initial.id` is what
       distinguishes them: a new menu has no id yet.
       Any course that already holds a dish still renders (coursesForMenu appends it),
       so arriving from "add to a menu" with a dessert cannot hide it. */
    initial.course_order?.length
      ? initial.course_order
      : initial.id ? DEFAULT_COURSE_ORDER : STARTING_COURSE_ORDER,
  );
  const [picking, setPicking] = useState<CourseKey | null>(null);
  /* When set, the picker REPLACES this row instead of appending. Changing a dish
     is the commonest edit — 'remove, then find the add button, then search
     again' is three steps for what should be one. */
  const [swapping, setSwapping] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* The question currently on screen, or null. Both of these were window.confirm,
     which embedded browsers suppress — it answers "no" without asking — and which
     the regression agent cannot drive. `hideCourse` carries its course and count
     because the panel names both. */
  const [asking, setAsking] = useState<
    { kind: 'leave' }
    | { kind: 'hideCourse'; course: CourseKey; held: number }
    | { kind: 'removeDish'; key: string; title: string }
    | null
  >(null);

  /* The suggestion follows the lunch/dinner toggle with no round trip, because both
     answers were resolved on the server. Changing the DATE needs the rules
     re-resolved, which only the server can do — so the effect below fetches the pair
     for the new date, and until it lands the preview keeps the previous answer
     rather than flashing blank. A stale response for a date no longer in the field
     is discarded. */
  const [fetched, setFetched] =
    useState<{ forDate: string; value: { evening: string | null; day: string | null } } | null>(null);
  useEffect(() => {
    if (date === initial.date) return;   // the server-resolved prop already answers
    let current = true;
    occasionFor(date)
      .then((got) => { if (current) setFetched({ forDate: date, value: got }); })
      .catch(() => { /* preview only — save resolves the occasion itself */ });
    return () => { current = false; };
  }, [date, initial.date]);
  /* Derived, not synced: the answer is keyed by the date it was fetched FOR, so a
     late response for a date no longer in the field is simply not selected. */
  const liveOccasion = date === initial.date
    ? occasion
    : (fetched?.forDate === date ? fetched.value : occasion);
  const suggested = mealTime === 'day' ? liveOccasion.day : liveOccasion.evening;

  /* What the printed card will actually say. Save falls back to the occasion when
     the field is blank, so the preview has to apply the SAME fallback — otherwise
     the preview and the card disagree, which is worse than having no preview. */
  /* No 'Menu' tail. A blank field with no occasion means the card HAS no title, and
     the preview has to show that rather than inventing a word the card will not
     print. The occasion fallback stays, because save applies it too. */
  const effectiveTitle = title.trim() || suggested || null;

  /* Has anything been touched? Compared against the props we were handed, so
     opening an existing menu and pressing Cancel is silent, while abandoning ten
     minutes of work asks first. */
  const dirty =
    date !== initial.date
    || title !== (initial.title ?? '')
    || language !== initial.language
    || notes !== (initial.chef_notes ?? '')
    || order.join() !== (initial.course_order?.length
      ? initial.course_order
      : initial.id ? DEFAULT_COURSE_ORDER : STARTING_COURSE_ORDER).join()
    || rows.length !== initial.items.length
    || rows.some((r, i) => r.recipe.id !== initial.items[i]?.recipe_id
      || r.course !== initial.items[i]?.course
      || r.note !== (initial.items[i]?.note ?? ''));

  /* Back to the menu being edited; for a new menu, back to wherever the builder was
     entered from (a recipe page, a category selection) when the entry point said so,
     and the list otherwise. history.back() is still wrong here: it can leave the
     app entirely when the builder was the first page opened. */
  function leave() {
    router.push(initial.id ? `/menus/${initial.id}` : (cancelTo ?? '/menus'));
  }

  function onCancel() {
    if (dirty) { setAsking({ kind: 'leave' }); return; }
    leave();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) =>
      r.title.toLowerCase().includes(q) || (r.title_en ?? '').toLowerCase().includes(q));
  }, [recipes, query]);

  function add(recipe: RecipeSummary, course: CourseKey) {
    if (swapping) {
      setRows(rows.map((r) => (r.key === swapping ? { ...r, recipe } : r)));
      setSwapping(null);
    } else {
      setRows([...rows, { key: crypto.randomUUID(), recipe, course, note: '' }]);
    }
    setPicking(null);
    setQuery('');
  }

  /* Which sections the builder shows: the chosen order, plus any course that holds
     dishes without being in it. Exactly what the card will print — the same helper,
     so the builder cannot promise an arrangement the card does not honour. */
  const shownCourses = coursesForMenu(order, rows.map((r) => r.course));
  const hidden = COURSES.map((c) => c.key).filter((k) => !shownCourses.includes(k));

  function moveCourse(key: CourseKey, delta: number) {
    /* Reordering acts on the CHOSEN order, not on what is displayed. A course only
       shown because it holds dishes has no place in the list to swap with, so moving
       it adds it first — which is also the honest reading of the gesture: arranging a
       section is choosing to have it. */
    const base = order.includes(key) ? order : [...order, key];
    const i = base.indexOf(key);
    const j = i + delta;
    if (j < 0 || j >= base.length) return;
    const copy = [...base];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setOrder(copy);
  }

  function hideCourse(key: CourseKey) {
    /* Turning off a section that holds dishes asks first, the way turning off a
       populated kids day does. And it does NOT remove the dishes: they keep printing,
       appended at the end, because hiding is not deleting. Saying so is the point —
       silently dropping somebody's dish off a printed card is the worst thing this
       app could do. */
    const held = rows.filter((r) => r.course === key).length;
    if (held) { setAsking({ kind: 'hideCourse', course: key, held }); return; }
    setOrder(order.filter((k) => k !== key));
  }

  function move(key: string, delta: number) {
    const i = rows.findIndex((r) => r.key === key);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= rows.length) return;
    const copy = [...rows];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setRows(copy);
  }

  async function onSave() {
    setBusy(true); setError(null);
    try {
      if (!rows.length) throw new Error(t('menu.needsDish'));
      const id = await saveMenu({
        id: initial.id,
        date,
        meal_time: mealTime,
        /* Blank means blank: saveMenu resolves the occasion for the SAVED date and
           meal time itself. Sending `suggested` from here saved whatever the preview
           happened to show, which could be the previous date's occasion when the
           round trip had not landed yet. */
        title: title.trim() || null,
        language,
        chef_notes: notes,
        /* Stored only when it differs from the default, so a menu nobody rearranged
           keeps following the app rather than freezing today's default into a row. */
        course_order: order.join() === DEFAULT_COURSE_ORDER.join() ? null : order,
        items: rows.map((r) => ({
          recipe_id: r.recipe.id, course: r.course, note: r.note.trim() || null,
        })),
      });
      router.push(`/menus/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('menu.cantSave'));
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.bar}>
        <span className={styles.editing}>{initial.id ? t('menu.edit') : t('menu.build')}</span>
        <div className={styles.barActions}>
          {/* Cancel first, Save last: the destructive one must not sit where the
              thumb lands on the Ultra. */}
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            {t('form.cancel')}
          </button>
          {/* No `done`: saving navigates to the finished menu, so a tick would be
              one beat before the page changes anyway. */}
          <BusyButton busy={busy} onClick={onSave} busyLabel={t('menu.saving')}>
            {t('menu.save')}
          </BusyButton>
        </div>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {asking?.kind === 'leave' && (
        <Confirm
          message={t('menu.leave')}
          confirmLabel={t('common.discard')}
          danger={false}
          onConfirm={leave}
          onCancel={() => setAsking(null)}
        />
      )}

      {/* Removing a dish had no confirm and no undo, while HIDING a course — which
          does not even delete anything — asked first. Same act, same question now. */}
      {asking?.kind === 'removeDish' && (
        <Confirm
          message={t('menu.removeDishConfirm', { dish: asking.title })}
          confirmLabel={t('common.confirmRemove')}
          onConfirm={() => {
            setRows(rows.filter((r) => r.key !== asking.key));
            setAsking(null);
          }}
          onCancel={() => setAsking(null)}
        />
      )}

      {/* Hiding is not deleting — the dishes keep printing, appended at the end —
          and the panel says the count out loud, because silently dropping somebody's
          dish off a printed card is the worst thing this app could do. */}
      {asking?.kind === 'hideCourse' && (
        <Confirm
          message={asking.held === 1
            ? t('menu.courseHasDishes.one')
            : t('menu.courseHasDishes', { n: asking.held })}
          confirmLabel={t('common.confirmRemove')}
          onConfirm={() => {
            setOrder(order.filter((k) => k !== asking.course));
            setAsking(null);
          }}
          onCancel={() => setAsking(null)}
        />
      )}

      {/* Live preview of the card's head. The title field used to be typed blind:
          nothing on this screen showed what the card would be called, and a blank
          field quietly became the occasion name on save. */}
      <div className={styles.preview} aria-live="polite">
        <span className={styles.previewTag}>{t('menu.onTheCard')}</span>
        <p className={styles.previewDate}>{cardDate(new Date(`${date}T18:00:00`))}</p>
        {effectiveTitle && <p className={styles.previewTitle}>{effectiveTitle}</p>}
        <p className={styles.previewNote}>
          {title.trim()
            ? (rows.length === 1 ? t('menu.dishes.one') : t('menu.dishes.many', { n: rows.length }))
            : suggested
              ? t('menu.willUse', { title: suggested })
              /* Naming the reason matters here. A Friday EVENING is Shabbat and a
                 Friday lunch is not, so "no occasion" on a Friday looks like a bug
                 unless the screen says which meal it is talking about. */
              : mealTime === 'day' && occasion.evening
                ? t('menu.noneAtLunch', { title: occasion.evening })
                : t('menu.nameIt')}
        </p>
      </div>

      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>{t('menu.date')}</span>
          <input type="date" className={styles.input} value={date}
            onChange={(e) => setDate(e.target.value)} />
        </label>
        {/* Beside the date, because it is part of WHEN the meal is — and because
            without it nobody could tell why a Friday lunch got no candles. */}
        <div className={styles.field}>
          <span className={styles.label}>{t('menu.eaten')}</span>
          <div className={styles.seg} role="group" aria-label={t('menu.timeOfDay')}>
            <button type="button" onClick={() => setMealTime('day')}
              aria-pressed={mealTime === 'day'}
              className={mealTime === 'day' ? styles.segOn : styles.segOff}>{t('menu.daytime')}</button>
            <button type="button" onClick={() => setMealTime('evening')}
              aria-pressed={mealTime === 'evening'}
              className={mealTime === 'evening' ? styles.segOn : styles.segOff}>{t('menu.evening')}</button>
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>{t('menu.title')}</span>
          {/* Left blank on purpose. The placeholder shows what the date suggests
              without putting that text in the field, so a title is only ever
              stored because someone typed it. */}
          <input className={styles.input} value={title} placeholder={suggested ?? t('menu.untitled')}
            onChange={(e) => setTitle(e.target.value)} />
        </label>
      </div>

      {/* Language affects the card's DESCRIPTIONS only; course names stay French. */}
      <div className={styles.langRow}>
        <span className={styles.label}>{t('menu.cardLang')}</span>
        <div className={styles.seg}>
          <button type="button" onClick={() => setLanguage('he')}
            className={language === 'he' ? styles.segOn : styles.segOff}>עברית</button>
          <button type="button" onClick={() => setLanguage('en')}
            className={language === 'en' ? styles.segOn : styles.segOff}>EN</button>
        </div>
      </div>

      {shownCourses.map((key, ci) => {
        const dishes = rows.filter((r) => r.course === key);
        /* A course NOT in the order but holding dishes is still shown — the same rule
           the card follows. It is marked, because otherwise a section that reappears
           after being turned off looks like the toggle failed. */
        const extra = !order.includes(key);
        return (
          <section key={key} className={styles.course}>
            <div className={styles.courseHead}>
              <h2 className={styles.courseName}>
                {courseLabelIn(key, uiLang)}
                {extra && <span className={styles.courseFlag}>{t('menu.courseKept')}</span>}
              </h2>
              <div className={styles.courseTools}>
                <button type="button" className={styles.move} aria-label={t('menu.courseUp')}
                  disabled={ci === 0} onClick={() => moveCourse(key, -1)}>↑</button>
                <button type="button" className={styles.move} aria-label={t('menu.courseDown')}
                  disabled={ci === shownCourses.length - 1}
                  onClick={() => moveCourse(key, 1)}>↓</button>
                <button type="button" className={styles.move} aria-label={t('menu.courseOff')}
                  onClick={() => hideCourse(key)}>✕</button>
              </div>
            </div>

            {dishes.map((row) => {
              return (
                <div key={row.key} className={`card ${styles.row}`}>
                  <div className={styles.handle}>
                    <button type="button" aria-label={t('form.moveUp')} className={styles.move}
                      onClick={() => move(row.key, -1)}>↑</button>
                    <button type="button" aria-label={t('form.moveDown')} className={styles.move}
                      onClick={() => move(row.key, 1)}>↓</button>
                  </div>
                  <div className={styles.rowBody}>
                    <p className={styles.dish} lang="he">{row.recipe.title}</p>
                    <p className={styles.dishMeta}>
                      {categoryLabel(row.recipe.category).en}
                      {row.recipe.source_name && ` · ${row.recipe.source_name}`}
                    </p>
                    {/* The line that appears in italic under the dish on the card.
                        It could not be written anywhere before: saveMenu copied the
                        recipe's own description, so the only way to change what the
                        card said was to edit the recipe — which rewrites it on every
                        card that dish has ever appeared on. */}
                    <input
                      className={styles.noteField}
                      value={row.note}
                      lang="he"
                      placeholder={t('menu.dishNote')}
                      aria-label={t('menu.dishNote')}
                      onChange={(e) => setRows(rows.map((x) =>
                        x.key === row.key ? { ...x, note: e.target.value } : x))}
                    />
                  </div>
                  <button type="button" aria-label={t('menu.changeDish')} className={styles.swap}
                    onClick={() => { setSwapping(row.key); setPicking(row.course); }}>↻</button>
                  <button type="button" aria-label={t('menu.removeDish')} className={styles.del}
                    onClick={() => setAsking({
                      kind: 'removeDish', key: row.key, title: row.recipe.title,
                    })}>✕</button>
                </div>
              );
            })}

            <button type="button" className={styles.add} onClick={() => setPicking(key)}>
              {t('menu.addDish')}
            </button>
          </section>
        );
      })}

      {/* Bringing a course back. Only ever lists what is not already on screen, so it
          disappears once the menu runs all six. */}
      {hidden.length > 0 && (
        <div className={styles.addCourse}>
          <span className={styles.label}>{t('menu.addCourse')}</span>
          <div className={styles.addCourseRow}>
            {hidden.map((key) => (
              <button key={key} type="button" className={styles.courseChip}
                onClick={() => setOrder([...order, key])}>
                ＋ {courseLabelIn(key, uiLang)}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className={styles.field}>
        <span className={styles.label}>{t('menu.chefNotes')}</span>
        <textarea className={styles.area} rows={3} value={notes} lang="he"
          onChange={(e) => setNotes(e.target.value)} />
      </label>

      {/* Dish picker */}
      {picking && (
        <div className={styles.sheet} role="dialog" aria-label={t('menu.chooseDish')}>
          <div className={styles.sheetHead}>
            <span className={styles.label}>
              {/* The COURSE name stays as the card spells it — the card is French by
                  decision, and a picker that renamed the course you are adding to
                  would disagree with the thing it is building. */}
              {swapping
                ? t('menu.changeDish')
                : t('menu.addTo', { course: COURSES.find((c) => c.key === picking)?.en ?? '' })}
            </span>
            <button type="button" className={styles.close}
              onClick={() => { setPicking(null); setSwapping(null); }}>{t('common.close')}</button>
          </div>
          <input className={styles.input} placeholder={t('common.search')} value={query} autoFocus
            onChange={(e) => setQuery(e.target.value)} />
          <ul className={styles.picks}>
            {filtered.map((r) => (
              <li key={r.id}>
                <button type="button" className={styles.pick} onClick={() => add(r, picking)}>
                  <span lang="he">{r.title}</span>
                  <span className={styles.pickMeta}>{categoryLabel(r.category).en}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className={styles.pickEmpty}>{t('common.noMatch')}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
