import { COURSES, courseLabel } from '@/lib/menus';
import { cardDate } from '@/lib/occasion';
import styles from './MenuCard.module.css';

/* The printed artifact (§1, design 3b/5a). Fixed width, never reflowed — it is a
 * card, not a page. On desktop it sits centred; in print it is the whole page.
 *
 * Course names stay French whatever the language toggle says; only the dish
 * descriptions change (§5). */

export type CardItem = {
  course: string;
  dish_title: string | null;
  dish_title_en: string | null;
  description_en: string | null;
  description_he: string | null;
  credit_name: string | null;
};

export default function MenuCard({
  date, title, subtitle, ornament, language, chefNotes, items,
}: {
  date: string;
  title: string | null;
  subtitle?: string | null;
  ornament?: string | null;
  language: 'en' | 'he';
  chefNotes: string | null;
  items: CardItem[];
}) {
  const when = cardDate(new Date(`${date}T12:00:00`));

  /* A course with no dishes is omitted entirely. Printing an empty heading makes
     the card look like something failed to load. */
  const courses = COURSES
    .map((c) => ({ ...c, dishes: items.filter((i) => i.course === c.key) }))
    .filter((c) => c.dishes.length > 0);

  return (
    <article className={styles.card}>
      <div className={styles.frameOuter} aria-hidden="true" />
      <div className={styles.frameInner} aria-hidden="true" />

      {/* ❧ corner fleurons */}
      <span className={`${styles.fleuron} ${styles.tl}`} aria-hidden="true">❧</span>
      <span className={`${styles.fleuron} ${styles.tr}`} aria-hidden="true">❧</span>
      <span className={`${styles.fleuron} ${styles.bl}`} aria-hidden="true">❧</span>
      <span className={`${styles.fleuron} ${styles.br}`} aria-hidden="true">❧</span>

      <div className={styles.inner}>
        <p className={styles.date}>{when}</p>

        <div className={styles.titleRow}>
          {/* Two CSS-drawn candles flank the title on Shabbat and festivals. */}
          {ornament === 'candles' && <Candle />}
          <h1 className={styles.title}>{title ?? 'Menu'}</h1>
          {ornament === 'candles' && <Candle />}
        </div>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        {courses.map((course, ci) => (
          <section key={course.key} className={styles.course}>
            {ci > 0 && <p className={styles.divider} aria-hidden="true">❦</p>}
            <h2 className={styles.courseName}>{courseLabel(course.key)}</h2>

            {course.dishes.map((dish, di) => {
              /* Fallback runs BOTH ways: the corpus is Hebrew, so an English card
                 with no English description shows the Hebrew rather than nothing.
                 A one-way fallback would have printed blank lines. */
              const preferred = language === 'he' ? dish.description_he : dish.description_en;
              const other = language === 'he' ? dish.description_en : dish.description_he;
              const description = preferred ?? other;
              const descLang = preferred ? language : (language === 'he' ? 'en' : 'he');
              const name = language === 'en'
                ? (dish.dish_title_en ?? dish.dish_title)
                : (dish.dish_title ?? dish.dish_title_en);

              return (
                <div key={di} className={styles.dish}>
                  <p className={styles.dishName} lang={language === 'he' ? 'he' : undefined}>
                    {name}
                  </p>
                  {description && (
                    <p className={styles.dishDesc} lang={descLang}>{description}</p>
                  )}
                  {dish.credit_name && (
                    <p className={styles.credit}>— de la cuisine de {dish.credit_name} —</p>
                  )}
                </div>
              );
            })}
          </section>
        ))}

        {chefNotes && (
          <section className={styles.course}>
            <p className={styles.divider} aria-hidden="true">❦</p>
            <h2 className={styles.courseName}>Notes du Chef</h2>
            <p className={styles.notes} lang="he">{chefNotes}</p>
          </section>
        )}
      </div>
    </article>
  );
}

/** A drawn candle: flame, wax, base. No image, so it prints at any resolution. */
function Candle() {
  return (
    <span className={styles.candle} aria-hidden="true">
      <span className={styles.flame} />
      <span className={styles.wax} />
      <span className={styles.base} />
    </span>
  );
}
