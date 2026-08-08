'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ANIMALS, MEALS, addWeeks, weekLabel, type KidsMeal, type MealKey } from '@/lib/constants';
import { clearMeal, clearWeek, fillWeek, setChef, setMeal } from '@/lib/kidsMutations';
import KidsArt from './KidsArt';
import styles from './KidsPlanner.module.css';

/* §3.8 — pick a week, pick dishes into a tray, then place them either day by day
 * or across the whole week. No auto-suggest: everything here was chosen. */

type Recipe = { id: string; title: string; title_en: string | null; meal_type: MealKey | null };

export default function KidsPlanner({
  weekStart, meals, recipes, members,
}: {
  weekStart: string;
  meals: KidsMeal[];
  recipes: Recipe[];
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [tray, setTray] = useState<Recipe[]>([]);
  /* Sunday to Thursday on by default — the days there is school tomorrow. Friday and
     Saturday are off until someone turns them on, rather than presenting seven empty
     columns most of which will never be filled. */
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [picking, setPicking] = useState<{ weekday: number; meal: MealKey } | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); router.refresh(); } finally { setBusy(false); }
  };

  /**
   * Turn a day on or off.
   *
   * Turning one OFF used to hide the column and leave its meals in the database. They
   * came back the moment the day was turned on again, and in the meantime the printed
   * sheet still carried them — the screen and the fridge disagreed. So an occupied day
   * asks first, then actually clears.
   */
  function toggleDay(weekday: number, planned: number) {
    const on = days.includes(weekday);
    if (!on) { setDays([...days, weekday]); return; }
    const animal = ANIMALS.find((a) => a.weekday === weekday);
    if (planned > 0
      && !confirm(`Take ${animal?.day} out of the week? Its ${planned} `
        + `${planned === 1 ? 'meal' : 'meals'} will be cleared.`)) return;
    setDays(days.filter((d) => d !== weekday));
    if (planned > 0) {
      run(() => Promise.all(MEALS.map((m) => clearMeal(weekStart, weekday, m.key)))
        .then(() => undefined));
    }
  }

  const mealAt = (weekday: number, meal: MealKey) =>
    meals.find((m) => m.weekday === weekday && m.meal === meal);

  return (
    <div className={styles.garden}>
      {/* Drawn, not 🦋. The emoji did not render at all on a Samsung Ultra, and
          chasing which platform ships which codepoint is not a fix — owning the
          drawing is. */}
      <KidsArt name="butterfly" size={26} className={`${styles.butterfly} ${styles.b1}`} />
      <KidsArt name="butterfly" size={22} className={`${styles.butterfly} ${styles.b2}`} />

      <header className={styles.banner}>
        <h1 className={styles.title}>The Kids&rsquo; Table</h1>
      </header>

      <div className={styles.weekRow}>
        <button className={styles.arrow} aria-label="Previous week"
          onClick={() => router.push(`/kids?week=${addWeeks(weekStart, -1)}`)}>◀</button>
        <span className={styles.week}>{weekLabel(weekStart)}</span>
        <button className={styles.arrow} aria-label="Next week"
          onClick={() => router.push(`/kids?week=${addWeeks(weekStart, 1)}`)}>▶</button>
      </div>

      {/* One bubble per day, Sunday to Saturday.
          The day's NAME is printed under the animal. It used to be the animal alone,
          which meant the only way to know the elephant was Wednesday was to turn it on
          and read the heading that appeared — the mapping was a secret the interface
          kept. */}
      <div className={styles.bubbles}>
        {ANIMALS.map((a) => {
          const on = days.includes(a.weekday);
          const planned = meals.filter((m) => m.weekday === a.weekday).length;
          return (
            <button
              key={a.weekday}
              type="button"
              className={`${styles.bubble} ${on ? '' : styles.bubbleOff}`}
              style={on ? { background: a.colour, boxShadow: `0 3px 0 ${a.shadow}` } : undefined}
              aria-pressed={on}
              aria-label={`${a.day} — ${a.host}${planned ? `, ${planned} planned` : ''}`}
              onClick={() => toggleDay(a.weekday, planned)}
            >
              <KidsArt name={a.art} size={30} className={styles.bubbleArt} />
              <span className={styles.bubbleDay}>{a.day.slice(0, 3)}</span>
              {planned > 0 && <span className={styles.bubbleDot} aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className={styles.trayRow}>
        <button className={styles.pill} onClick={() => setTrayOpen(true)}>
          ＋ Pick dishes{tray.length > 0 && ` (${tray.length})`}
        </button>
        <button className={styles.pill} disabled={busy || tray.length === 0}
          onClick={() => run(async () => {
            await fillWeek(weekStart, tray.map((t) => t.id), [...days].sort(),
              MEALS.map((m) => m.key));
            setTray([]);
          })}>
          ✨ Fill the week
        </button>
      </div>

      {tray.length > 0 && (
        <ul className={styles.tray}>
          {tray.map((r) => (
            <li key={r.id} className={styles.trayItem}>
              <span lang="he">{r.title}</span>
              <button aria-label="Remove from tray"
                onClick={() => setTray(tray.filter((t) => t.id !== r.id))}>✕</button>
            </li>
          ))}
        </ul>
      )}

      {ANIMALS.filter((a) => days.includes(a.weekday)).map((a) => (
        <section key={a.weekday} className={styles.day}>
          <h2 className={styles.dayName}>
            {/* Day first, host second. The heading indexed an array by weekday - 1,
                which was a Monday-based assumption sitting in the view; on a Sunday
                week that reads [-1] and prints "undefined". The name is on the record
                now. */}
            <KidsArt name={a.art} size={26} className={styles.dayArt} />
            {a.day} &middot; <span className={styles.dayHost}>{a.host}</span>
          </h2>

          {MEALS.map((meal) => {
            const placed = mealAt(a.weekday, meal.key);
            return (
              <div key={meal.key} className={styles.meal} style={{ borderColor: meal.colour }}>
                <span className={styles.mealLabel}>{meal.label}</span>

                {placed ? (
                  <>
                    <Link href={`/recipes/kids/${placed.recipe_id}`} className={styles.dish} lang="he">
                      {placed.recipe?.title ?? '—'}
                    </Link>
                    <div className={styles.mealFoot}>
                      <select
                        className={styles.chef}
                        value={placed.chef_member_id ?? ''}
                        aria-label="Who is cooking"
                        onChange={(e) => run(() => setChef(placed.id, e.target.value || null))}
                      >
                        <option value="">👩‍🍳 who?</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>Chef {m.name}</option>
                        ))}
                      </select>
                      <button className={styles.swap} aria-label="Swap this meal"
                        onClick={() => setPicking({ weekday: a.weekday, meal: meal.key })}>↻</button>
                      <button className={styles.remove} aria-label="Clear this meal"
                        onClick={() => run(() => clearMeal(weekStart, a.weekday, meal.key))}>✕</button>
                    </div>
                  </>
                ) : (
                  <button className={styles.empty}
                    onClick={() => setPicking({ weekday: a.weekday, meal: meal.key })}>
                    ＋ add something
                  </button>
                )}
              </div>
            );
          })}
        </section>
      ))}

      <div className={styles.footer}>
        <a className={styles.fridge} href={`/print/kids/${weekStart}`}>🧲 Fridge PDF!</a>
        <button className={styles.clear} disabled={busy}
          onClick={() => { if (confirm('Clear every meal this week?')) run(() => clearWeek(weekStart)); }}>
          Clear week
        </button>
      </div>

      {/* Slot picker — used both for an empty slot and for ↻ swap. */}
      {picking && (
        <div className={styles.sheet} role="dialog" aria-label="Choose a dish">
          <div className={styles.sheetHead}>
            <strong>Pick something for {MEALS.find((m) => m.key === picking.meal)?.label}</strong>
            <button onClick={() => setPicking(null)}>Close</button>
          </div>
          <ul className={styles.picks}>
            {/* A dish tagged for another meal still shows, but the matching ones
                come first — the tag is a hint, not a rule. */}
            {[...recipes]
              .sort((x, y) => Number(y.meal_type === picking.meal) - Number(x.meal_type === picking.meal))
              .map((r) => (
                <li key={r.id}>
                  <button className={styles.pick} onClick={() => run(async () => {
                    await setMeal(weekStart, picking.weekday, picking.meal, r.id);
                    setPicking(null);
                  })}>
                    <span lang="he">{r.title}</span>
                    {r.meal_type && <span className={styles.pickTag}>{r.meal_type}</span>}
                  </button>
                </li>
              ))}
            {recipes.length === 0 && (
              <li className={styles.noKids}>
                No kids&rsquo; recipes yet. Add one and set its category to Kids&rsquo; Table.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Tray picker — multi-select for FILL THE WEEK. */}
      {trayOpen && (
        <div className={styles.sheet} role="dialog" aria-label="Pick dishes">
          <div className={styles.sheetHead}>
            <strong>Pick dishes for the week</strong>
            <button onClick={() => setTrayOpen(false)}>Done</button>
          </div>
          <ul className={styles.picks}>
            {recipes.map((r) => {
              const chosen = tray.some((t) => t.id === r.id);
              return (
                <li key={r.id}>
                  <button className={`${styles.pick} ${chosen ? styles.pickOn : ''}`}
                    onClick={() => setTray(chosen ? tray.filter((t) => t.id !== r.id) : [...tray, r])}>
                    <span lang="he">{r.title}</span>
                    <span className={styles.pickTag}>{chosen ? '✓' : r.meal_type ?? ''}</span>
                  </button>
                </li>
              );
            })}
            {recipes.length === 0 && (
              <li className={styles.noKids}>
                No kids&rsquo; recipes yet. Add one and set its category to Kids&rsquo; Table.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
