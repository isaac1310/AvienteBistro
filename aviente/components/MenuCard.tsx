import { COURSES, courseLabel } from '@/lib/constants';
import { cardDate } from '@/lib/occasion';
import Motif from './Motif';
import type { MotifName } from '@/lib/motifs.generated';
import styles from './MenuCard.module.css';

/* The printed artifact, redrawn to `menu sample .jpg`. Fixed width, never reflowed —
 * it is a card, not a page. On desktop it sits centred; in print it is the whole page.
 *
 * Course names stay French whatever the language toggle says; only the dish
 * descriptions change (§5).
 *
 * What the sample changed, and why each is deliberate:
 *  - **Corner brackets** instead of ❧ fleurons at the corners. The sample's frame is
 *    notched — two rules meeting short of the corner — which reads as a printed card
 *    rather than as a box.
 *  - **The date moves to the top corner**, small, where the sample puts it. It was
 *    centred above the title, which made the date compete with the name of the meal.
 *  - **A motif before each course heading.** The sample uses emoji; ours are drawn,
 *    and five of them borrow the plate of the same food so a course on the card and
 *    its shelf in the book are the same object.
 *  - **Burgundy headings, dark dish names, italic descriptions** — the sample's
 *    hierarchy, which is stronger than what we had.
 *
 * The card stays UNTHEMED. It is a printed object with its own palette, and it looks
 * identical whichever colour the reader has chosen for the app — a card sent to
 * someone else should not depend on a setting they cannot see.
 */

/** One drawing per course, plus the chef's hat closing the card. */
const COURSE_MOTIF: Record<string, MotifName> = {
  aperitif: 'course_aperitif',
  entree: 'course_entree',
  main: 'course_main',
  sides: 'course_sides',
  dessert: 'course_dessert',
  pain: 'course_pain',
};

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
      {/* Two continuous rules, the inner one with its corners clipped — the sample's
          frame is a rectangle whose corners are notched, not four separate brackets
          floating near the corners, which is what the first attempt drew and why it
          looked unaligned. clip-path cuts the border with the box, so the corner
          openings are the notch. */}
      <div className={styles.frameOuter} aria-hidden="true" />
      <div className={styles.frameInner} aria-hidden="true" />

      <div className={styles.inner}>
        {/* Top corner, small — the sample's placement. dir="ltr" because the date is
            a Latin run and bidi reorders it inside a Hebrew card. */}
        <p className={styles.date} dir="ltr">{when}</p>

        <div className={styles.titleRow}>
          {/* Two CSS-drawn candles flank the title on Shabbat and festivals. */}
          {ornament === 'candles' && <Candle />}
          <h1 className={styles.title}>{title ?? 'Menu'}</h1>
          {ornament === 'candles' && <Candle />}
        </div>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        {courses.map((course) => (
          <section key={course.key} className={styles.course}>
            {/* The motif sits on the heading's line, as in the sample — not on a
                line of its own, which would space the courses too far apart to read
                as one menu. The ❦ divider between courses is gone: the motifs do
                that work now, and both together was one ornament too many. */}
            <h2 className={styles.courseName}>
              {COURSE_MOTIF[course.key] && (
                <Motif name={COURSE_MOTIF[course.key]} size={24} strokeWidth={1.9}
                  className={styles.courseMotif} />
              )}
              {courseLabel(course.key)}
            </h2>

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
            <h2 className={styles.courseName}>
              <Motif name="chef_hat" size={24} strokeWidth={1.9}
                className={styles.courseMotif} />
              Notes du Chef
            </h2>
            <p className={styles.notes} lang="he">{chefNotes}</p>
          </section>
        )}
      </div>
    </article>
  );
}

/**
 * The Shabbat candle, from the blueprint set.
 *
 * It was three solid-filled CSS boxes — a cream stem, a gold base and a gradient
 * flame. Solid fills are the one thing the drawing language does not do: every plate,
 * icon and motif in this app is stroke-only at one weight, so the candles read as
 * borrowed from somewhere else. Same drawing as the menus list uses for an occasion.
 */
function Candle() {
  /* 46px, not 30. At 30 the drawing was smaller than the title's cap height and read
     as punctuation rather than as an ornament flanking it — the motif has a lot of air
     inside its own 110x90 frame, so it always looks a size smaller than its box. */
  return <Motif name="candle" size={52} strokeWidth={1.5} className={styles.candle} />;
}
