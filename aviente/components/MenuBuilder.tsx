'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveMenu } from '@/lib/menuMutations';
import { COURSES, categoryLabel, type CourseKey, type RecipeSummary } from '@/lib/constants';
import { cardDate } from '@/lib/occasion';
import { useT } from './LangProvider';
import styles from './MenuBuilder.module.css';

/* §3.5 — the menu builder. */

type Row = { key: string; recipe: RecipeSummary; course: CourseKey };

export default function MenuBuilder({
  recipes, initial, occasion,
}: {
  recipes: RecipeSummary[];
  initial: {
    id?: string; date: string; meal_time: 'evening' | 'day'; title: string | null;
    language: 'en' | 'he'; chef_notes: string | null;
    items: { recipe_id: string; course: CourseKey }[];
  };
  /* The occasion for this date, resolved BOTH ways on the server. A Jewish day
     begins at sundown, so the same Friday is Shabbat in the evening and an ordinary
     Friday at lunch — two different answers for one date. */
  occasion: { evening: string | null; day: string | null };
}) {
  const t = useT();
  const router = useRouter();
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const [date, setDate] = useState(initial.date);
  const [mealTime, setMealTime] = useState<'evening' | 'day'>(initial.meal_time);
  const [title, setTitle] = useState(initial.title ?? '');
  const [language, setLanguage] = useState<'en' | 'he'>(initial.language);
  const [notes, setNotes] = useState(initial.chef_notes ?? '');
  const [rows, setRows] = useState<Row[]>(
    initial.items
      .map((i) => ({ key: crypto.randomUUID(), recipe: byId.get(i.recipe_id)!, course: i.course }))
      .filter((r) => r.recipe),
  );
  const [picking, setPicking] = useState<CourseKey | null>(null);
  /* When set, the picker REPLACES this row instead of appending. Changing a dish
     is the commonest edit — 'remove, then find the add button, then search
     again' is three steps for what should be one. */
  const [swapping, setSwapping] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* The suggestion follows the lunch/dinner toggle with no round trip, because both
     answers were resolved on the server.
     It does NOT follow the date field: that would need the rules re-resolved for the
     new date, which only the server can do. Changing the date and saving picks up the
     right occasion; the preview catches up then. Worth knowing rather than pretending
     otherwise — an earlier comment here claimed it tracked the date, and it never
     did. */
  const suggested = mealTime === 'day' ? occasion.day : occasion.evening;

  /* What the printed card will actually say. Save falls back to the occasion when
     the field is blank, so the preview has to apply the SAME fallback — otherwise
     the preview and the card disagree, which is worse than having no preview. */
  const effectiveTitle = title.trim() || suggested || 'Menu';

  /* Has anything been touched? Compared against the props we were handed, so
     opening an existing menu and pressing Cancel is silent, while abandoning ten
     minutes of work asks first. */
  const dirty =
    date !== initial.date
    || title !== (initial.title ?? '')
    || language !== initial.language
    || notes !== (initial.chef_notes ?? '')
    || rows.length !== initial.items.length
    || rows.some((r, i) => r.recipe.id !== initial.items[i]?.recipe_id
      || r.course !== initial.items[i]?.course);

  function onCancel() {
    if (dirty && !confirm(t('menu.leave'))) return;
    /* Back to the menu being edited, or to the list for a new one. history.back()
       is wrong here: arriving from a recipe page's "add to a menu" link would send
       you back into that recipe. */
    router.push(initial.id ? `/menus/${initial.id}` : '/menus');
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
      setRows([...rows, { key: crypto.randomUUID(), recipe, course }]);
    }
    setPicking(null);
    setQuery('');
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
        title: title.trim() || suggested,
        language,
        chef_notes: notes,
        items: rows.map((r) => ({ recipe_id: r.recipe.id, course: r.course })),
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
          <button className="btn" onClick={onSave} disabled={busy}>
            {busy ? t('menu.saving') : t('menu.save')}
          </button>
        </div>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {/* Live preview of the card's head. The title field used to be typed blind:
          nothing on this screen showed what the card would be called, and a blank
          field quietly became the occasion name on save. */}
      <div className={styles.preview} aria-live="polite">
        <span className={styles.previewTag}>{t('menu.onTheCard')}</span>
        <p className={styles.previewDate}>{cardDate(new Date(`${date}T18:00:00`))}</p>
        <p className={styles.previewTitle}>{effectiveTitle}</p>
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

      {COURSES.map((course) => {
        const dishes = rows.filter((r) => r.course === course.key);
        return (
          <section key={course.key} className={styles.course}>
            <h2 className={styles.courseName}>{course.en}</h2>

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
                  </div>
                  <button type="button" aria-label={t('menu.changeDish')} className={styles.swap}
                    onClick={() => { setSwapping(row.key); setPicking(row.course); }}>↻</button>
                  <button type="button" aria-label={t('menu.removeDish')} className={styles.del}
                    onClick={() => setRows(rows.filter((r) => r.key !== row.key))}>✕</button>
                </div>
              );
            })}

            <button type="button" className={styles.add} onClick={() => setPicking(course.key)}>
              {t('menu.addDish')}
            </button>
          </section>
        );
      })}

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
