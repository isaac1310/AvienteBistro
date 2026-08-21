import { BLUEPRINTS } from '@/lib/blueprints.generated';
import type { CategoryKey } from '@/lib/constants';
import styles from './CategoryPlate.module.css';

/**
 * The stand-in for a recipe with no photograph: a plate from the blueprint set.
 *
 * Most of this book has no photograph, so this is the app's ordinary look rather
 * than an edge case — which is why it is a designed plate and not a grey box with an
 * emoji in it (the first version was exactly that).
 *
 * The drawings live in design/blueprints/*.svg and are inlined by
 * tools/build-blueprints.mjs. Inline is not a preference: they are stroked with
 * `currentColor`, and an SVG loaded as an <img> or a background-image renders in
 * isolation, where currentColor resolves to black instead of the theme's ink.
 *
 * `inner` is generated from files in this repo, never from user input, so it is not
 * a dangerouslySetInnerHTML risk — nothing that reaches it comes from the database
 * or a request.
 */

/* The plate numbers from the blueprint README — the printed-book conceit that makes
   the set read as one series. breads was absent from the delivered set, so it takes
   the next number rather than renumbering the eight that were specified. */
const PLATES: Record<CategoryKey, string> = {
  entrees:  "PL. I — HORS-D'ŒUVRE",
  soups:    'PL. II — POTAGES',
  salads:   'PL. III — SALADES',
  mains:    'PL. IV — PLATS',
  sides:    'PL. V — ACCOMPAGNEMENTS',
  desserts: 'PL. VI — DESSERTS',
  kids:     'PL. VII — LES PETITS',
  other:    'PL. VIII — DIVERS',
  breads:   'PL. IX — PAINS',
  /* Next number again, for the same reason breads took IX: the delivered set had
     eight, and renumbering a printed series to insert one in the middle would change
     the caption on plates people have already seen. */
  sauces:   'PL. X — SAUCES',
};

export default function CategoryPlate({
  category, size = 'thumb', caption, plateNumber = false,
}: {
  category: CategoryKey;
  size?: 'thumb' | 'row' | 'hero';
  /** The category name under the drawing. Hero only — a 92px column has no room. */
  caption?: string;
  /** The "PL. IV — PLATS" line. For the /brand series sheet only. */
  plateNumber?: boolean;
}) {
  const plate = BLUEPRINTS[category] ?? BLUEPRINTS.other;
  const kid = category === 'kids';

  /* The drawings sit inside a 110×90 frame with generous air around them, which is
     right at 130px and wrong at 92px: the air ate most of the box and the drawing
     came out a third of the size it should be. Cropping to where the ink actually is
     gives the thumbnail its size back without touching the files. */
  const viewBox = size === 'hero' ? plate.viewBox : '18 20 78 62';

  return (
    <span
      className={`${styles.plate} ${styles[size]} ${kid ? styles.kid : ''}`}
      /* The drawing is decoration; the recipe's name is right beside it. A caption,
         when there is one, is real text and stays readable. */
      aria-hidden={caption ? undefined : true}
    >
      <svg
        viewBox={viewBox}
        className={styles.art}
        fill="none"
        stroke="currentColor"
        /* Heavier at thumbnail size, as the blueprint README asks: 1.4 disappears
           when the drawing is 44px wide. */
        /* Heavier only where the drawing is small enough to lose its lines: the 92px
           thumb needs 2.4, the hero and the 56px row do not. */
        strokeWidth={size === 'thumb' ? 2.4 : 1.6}
        strokeLinecap="round"
        role="presentation"
        dangerouslySetInnerHTML={{ __html: plate.inner }}
      />
      {size === 'hero' && caption && (
        <span className={styles.caption}>
          <span className={styles.captionName}>{caption}</span>
          {/* The plate NUMBER is for the /brand sheet, where the ten drawings are
              looked at as a printed series and "PL. IV — PLATS" is the conceit. On a
              recipe it is noise: a reader who opened a recipe does not need the
              catalogue number of its illustration, and "NO PHOTO YET" states the
              obvious under a drawing that is visibly not a photograph. Kept for the
              sheet, dropped everywhere else. */}
          {plateNumber && (
            <span className={styles.captionPlate}>{PLATES[category]}</span>
          )}
        </span>
      )}
    </span>
  );
}
