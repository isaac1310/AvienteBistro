import { ANIMALS, MEALS, getKidsWeek, weekLabel } from '@/lib/kids';
import styles from './fridge.module.css';

export const metadata = { title: "Aviente — The Kids' Week", robots: { index: false } };

/* The fridge grid (§3.8). Keeps the playful style rather than becoming a sober
 * table — it lives on a fridge door, not in a binder. Landscape, because five
 * days across three meals does not fit a portrait page legibly. */
export default async function FridgePrint({
  params,
}: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  // Unauthenticated visitors are refused by RLS, which throws; show an empty
  // grid rather than a 500, the same way the menu print route does.
  const { meals } = await getKidsWeek(week).catch(() => ({ meals: [] }));

  const at = (weekday: number, meal: string) =>
    meals.find((m) => m.weekday === weekday && m.meal === meal);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>The Kids&rsquo; Table · {weekLabel(week)}</h1>

      <table className={styles.grid}>
        <thead>
          <tr>
            <th className={styles.corner} />
            {ANIMALS.map((a) => (
              <th key={a.weekday} className={styles.dayHead} style={{ background: a.colour }}>
                <span className={styles.animal}>{a.animal}</span>
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
                    {placed ? (
                      <>
                        <span className={styles.dish} lang="he">{placed.recipe?.title}</span>
                        {placed.chef?.name && (
                          <span className={styles.chef}>👩‍🍳 {placed.chef.name}</span>
                        )}
                      </>
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
    </main>
  );
}
