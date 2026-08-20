import { serverT } from '@/lib/lang';
import KidsArt from '@/components/KidsArt';
import PrintExit from '@/components/PrintExit';
import { ANIMALS, MEALS, dishLabel, getKidsWeek, weekLabel } from '@/lib/kids';
import Motif from '@/components/Motif';
import styles from './fridge.module.css';

export const metadata = { title: "Aviente — The Kids' Week", robots: { index: false } };

/* The fridge grid (§3.8). Keeps the playful style rather than becoming a sober
 * table — it lives on a fridge door, not in a binder. Landscape, because five
 * days across three meals does not fit a portrait page legibly. */
export default async function FridgePrint({
  params,
}: { params: Promise<{ week: string }> }) {
  const t = await serverT();
  const { week } = await params;
  // Unauthenticated visitors are refused by RLS, which throws; show an empty
  // grid rather than a 500, the same way the menu print route does.
  const { meals } = await getKidsWeek(week).catch(() => ({ meals: [] }));

  /* A LIST. This was `.find()`, and with several dishes in a slot it would have
     printed the first one and silently dropped the rest — on a sheet that goes on the
     fridge and is trusted as the week's plan. Ordered by the query, so the sheet and
     the planner cannot disagree about which dish comes first. */
  const at = (weekday: number, meal: string) =>
    meals.filter((m) => m.weekday === weekday && m.meal === meal);

  return (
    <main className={styles.page}>
      {/* On screen only — a print page with no way out is a dead end, and this one is
          reached from a link that replaces the app. */}
      <PrintExit href={`/kids?week=${week}`} label={t('common.backToPlanner')} />

      {/* The sheet: title, grid and decoration in one positioned box.
          The decoration layer used to be pinned to the whole page, which on a tall
          screen threw the balloons into the corners of an empty document and put one
          behind the back link. Scoped here, they sit around the table wherever the
          table happens to be. */}
      <div className={styles.sheet}>
        <div className={styles.garden} aria-hidden="true">
          {/* Drawn rather than emoji: the butterflies were 🦋 and did not render at
              all on a Samsung Ultra. Same drawings as the planner's day bubbles, so
              the sheet and the screen are recognisably one thing. */}
          <KidsArt name="balloon" size={44} className={`${styles.deco} ${styles.d1}`} />
          <KidsArt name="butterfly" size={34} className={`${styles.deco} ${styles.d2}`} />
          <KidsArt name="butterfly" size={26} className={`${styles.deco} ${styles.d4}`} />
          <KidsArt name="balloon" size={32} className={`${styles.deco} ${styles.d5}`} />
          <KidsArt name="child" size={58} className={`${styles.deco} ${styles.d3}`} />
        </div>

        <h1 className={styles.title}>The Kids&rsquo; Table · {weekLabel(week)}</h1>

        <table className={styles.grid}>
        <thead>
          <tr>
            <th className={styles.corner} />
            {ANIMALS.map((a) => (
              <th key={a.weekday} className={styles.dayHead} style={{ background: a.colour }}>
                <KidsArt name={a.art} size={30} className={styles.animal} />
                <span className={styles.day}>{a.day}</span>
                <span className={styles.host}>{a.host}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEALS.map((meal) => (
            <tr key={meal.key}>
              <th className={styles.mealHead} style={{ borderColor: meal.colour }}>
                {meal.label}
              </th>
              {ANIMALS.map((a) => {
                const placed = at(a.weekday, meal.key);
                return (
                  <td key={a.weekday} className={styles.cell} style={{ borderColor: meal.colour }}>
                    {placed.length ? (
                      /* Every dish, and the type shrinks after two — the grid is a
                         fixed landscape table, so three dishes in one cell would clip
                         rather than reflow. Shrinking is not a fix for ten, and the
                         cap is stated rather than silent: past four the cell says how
                         many are not shown, because a sheet that quietly omits a
                         dish somebody planned is worse than one that admits it. */
                      <ul className={`${styles.dishes} ${placed.length > 2 ? styles.tight : ''}`}>
                        {placed.slice(0, 4).map((dish) => (
                          <li key={dish.id}>
                            {/* Free text prints like any other dish — it is not a
                                lesser kind of dish, and dishLabel answers for both. */}
                            <span className={styles.dish} lang="he">{dishLabel(dish)}</span>
                            {dish.chef && (
                              <span className={styles.chef}>
                                <Motif name="chef_hat" size={14} strokeWidth={2.6} />{' '}
                                {/* "Chef Papa", not "Papa". The hat says cook to
                                    someone who already knows what the sheet is; the
                                    WORD says it to a child reading it on the fridge,
                                    and it matches the planner's select exactly rather
                                    than being the same person titled on one screen and
                                    bare on the other. */}
                                {t('kids.chefName', { name: dish.chef.display_name ?? dish.chef.name })}
                              </span>
                            )}
                          </li>
                        ))}
                        {placed.length > 4 && (
                          <li className={styles.more}>+{placed.length - 4}</li>
                        )}
                      </ul>
                    ) : (
                      <span className={styles.blank}>·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </main>
  );
}
