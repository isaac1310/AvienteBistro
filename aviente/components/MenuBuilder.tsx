'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveMenu } from '@/lib/menuMutations';
import { COURSES, categoryLabel, type CourseKey, type RecipeSummary } from '@/lib/constants';
import styles from './MenuBuilder.module.css';

/* §3.5 — the menu builder. */

type Row = { key: string; recipe: RecipeSummary; course: CourseKey };

export default function MenuBuilder({
  recipes, initial, occasionTitle,
}: {
  recipes: RecipeSummary[];
  initial: {
    id?: string; date: string; title: string | null;
    language: 'en' | 'he'; chef_notes: string | null;
    items: { recipe_id: string; course: CourseKey }[];
  };
  occasionTitle: string | null;
}) {
  const router = useRouter();
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const [date, setDate] = useState(initial.date);
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

  /* The occasion badge follows the date, so changing it to a Friday shows the
     Shabbat title immediately rather than only after saving. */
  const suggested = occasionTitle;

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
      if (!rows.length) throw new Error('A menu needs at least one dish.');
      const id = await saveMenu({
        id: initial.id,
        date,
        title: title.trim() || suggested,
        language,
        chef_notes: notes,
        items: rows.map((r) => ({ recipe_id: r.recipe.id, course: r.course })),
      });
      router.push(`/menus/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.bar}>
        <span className={styles.editing}>Build a menu</span>
        <button className="btn" onClick={onSave} disabled={busy}>
          {busy ? 'Saving…' : 'Save menu'}
        </button>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>Date</span>
          <input type="date" className={styles.input} value={date}
            onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Title</span>
          <input className={styles.input} value={title} placeholder={suggested ?? 'Menu'}
            onChange={(e) => setTitle(e.target.value)} />
        </label>
      </div>

      {suggested && !title.trim() && (
        <p className={styles.badge}>🕯 {suggested} — from the date</p>
      )}

      {/* Language affects the card's DESCRIPTIONS only; course names stay French. */}
      <div className={styles.langRow}>
        <span className={styles.label}>Card descriptions in</span>
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
                    <button type="button" aria-label="Move up" className={styles.move}
                      onClick={() => move(row.key, -1)}>↑</button>
                    <button type="button" aria-label="Move down" className={styles.move}
                      onClick={() => move(row.key, 1)}>↓</button>
                  </div>
                  <div className={styles.rowBody}>
                    <p className={styles.dish} lang="he">{row.recipe.title}</p>
                    <p className={styles.dishMeta}>
                      {categoryLabel(row.recipe.category).en}
                      {row.recipe.source_name && ` · ${row.recipe.source_name}`}
                    </p>
                  </div>
                  <button type="button" aria-label="Change this dish" className={styles.swap}
                    onClick={() => { setSwapping(row.key); setPicking(row.course); }}>↻</button>
                  <button type="button" aria-label="Remove dish" className={styles.del}
                    onClick={() => setRows(rows.filter((r) => r.key !== row.key))}>✕</button>
                </div>
              );
            })}

            <button type="button" className={styles.add} onClick={() => setPicking(course.key)}>
              ＋ Add a dish
            </button>
          </section>
        );
      })}

      <label className={styles.field}>
        <span className={styles.label}>Chef's notes</span>
        <textarea className={styles.area} rows={3} value={notes} lang="he"
          onChange={(e) => setNotes(e.target.value)} />
      </label>

      {/* Dish picker */}
      {picking && (
        <div className={styles.sheet} role="dialog" aria-label="Choose a dish">
          <div className={styles.sheetHead}>
            <span className={styles.label}>
              {swapping ? 'Change this dish' : `Add to ${COURSES.find((c) => c.key === picking)?.en}`}
            </span>
            <button type="button" className={styles.close}
              onClick={() => { setPicking(null); setSwapping(null); }}>Close</button>
          </div>
          <input className={styles.input} placeholder="Search…" value={query} autoFocus
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
            {filtered.length === 0 && <li className={styles.pickEmpty}>Nothing matches that.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
